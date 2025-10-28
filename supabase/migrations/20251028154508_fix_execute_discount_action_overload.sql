-- Migration: Fix execute_discount_action function overloading
--
-- Problem: PostgREST error PGRST203 - Multiple overloaded versions of execute_discount_action exist
-- The production database has two versions:
--   1. execute_discount_action(p_batch_id, p_quantity_affected, p_discount_percentage, p_user_id, p_notes) [5 params]
--   2. execute_discount_action(p_batch_id, p_quantity_affected, p_discount_percentage, p_user_id, p_notes, p_recommended_action) [6 params]
--
-- When calling with 5 parameters, PostgreSQL couldn't determine which function to use
-- because both functions could accept 5 parameters (the 6th parameter has a default).
--
-- Solution: Drop the 5-parameter version and keep only the 6-parameter version
-- The 6-parameter version is more flexible and can accept p_recommended_action optionally.
--
-- Impact: No code changes required - existing calls with 5 params will use DEFAULT NULL for p_recommended_action

-- Drop the old 5-parameter version
DROP FUNCTION IF EXISTS public.execute_discount_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_discount_percentage numeric,
  p_user_id uuid,
  p_notes text
);

-- Create or replace the 6-parameter version (matches production)
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
    SET search_path TO 'public', 'inventory'
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
  -- Get batch details with lock
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
    p_batch_id, v_batch_record.store_id, 'discount',
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

-- Add comment to document the function
COMMENT ON FUNCTION public.execute_discount_action(uuid, numeric, numeric, uuid, text, text) IS
  'Executes discount action for a batch. Removed duplicate 5-parameter overload to fix function resolution ambiguity. The p_recommended_action parameter is optional and can be used to track AI recommendations.';
