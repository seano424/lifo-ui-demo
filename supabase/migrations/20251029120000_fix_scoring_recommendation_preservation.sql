-- Migration: Fix Scoring Recommendation Preservation Issues
-- Date: 2025-10-29
-- Purpose: Preserve AI recommendations for feedback analysis while tracking action status
--
-- ISSUES FIXED:
-- 1. Logic bug in execute_sold_action using old quantity value
-- 2. Action functions overwriting AI recommendations (prevents feedback analysis)
-- 3. Invalid enum values being set in recommendation field
--
-- SOLUTION:
-- - Add status tracking to product_scores (pending, completed, dismissed)
-- - Preserve original AI recommendations in recommendation field
-- - Track action completion via status field instead
-- - Fix logic bug to use correct quantity variable
--
-- ROLLBACK PLAN:
-- - DROP status and completed_at columns
-- - Restore original action function behavior (overwrites recommendations)

-- ============================================================================
-- PART 1: Add Status Tracking to product_scores
-- ============================================================================

-- Add status column to track batch lifecycle
ALTER TABLE scoring.product_scores
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'completed', 'dismissed'));

-- Add timestamp for when action was completed
ALTER TABLE scoring.product_scores
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_product_scores_status
  ON scoring.product_scores(status)
  WHERE status = 'pending';

-- Add helpful comments
COMMENT ON COLUMN scoring.product_scores.status IS 'Lifecycle status: pending (awaiting action), completed (action taken), dismissed (user ignored)';
COMMENT ON COLUMN scoring.product_scores.completed_at IS 'Timestamp when batch action was completed by user';

-- ============================================================================
-- PART 2: Fix execute_sold_action (Logic Bug + Recommendation Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_sold_action(
  p_batch_id uuid,
  p_quantity_sold numeric,
  p_user_id uuid,
  p_notes text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_revenue_recovered DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  -- Get batch with row-level lock
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_sold > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot sell % units when only % available', p_quantity_sold, v_batch.current_quantity;
  END IF;

  v_revenue_recovered := p_quantity_sold * v_batch.selling_price;

  -- Validate recommended_action is a valid enum value
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Invalid enum value provided, set to NULL instead of failing
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  -- Record the action with AI recommendation (PRESERVED IN batch_actions)
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    v_valid_recommended_action,  -- AI recommendation preserved here
    p_quantity_sold, v_revenue_recovered, v_revenue_recovered,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update inventory and get new quantity
  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_sold,
      status = CASE
        WHEN current_quantity - p_quantity_sold <= 0 THEN 'sold_out'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- FIX: Mark as completed in scoring, but PRESERVE AI recommendation
  -- OLD BEHAVIOR: Overwrote recommendation with 'sold_full_price' or 'partial_sold'
  -- NEW BEHAVIOR: Keep AI recommendation, just mark as completed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',  -- Track that action was taken
        completed_at = NOW(),   -- Record when
        -- CRITICAL FIX: Use v_new_quantity (line 90) instead of v_batch.current_quantity (old value)
        urgency_level = CASE
          WHEN v_new_quantity <= 0 THEN 'none'  -- Batch fully sold
          ELSE 'low'  -- Partial sale, lower urgency
        END
        -- NOTE: recommendation field is NOT updated - preserves AI's original suggestion!
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
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered
  );
END;
$function$;

-- ============================================================================
-- PART 3: Fix execute_discount_action (Recommendation Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_discount_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_discount_percentage numeric,
  p_user_id uuid,
  p_notes text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_discounted_price DECIMAL;
  v_revenue_recovered DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot discount % units when only % available', p_quantity_affected, v_batch.current_quantity;
  END IF;

  v_discounted_price := v_batch.selling_price * (1 - p_discount_percentage / 100);
  v_revenue_recovered := p_quantity_affected * v_discounted_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    discount_percentage_applied, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'discount'::public.action_type,
    v_valid_recommended_action,
    p_quantity_affected,
    p_quantity_affected * v_batch.selling_price,
    v_revenue_recovered,
    p_discount_percentage, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_affected,
      status = CASE
        WHEN current_quantity - p_quantity_affected <= 0 THEN 'sold_out'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- FIX: Mark as completed, PRESERVE AI recommendation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW(),
        urgency_level = CASE
          WHEN v_new_quantity <= 0 THEN 'none'
          ELSE 'low'
        END
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'discount',
      v_batch.selling_price, v_discounted_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered,
    'discounted_price', v_discounted_price
  );
END;
$function$;

-- ============================================================================
-- PART 4: Fix execute_donate_action (Recommendation Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_donate_action(
  p_batch_id uuid,
  p_quantity_affected numeric,
  p_donation_recipient_id uuid,
  p_user_id uuid,
  p_notes text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_original_value DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot donate % units when only % available', p_quantity_affected, v_batch.current_quantity;
  END IF;

  v_original_value := p_quantity_affected * v_batch.selling_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, donation_recipient_id,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type,
    v_valid_recommended_action,
    p_quantity_affected, v_original_value, p_donation_recipient_id,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_affected,
      status = CASE
        WHEN current_quantity - p_quantity_affected <= 0 THEN 'donated'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- FIX: Mark as completed, PRESERVE AI recommendation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW(),
        urgency_level = CASE
          WHEN v_new_quantity <= 0 THEN 'none'
          ELSE 'low'
        END
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'donate',
      v_batch.selling_price, 0, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'original_value', v_original_value
  );
END;
$function$;

-- ============================================================================
-- PART 5: Fix execute_dispose_action (Recommendation Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_dispose_action(
  p_batch_id uuid,
  p_quantity_disposed numeric,
  p_disposal_reason text,
  p_user_id uuid,
  p_notes text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_original_value DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_disposed > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot dispose % units when only % available', p_quantity_disposed, v_batch.current_quantity;
  END IF;

  v_original_value := p_quantity_disposed * v_batch.selling_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, disposal_reason,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'dispose'::public.action_type,
    v_valid_recommended_action,
    p_quantity_disposed, v_original_value, p_disposal_reason,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_disposed,
      status = CASE
        WHEN current_quantity - p_quantity_disposed <= 0 THEN 'disposed'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- FIX: Mark as completed, PRESERVE AI recommendation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW(),
        urgency_level = CASE
          WHEN v_new_quantity <= 0 THEN 'none'
          ELSE 'low'
        END
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'dispose',
      v_batch.selling_price, 0, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'waste_value', v_original_value
  );
END;
$function$;

-- ============================================================================
-- PART 6: Fix execute_dismiss_action (Recommendation Preservation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_dismiss_action(
  p_batch_id uuid,
  p_dismissal_reason text,
  p_user_id uuid,
  p_notes text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action,
    dismissal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'ignored'::public.action_type,
    v_valid_recommended_action,
    p_dismissal_reason, p_user_id, v_batch.initial_quantity, p_notes
  );

  -- FIX: Mark as dismissed, PRESERVE AI recommendation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'dismissed',  -- User explicitly ignored AI recommendation
        completed_at = NOW(),
        urgency_level = 'low'
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recommendation dismissed'
  );
END;
$function$;

-- ============================================================================
-- PART 7: Add Helper View for AI Recommendation Analysis
-- ============================================================================

-- Create view to easily analyze AI recommendation accuracy
CREATE OR REPLACE VIEW scoring.recommendation_accuracy AS
SELECT
  ps.batch_id,
  ps.store_id,
  ps.recommendation AS ai_recommended,
  ba.action_type AS user_action,
  ps.composite_score,
  ps.urgency_level,
  ps.status,
  ps.calculated_at AS ai_scored_at,
  ps.completed_at AS action_taken_at,
  ba.performed_by,
  ba.quantity_affected,
  ba.total_original_value,
  ba.total_recovered_value,
  -- Calculate if user followed AI recommendation
  CASE
    WHEN ba.action_type::TEXT = ps.recommendation THEN true
    WHEN ba.action_type = 'discount' AND ps.recommendation IN ('discount_aggressive', 'discount_moderate', 'discount_light') THEN true
    ELSE false
  END AS user_followed_ai,
  -- Calculate recovery rate
  CASE
    WHEN ba.total_original_value > 0
    THEN (ba.total_recovered_value / ba.total_original_value) * 100
    ELSE 0
  END AS recovery_rate_percent
FROM scoring.product_scores ps
LEFT JOIN inventory.batch_actions ba ON ba.batch_id = ps.batch_id
WHERE ps.status IN ('completed', 'dismissed')
ORDER BY ps.completed_at DESC;

COMMENT ON VIEW scoring.recommendation_accuracy IS
  'Analyzes AI recommendation accuracy by comparing AI suggestions with actual user actions. ' ||
  'Use this for AI model feedback and improvement.';

-- ============================================================================
-- Migration Complete!
-- ============================================================================

-- WHAT CHANGED:
-- 1. Added status tracking to product_scores (pending/completed/dismissed)
-- 2. Fixed logic bug in execute_sold_action (now uses v_new_quantity)
-- 3. All 5 action functions now PRESERVE AI recommendations
-- 4. Added recommendation_accuracy view for AI feedback analysis
--
-- BENEFITS:
-- ✅ AI recommendations preserved for model improvement
-- ✅ Can analyze AI accuracy (how often users follow recommendations)
-- ✅ batch_actions table has complete audit trail
-- ✅ Frontend can filter by status (show only pending recommendations)
-- ✅ Logic bug fixed (correct quantity calculation)
--
-- DATA FLOW AFTER THIS MIGRATION:
-- 1. Backend AI scores → writes to product_scores (status='pending')
-- 2. Frontend displays recommendations to user
-- 3. User takes action → batch_actions created with recommended_action
-- 4. Function updates product_scores status='completed' (recommendation preserved!)
-- 5. Analytics can compare ai_recommended vs user_action for feedback
