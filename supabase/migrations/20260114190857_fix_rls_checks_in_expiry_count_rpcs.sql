-- Fix missing authorization checks in expiry/urgent count RPC functions
-- These functions use SECURITY DEFINER which bypasses RLS, so we must manually
-- verify that the requesting user has access to the store's data

set check_function_bodies = off;

-- ============================================================================
-- 1. Fix inventory.get_expiry_todos_count - Add authorization check
-- ============================================================================
CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_count(p_store_id uuid, p_expiry_days integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_expiry_days INTEGER;
  v_count INTEGER;
BEGIN
  -- SECURITY: Verify user has access to this store
  -- Return 0 for unauthorized access (same behavior as "no data")
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  -- Determine expiry threshold:
  -- 1. Use provided parameter if given
  -- 2. Otherwise, use store's configured setting
  -- 3. Fall back to default of 3 if neither exists
  IF p_expiry_days IS NOT NULL THEN
    v_expiry_days := p_expiry_days;
  ELSE
    SELECT COALESCE(ss.expiry_alert_days, 3)
    INTO v_expiry_days
    FROM business.store_settings ss
    WHERE ss.store_id = p_store_id;

    -- If store has no settings record, use default
    IF v_expiry_days IS NULL THEN
      v_expiry_days := 3;
    END IF;
  END IF;

  -- Count batches expiring within the threshold
  SELECT COUNT(*)::INT
  INTO v_count
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND bts.days_to_expiry >= 0
    AND bts.days_to_expiry <= v_expiry_days
    AND bts.completion_status != 'completed'
    AND bts.current_quantity > 0;

  RETURN COALESCE(v_count, 0);
END;
$function$;

-- ============================================================================
-- 2. Fix inventory.get_expiry_todos_counts_summary - Add authorization check
-- ============================================================================
CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_counts_summary(p_store_id uuid)
 RETURNS inventory.expiry_todos_summary
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result inventory.expiry_todos_summary;
BEGIN
  -- SECURITY: Verify user has access to this store
  -- Return empty result for unauthorized access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    v_result.expiring_today := 0;
    v_result.expiring_soon := 0;
    v_result.expiring_week := 0;
    v_result.expired := 0;
    v_result.total := 0;
    RETURN v_result;
  END IF;

  SELECT
    -- Expiring Today: 0-1 days (today and tomorrow)
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 0 AND days_to_expiry <= 1
    )::INTEGER,

    -- Expiring Soon: 2-3 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 2 AND days_to_expiry <= 3
    )::INTEGER,

    -- Expiring This Week: 4-7 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 4 AND days_to_expiry <= 7
    )::INTEGER,

    -- Expired: negative days (already past expiry)
    COUNT(*) FILTER (
      WHERE days_to_expiry < 0
    )::INTEGER,

    -- Total: all items that need attention (expired + expiring within 7 days)
    COUNT(*) FILTER (
      WHERE days_to_expiry <= 7
    )::INTEGER

  INTO
    v_result.expiring_today,
    v_result.expiring_soon,
    v_result.expiring_week,
    v_result.expired,
    v_result.total
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id
    AND completion_status != 'completed'
    AND current_quantity > 0;

  -- Ensure no NULLs
  v_result.expiring_today := COALESCE(v_result.expiring_today, 0);
  v_result.expiring_soon := COALESCE(v_result.expiring_soon, 0);
  v_result.expiring_week := COALESCE(v_result.expiring_week, 0);
  v_result.expired := COALESCE(v_result.expired, 0);
  v_result.total := COALESCE(v_result.total, 0);

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 3. Fix inventory.get_urgent_todos_count - Change to PL/pgSQL and add auth
-- ============================================================================
DROP FUNCTION IF EXISTS inventory.get_urgent_todos_count(uuid);

CREATE OR REPLACE FUNCTION inventory.get_urgent_todos_count(p_store_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- SECURITY: Verify user has access to this store
  -- Return 0 for unauthorized access (same behavior as "no data")
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  -- Get count from materialized view
  SELECT COALESCE(urgent_count, 0)::INT
  INTO v_count
  FROM inventory.mv_store_urgent_counts
  WHERE store_id = p_store_id;

  RETURN COALESCE(v_count, 0);
END;
$function$;

-- ============================================================================
-- 4. Update public wrapper function for get_urgent_todos_count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_urgent_todos_count(p_store_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT inventory.get_urgent_todos_count(p_store_id);
$function$;

-- Add helpful comments
COMMENT ON FUNCTION inventory.get_expiry_todos_count IS
'Returns count of batches expiring within threshold for a store. Includes authorization check via store_users table.';

COMMENT ON FUNCTION inventory.get_expiry_todos_counts_summary IS
'Returns counts of batches grouped by expiry ranges. Includes authorization check via store_users table.';

COMMENT ON FUNCTION inventory.get_urgent_todos_count IS
'Returns count of urgent todos from materialized view. Includes authorization check via store_users table.';
