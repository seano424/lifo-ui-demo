-- Migration: Add missing public RPC functions
-- These functions were lost (created via dashboard) and are required by the frontend.
--
-- 1. get_user_store_overviews()        — store list with product/category counts + Square status
-- 2. get_deletion_status(uuid)         — check pending GDPR deletion grace period
-- 3. request_account_deletion(uuid, text) — schedule 30-day deletion grace period
-- 4. cancel_account_deletion(uuid)     — cancel a pending deletion

-- =============================================================================
-- 1. get_user_store_overviews
-- Replaces the lost function. Returns store data enriched with:
--   product_count  — distinct products with active/non-expired batches in this store
--   category_count — distinct categories of those products
--   is_square_store — whether the store has an active Square connection
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_store_overviews()
RETURNS TABLE (
  store_id             uuid,
  store_name           text,
  store_code           text,
  business_name        text,
  address              text,
  city                 text,
  postal_code          text,
  country              text,
  timezone             text,
  store_type           text,
  is_active            boolean,
  onboarding_completed boolean,
  owner_id             uuid,
  created_at           timestamptz,
  updated_at           timestamptz,
  role_in_store        text,
  permissions          jsonb,
  product_count        bigint,
  category_count       bigint,
  is_square_store      boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'business', 'inventory', 'integrations', 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.store_id,
    s.store_name,
    s.store_code,
    s.business_name,
    s.address,
    s.city,
    s.postal_code,
    s.country,
    s.timezone,
    s.store_type,
    s.is_active,
    s.onboarding_completed,
    s.owner_id,
    s.created_at,
    s.updated_at,
    su.role_in_store::text,
    su.permissions,
    COALESCE(pc.product_count, 0)  AS product_count,
    COALESCE(pc.category_count, 0) AS category_count,
    COALESCE(sq.is_square_store, false) AS is_square_store
  FROM business.store_users su
  INNER JOIN business.stores s ON su.store_id = s.store_id
  -- product & category counts via batches (batches link products to stores)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT b.product_id)    AS product_count,
      COUNT(DISTINCT p.category_id)   AS category_count
    FROM inventory.batches b
    INNER JOIN inventory.products p ON b.product_id = p.product_id
    WHERE b.store_id = s.store_id
  ) pc ON true
  -- Square connection flag
  LEFT JOIN LATERAL (
    SELECT true AS is_square_store
    FROM integrations.square_connections sc
    WHERE sc.store_id = s.store_id
      AND sc.is_active = true
    LIMIT 1
  ) sq ON true
  WHERE su.user_id = current_user_id
    AND su.is_active = true
    AND s.is_active = true
  ORDER BY pc.product_count DESC NULLS LAST, s.store_name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_user_store_overviews() IS
  'Returns all active stores for the current user with product counts, category counts, and Square connection status. Replaces lost dashboard-created function.';

GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO service_role;


-- =============================================================================
-- 2. get_deletion_status
-- Returns the current GDPR deletion grace-period status for a user.
-- Checks user_mgmt.gdpr_deletion_log for a pending (not-yet-completed) row.
-- grace period = 30 days from deletion_requested_at.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_deletion_status(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'user_mgmt', 'public'
AS $$
DECLARE
  caller_id  uuid;
  log_row    user_mgmt.gdpr_deletion_log%ROWTYPE;
  grace_days CONSTANT int := 30;
  scheduled_for timestamptz;
  days_remaining int;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Security: users can only check their own status
  IF caller_id <> target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Look for a pending deletion (requested but not yet completed)
  SELECT * INTO log_row
  FROM user_mgmt.gdpr_deletion_log
  WHERE user_id = target_user_id
    AND deletion_completed_at IS NULL
  ORDER BY deletion_requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- No pending deletion
    RETURN json_build_object(
      'success',               true,
      'deletion_requested_at', null,
      'scheduled_for',         null,
      'is_pending',            false,
      'deleted_at',            null,
      'grace_days',            grace_days,
      'days_remaining',        null
    );
  END IF;

  scheduled_for  := log_row.deletion_requested_at + (grace_days || ' days')::interval;
  days_remaining := GREATEST(0, EXTRACT(DAY FROM (scheduled_for - now()))::int);

  RETURN json_build_object(
    'success',               true,
    'deletion_requested_at', log_row.deletion_requested_at,
    'scheduled_for',         scheduled_for,
    'is_pending',            true,
    'deleted_at',            null,
    'grace_days',            grace_days,
    'days_remaining',        days_remaining
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.get_deletion_status(uuid) IS
  'Returns the GDPR deletion grace-period status for the calling user. Target user must match auth.uid().';

GRANT EXECUTE ON FUNCTION public.get_deletion_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deletion_status(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_deletion_status(uuid) TO service_role;


-- =============================================================================
-- 3. request_account_deletion
-- Schedules account deletion with a 30-day grace period by inserting a pending
-- row into user_mgmt.gdpr_deletion_log.  Does NOT immediately delete the account.
-- If a pending deletion already exists, returns an error with the scheduled date.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_account_deletion(
  target_user_id uuid,
  deletion_type  text DEFAULT 'user_request'
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'user_mgmt', 'auth', 'public'
AS $$
DECLARE
  caller_id       uuid;
  grace_days      CONSTANT int := 30;
  scheduled_for   timestamptz;
  existing_row    user_mgmt.gdpr_deletion_log%ROWTYPE;
  user_email_val  text;
  user_name_val   text;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Security: users can only request deletion of their own account
  IF caller_id <> target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Check for an existing pending deletion
  SELECT * INTO existing_row
  FROM user_mgmt.gdpr_deletion_log
  WHERE user_id = target_user_id
    AND deletion_completed_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    scheduled_for := existing_row.deletion_requested_at + (grace_days || ' days')::interval;
    RETURN json_build_object(
      'success',               false,
      'message',               'Account deletion already scheduled',
      'deletion_scheduled_for', scheduled_for
    );
  END IF;

  -- Fetch user details for audit log
  SELECT email, raw_user_meta_data->>'full_name'
  INTO user_email_val, user_name_val
  FROM auth.users
  WHERE id = target_user_id;

  -- Insert pending deletion record
  INSERT INTO user_mgmt.gdpr_deletion_log (
    user_id,
    user_email,
    user_full_name,
    deletion_requested_at,
    deletion_completed_at,
    deletion_type,
    performed_by
  ) VALUES (
    target_user_id,
    user_email_val,
    user_name_val,
    now(),
    NULL,  -- NULL = pending (not yet completed)
    deletion_type,
    target_user_id
  );

  scheduled_for := now() + (grace_days || ' days')::interval;

  RETURN json_build_object(
    'success',               true,
    'message',               'Account deletion scheduled. You have 30 days to cancel.',
    'deletion_scheduled_for', scheduled_for,
    'grace_days',            grace_days
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.request_account_deletion(uuid, text) IS
  'Schedules account deletion with a 30-day grace period. Inserts a pending row into gdpr_deletion_log. Does not immediately delete the account.';

GRANT EXECUTE ON FUNCTION public.request_account_deletion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(uuid, text) TO service_role;


-- =============================================================================
-- 4. cancel_account_deletion
-- Cancels a pending GDPR deletion by removing the pending log entry.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'user_mgmt', 'public'
AS $$
DECLARE
  caller_id uuid;
  deleted_count int;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Security: users can only cancel their own deletion
  IF caller_id <> target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  DELETE FROM user_mgmt.gdpr_deletion_log
  WHERE user_id = target_user_id
    AND deletion_completed_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RETURN json_build_object('success', false, 'message', 'No pending deletion found to cancel');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Account deletion cancelled successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.cancel_account_deletion(uuid) IS
  'Cancels a pending GDPR deletion by removing the pending gdpr_deletion_log entry.';

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(uuid) TO service_role;
