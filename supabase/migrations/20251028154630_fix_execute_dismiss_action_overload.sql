-- Migration: Fix execute_dismiss_action function overloading
--
-- Problem: PostgREST error PGRST203 - Multiple overloaded versions of execute_dismiss_action exist
-- The production database has two versions:
--   1. execute_dismiss_action(p_batch_id, p_dismissal_reason, p_user_id, p_notes) [4 params]
--   2. execute_dismiss_action(p_batch_id, p_dismissal_reason, p_user_id, p_notes, p_recommended_action) [5 params]
--
-- When calling with 4 parameters, PostgreSQL couldn't determine which function to use
-- because both functions could accept 4 parameters (the 5th parameter has a default).
--
-- Solution: Drop the 4-parameter version and keep only the 5-parameter version
-- The 5-parameter version is more flexible and can accept p_recommended_action optionally.
--
-- Impact: No code changes required - existing calls with 4 params will use DEFAULT NULL for p_recommended_action

-- Drop the old 4-parameter version
DROP FUNCTION IF EXISTS public.execute_dismiss_action(
  p_batch_id uuid,
  p_dismissal_reason text,
  p_user_id uuid,
  p_notes text
);

-- Create or replace the 5-parameter version (matches production)
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
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
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

-- Add comment to document the function
COMMENT ON FUNCTION public.execute_dismiss_action(uuid, text, uuid, text, text) IS
  'Executes dismiss/ignore action for a batch recommendation. Removed duplicate 4-parameter overload to fix function resolution ambiguity. The p_recommended_action parameter is optional and can be used to track AI recommendations.';
