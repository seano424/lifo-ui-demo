-- Migration: Fix action execution functions to validate recommended_action enum values
-- Date: 2025-10-28
-- Issue: Functions were failing when receiving invalid enum values like "monitor"
-- Solution: Add try-catch validation to gracefully handle invalid recommended_action values

-- Valid action_type enum values:
-- discount, donate, dispose, maintain, ignored, donate_prepared, sold

-- ============================================================================
-- 1. Fix execute_sold_action
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
  -- Valid values: discount, donate, dispose, maintain, ignored, donate_prepared, sold
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Invalid enum value provided, set to NULL instead of failing
      v_valid_recommended_action := NULL;
      -- Log this for debugging (optional)
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  -- Record the action with AI recommendation
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    v_valid_recommended_action,
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
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered
  );
END;
$function$;

-- ============================================================================
-- 2. Fix execute_discount_action
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET recommendation = 'discount_applied',
        urgency_level = 'low',
        calculated_at = NOW()
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
-- 3. Fix execute_donate_action
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET recommendation = 'donated',
        urgency_level = 'low',
        calculated_at = NOW()
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
-- 4. Fix execute_dispose_action
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET recommendation = 'disposed',
        urgency_level = 'low',
        calculated_at = NOW()
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
-- 5. Fix execute_dismiss_action
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET recommendation = 'ignored',
        urgency_level = 'low',
        calculated_at = NOW()
    WHERE batch_id = p_batch_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recommendation dismissed'
  );
END;
$function$;

-- ============================================================================
-- Migration complete!
-- ============================================================================
-- All action execution functions now gracefully handle invalid enum values
-- They will log warnings but continue processing instead of failing
