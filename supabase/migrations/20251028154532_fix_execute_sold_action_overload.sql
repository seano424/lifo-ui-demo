-- Migration: Fix execute_sold_action function overloading
--
-- Problem: PostgREST error PGRST203 - Multiple overloaded versions of execute_sold_action exist
-- The production database has two versions:
--   1. execute_sold_action(p_batch_id, p_quantity_sold, p_user_id, p_notes) [4 params]
--   2. execute_sold_action(p_batch_id, p_quantity_sold, p_user_id, p_notes, p_recommended_action) [5 params]
--
-- When calling with 4 parameters, PostgreSQL couldn't determine which function to use
-- because both functions could accept 4 parameters (the 5th parameter has a default).
--
-- Solution: Drop the 4-parameter version and keep only the 5-parameter version
-- The 5-parameter version is more flexible and can accept p_recommended_action optionally.
--
-- Impact: No code changes required - existing calls with 4 params will use DEFAULT NULL for p_recommended_action

-- Drop the old 4-parameter version
DROP FUNCTION IF EXISTS public.execute_sold_action(
  p_batch_id uuid,
  p_quantity_sold numeric,
  p_user_id uuid,
  p_notes text
);

-- Create or replace the 5-parameter version (matches production)
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
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
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

-- Add comment to document the function
COMMENT ON FUNCTION public.execute_sold_action(uuid, numeric, uuid, text, text) IS
  'Executes sold action for a batch. Removed duplicate 4-parameter overload to fix function resolution ambiguity. The p_recommended_action parameter is optional and can be used to track AI recommendations.';
