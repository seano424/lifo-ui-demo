-- Migration: Fix execute_donate_action function overloading
--
-- Problem: PostgREST error PGRST203 - Multiple overloaded versions of execute_donate_action exist
-- The production database has two versions:
--   1. execute_donate_action(p_batch_id, p_quantity_affected, p_donation_recipient_id, p_user_id, p_notes) [5 params]
--   2. execute_donate_action(p_batch_id, p_quantity_affected, p_donation_recipient_id, p_user_id, p_notes, p_recommended_action) [6 params]
--
-- When calling with 5 parameters, PostgreSQL couldn't determine which function to use
-- because both functions could accept 5 parameters (the 6th parameter has a default).
--
-- Solution: Drop the 5-parameter version and keep only the 6-parameter version
-- The 6-parameter version is more flexible and can accept p_recommended_action optionally.
--
-- Impact: No code changes required - existing calls with 5 params will use DEFAULT NULL for p_recommended_action

-- Drop the old 5-parameter version
DROP FUNCTION IF EXISTS public.execute_donate_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_donation_recipient_id uuid,
  p_user_id uuid,
  p_notes text
);

-- Create or replace the 6-parameter version (matches production)
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
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;

  v_total_value := p_quantity_affected * COALESCE(v_batch.cost_price, v_batch.selling_price);

  -- Record the action with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    donation_recipient_id, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type,
    CASE WHEN p_recommended_action IS NOT NULL THEN p_recommended_action::public.action_type ELSE NULL END,
    p_quantity_affected,
    v_total_value, 0,
    p_donation_recipient_id, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update batch: reduce quantity, set to donated if all donated
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

-- Add comment to document the function
COMMENT ON FUNCTION public.execute_donate_action(uuid, numeric, uuid, uuid, text, text) IS
  'Executes donate action for a batch. Removed duplicate 5-parameter overload to fix function resolution ambiguity. The p_recommended_action parameter is optional and can be used to track AI recommendations.';
