-- Migration: Add Authorization Checks and Row-Level Locking to Batch Action Functions
--
-- CRITICAL SECURITY FIXES:
-- 1. Add authorization checks to verify users have access to the store
-- 2. Add FOR UPDATE row-level locking to prevent race conditions
-- 3. Standardize search_path to empty string for security
--
-- Affected Functions:
-- - execute_dispose_action
-- - execute_discount_action
-- - execute_sold_action
-- - execute_donate_action
-- - execute_dismiss_action
--
-- Issue: All functions use SECURITY DEFINER but don't verify p_user_id has permission
-- to modify batches in the store. Also missing row-level locking for concurrent operations.
--
-- Date: October 28, 2025
-- Severity: HIGH - Authorization bypass vulnerability

-- ============================================================================
-- 1. FIX: execute_dispose_action - Add authorization and locking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_dispose_action(
  p_batch_id uuid,
  p_quantity_disposed numeric,
  p_disposal_reason text,
  p_user_id uuid,
  p_notes text DEFAULT NULL::text,
  p_recommended_action text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_loss_value DECIMAL;
BEGIN
  -- Get batch with row-level lock to prevent race conditions
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;  -- ADDED: Prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: User does not have access to this store'
    );
  END IF;

  IF p_quantity_disposed > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;

  v_loss_value := p_quantity_disposed * COALESCE(v_batch.cost_price, v_batch.selling_price);

  -- Insert audit trail with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    disposal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'dispose'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    p_quantity_disposed, v_loss_value, 0,
    p_disposal_reason, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update batch state
  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_disposed,
      status = CASE
        WHEN current_quantity - p_quantity_disposed <= 0 THEN 'expired'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_disposed,
    'total_loss_value', v_loss_value
  );
END;
$$;

COMMENT ON FUNCTION public.execute_dispose_action(uuid, numeric, text, uuid, text, text) IS
  'Executes disposal action for a batch with authorization checks and row-level locking. Updated Oct 28, 2025 to fix security vulnerabilities.';

-- ============================================================================
-- 2. FIX: execute_discount_action - Add authorization and standardize search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_discount_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_discount_percentage numeric,
  p_user_id uuid,
  p_notes text DEFAULT NULL::text,
  p_recommended_action text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''  -- CHANGED: From 'public', 'inventory' to empty for security
AS $$
DECLARE
  v_store_id UUID;
  v_batch_record RECORD;
  v_action_id UUID;
  v_original_price NUMERIC;
  v_discounted_price NUMERIC;
  v_original_value NUMERIC;
  v_recovered_value NUMERIC;
  v_result JSONB;
BEGIN
  -- Get batch details with lock (already has FOR UPDATE - good!)
  SELECT
    b.batch_id,
    b.store_id,
    b.current_quantity,
    b.selling_price,
    b.cost_price,
    b.initial_quantity
  INTO v_batch_record
  FROM inventory.batches b
  WHERE b.batch_id = p_batch_id
  FOR UPDATE;

  -- Validation
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch_record.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to this store';
  END IF;

  IF p_quantity_affected > v_batch_record.current_quantity THEN
    RAISE EXCEPTION 'Cannot affect % units when only % available',
      p_quantity_affected, v_batch_record.current_quantity;
  END IF;

  IF p_discount_percentage < 0 OR p_discount_percentage > 100 THEN
    RAISE EXCEPTION 'Discount percentage must be between 0 and 100';
  END IF;

  -- Calculate prices
  v_original_price := v_batch_record.selling_price;
  v_discounted_price := v_original_price * (1 - p_discount_percentage / 100.0);
  v_original_value := p_quantity_affected * v_original_price;
  v_recovered_value := p_quantity_affected * v_discounted_price;

  -- Update the batch selling_price
  -- Note: This applies the discount to the ENTIRE batch, not just the discounted quantity.
  -- This is the intended business logic for batch-level pricing in LIFO.
  UPDATE inventory.batches
  SET
    selling_price = v_discounted_price,
    updated_at = NOW()
  WHERE batch_id = p_batch_id;

  -- Record the action with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, discount_percentage,
    quantity_affected, performed_by, notes,
    total_original_value, total_recovered_value, batch_initial_quantity
  ) VALUES (
    p_batch_id, v_batch_record.store_id, 'discount'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    p_discount_percentage, p_quantity_affected, p_user_id, p_notes,
    v_original_value, v_recovered_value, v_batch_record.initial_quantity
  )
  RETURNING entry_id INTO v_action_id;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'action_id', v_action_id,
    'batch_id', p_batch_id,
    'original_price', v_original_price,
    'new_price', v_discounted_price,
    'quantity_affected', p_quantity_affected,
    'remaining_quantity', v_batch_record.current_quantity,
    'original_value', v_original_value,
    'recovered_value', v_recovered_value
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.execute_discount_action(uuid, numeric, numeric, uuid, text, text) IS
  'Executes discount action for a batch with authorization checks. Note: Discount applies to entire batch. Updated Oct 28, 2025 to fix security vulnerabilities.';

-- ============================================================================
-- 3. FIX: execute_sold_action - Add authorization and locking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_sold_action(
  p_batch_id uuid,
  p_quantity_sold numeric,
  p_user_id uuid,
  p_notes text DEFAULT NULL::text,
  p_recommended_action text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_revenue_recovered DECIMAL;
BEGIN
  -- Get batch with row-level lock
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;  -- ADDED: Prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: User does not have access to this store'
    );
  END IF;

  IF p_quantity_sold > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;

  v_revenue_recovered := p_quantity_sold * v_batch.selling_price;

  -- Record the action with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    p_quantity_sold, v_revenue_recovered, v_revenue_recovered,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update inventory
  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_sold,
      status = CASE
        WHEN current_quantity - p_quantity_sold <= 0 THEN 'sold_out'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;

  -- Mark as resolved in scoring (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET recommendation = CASE
          WHEN v_batch.current_quantity - p_quantity_sold <= 0 THEN 'sold_full_price'
          ELSE 'partial_sold'
        END,
        urgency_level = 'low',
        calculated_at = NOW()
    WHERE batch_id = p_batch_id;
  END IF;

  -- Track for analytics (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'sold',
      v_batch.selling_price, v_batch.selling_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_sold,
    'revenue_recovered', v_revenue_recovered
  );
END;
$$;

COMMENT ON FUNCTION public.execute_sold_action(uuid, numeric, uuid, text, text) IS
  'Executes sold action for a batch with authorization checks and row-level locking. Updated Oct 28, 2025 to fix security vulnerabilities.';

-- ============================================================================
-- 4. FIX: execute_donate_action - Add authorization and locking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_donate_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_donation_recipient_id uuid,
  p_user_id uuid,
  p_notes text DEFAULT NULL::text,
  p_recommended_action text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_total_value DECIMAL;
BEGIN
  -- Get batch with row-level lock
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;  -- ADDED: Prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: User does not have access to this store'
    );
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;

  v_total_value := p_quantity_affected * COALESCE(v_batch.cost_price, v_batch.selling_price);

  -- Insert audit trail with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    donation_recipient_id, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    p_quantity_affected, v_total_value, 0,
    p_donation_recipient_id, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update batch state
  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_affected,
      status = CASE
        WHEN current_quantity - p_quantity_affected <= 0 THEN 'donated'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_affected,
    'total_value_donated', v_total_value
  );
END;
$$;

COMMENT ON FUNCTION public.execute_donate_action(uuid, numeric, uuid, uuid, text, text) IS
  'Executes donation action for a batch with authorization checks and row-level locking. Updated Oct 28, 2025 to fix security vulnerabilities.';

-- ============================================================================
-- 5. FIX: execute_dismiss_action - Add authorization and locking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_dismiss_action(
  p_batch_id uuid,
  p_dismissal_reason text,
  p_user_id uuid,
  p_notes text DEFAULT NULL::text,
  p_recommended_action text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
BEGIN
  -- Get batch with row-level lock
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;  -- ADDED: Prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: User does not have access to this store'
    );
  END IF;

  -- Record dismissal with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    disposal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'ignored'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    0, 0, 0,
    p_dismissal_reason, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'message', 'Recommendation dismissed'
  );
END;
$$;

COMMENT ON FUNCTION public.execute_dismiss_action(uuid, text, uuid, text, text) IS
  'Executes dismiss/ignore action with authorization checks and row-level locking. Updated Oct 28, 2025 to fix security vulnerabilities.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all functions now have consistent security
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters,
    prosecdef as is_security_definer,
    proconfig as settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'execute_dispose_action',
    'execute_discount_action',
    'execute_sold_action',
    'execute_donate_action',
    'execute_dismiss_action'
)
ORDER BY p.proname;
