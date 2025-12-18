-- Migration: Update execute_sold_action RPC function
-- Description: Adds sale_timing and sale_occurred_at parameters to properly track sale metadata

-- ============================================================================
-- Drop and recreate execute_sold_action with new parameters
-- ============================================================================

DROP FUNCTION IF EXISTS public.execute_sold_action(UUID, NUMERIC, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.execute_sold_action(
  p_batch_id UUID,
  p_quantity_sold NUMERIC,
  p_user_id UUID,
  p_sale_timing TEXT DEFAULT 'just-now',           -- NEW: When sale occurred
  p_sale_occurred_at TIMESTAMPTZ DEFAULT NULL,     -- NEW: Precise timestamp (optional)
  p_notes TEXT DEFAULT NULL,
  p_recommended_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_revenue_recovered DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
  v_last_discount_percent DECIMAL;
  v_effective_price DECIMAL;
  v_calculated_sale_time TIMESTAMPTZ;
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

  -- Validate sale_timing matches the CHECK constraint values
  IF p_sale_timing NOT IN ('just-now', 'today', 'yesterday', 'this-week', 'custom') THEN
    RAISE EXCEPTION 'Invalid sale_timing value: %. Must be one of: just-now, today, yesterday, this-week, custom', p_sale_timing;
  END IF;

  -- Calculate sale_occurred_at based on timing if not provided
  IF p_sale_occurred_at IS NOT NULL THEN
    v_calculated_sale_time := p_sale_occurred_at;
  ELSE
    v_calculated_sale_time := CASE p_sale_timing
      WHEN 'just-now' THEN NOW()
      WHEN 'today' THEN DATE_TRUNC('day', NOW()) + INTERVAL '12 hours'
      WHEN 'yesterday' THEN DATE_TRUNC('day', NOW()) - INTERVAL '12 hours'
      WHEN 'this-week' THEN NOW() - INTERVAL '3 days'
      WHEN 'custom' THEN NULL -- Should have been provided
      ELSE NOW()
    END;
  END IF;

  -- Look up the most recent discount percentage for this batch
  SELECT discount_percentage INTO v_last_discount_percent
  FROM inventory.batch_actions
  WHERE batch_id = p_batch_id
    AND action_type = 'discount'
    AND discount_percentage IS NOT NULL
  ORDER BY performed_at DESC
  LIMIT 1;

  -- Calculate effective price (with discount if applicable)
  IF v_last_discount_percent IS NOT NULL THEN
    v_effective_price := v_batch.selling_price * (1 - v_last_discount_percent / 100);
  ELSE
    v_effective_price := v_batch.selling_price;
  END IF;

  -- Calculate revenue based on effective (discounted) price
  v_revenue_recovered := p_quantity_sold * v_effective_price;

  -- Validate recommended_action is a valid enum value
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  -- Record the action with sale timing metadata
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    discount_percentage,
    sale_timing,              -- NEW: Store the timing category
    sale_occurred_at,         -- NEW: Store the calculated/provided timestamp
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    v_valid_recommended_action,
    p_quantity_sold,
    v_last_discount_percent,
    p_sale_timing,            -- NEW
    v_calculated_sale_time,   -- NEW
    p_quantity_sold * v_batch.selling_price,  -- Original value (full price)
    v_revenue_recovered,  -- Recovered value (after discount)
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

  -- Mark as completed in scoring, but PRESERVE AI recommendation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
    WHERE batch_id = p_batch_id;
  END IF;

  -- Track for analytics (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'sold',
      v_batch.selling_price, v_effective_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered,
    'discount_applied', v_last_discount_percent,
    'effective_price', v_effective_price,
    'sale_timing', p_sale_timing,                    -- NEW: Return timing
    'sale_occurred_at', v_calculated_sale_time       -- NEW: Return calculated time
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_sold_action(UUID, NUMERIC, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.execute_sold_action IS 
'Records a sale action for a batch with structured timing metadata. 
Parameters:
- p_batch_id: The batch being sold
- p_quantity_sold: Number of units sold
- p_user_id: User performing the action
- p_sale_timing: When sale occurred (just-now, today, yesterday, this-week, custom)
- p_sale_occurred_at: Optional precise timestamp
- p_notes: Optional notes
- p_recommended_action: AI recommendation that was in effect';
