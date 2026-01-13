-- Migration: Update get_batch_todo_states RPC functions
-- Description: Updates the RPC functions that query batch_todo_states to return new reason columns

-- ============================================================================
-- First, check what functions exist and their return types
-- We need to update any function that returns batch_todo_states data
-- ============================================================================

-- Update get_batch_todo_by_id to include new columns (already uses to_jsonb so should work automatically)
-- No changes needed - it returns to_jsonb(bts) which will include all columns

-- ============================================================================
-- Update get_todos_with_filters if it exists and has explicit column selection
-- ============================================================================

-- Drop and recreate with updated return type
DROP FUNCTION IF EXISTS public.get_todos_with_filters(UUID, TEXT[], TEXT[], INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(
  p_store_id UUID,
  p_todo_states TEXT[] DEFAULT NULL,
  p_completion_statuses TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  batch_id UUID,
  store_id UUID,
  batch_number VARCHAR,
  expiry_date DATE,
  current_quantity NUMERIC,
  available_quantity NUMERIC,
  lifecycle_status VARCHAR,
  batch_status VARCHAR,
  product_name VARCHAR,
  product_brand VARCHAR,
  ai_recommendation VARCHAR,
  composite_score NUMERIC,
  urgency_level TEXT,
  ai_calculated_at TIMESTAMP,
  last_action_type action_type,
  last_action_time TIMESTAMP,
  last_action_quantity NUMERIC,
  last_discount_percent NUMERIC,
  -- NEW: Reason fields
  last_action_disposal_reason TEXT,
  last_action_dismissal_reason TEXT,
  last_action_sale_timing TEXT,
  last_action_sale_occurred_at TIMESTAMPTZ,
  last_action_recipient_id UUID,
  last_action_recipient_name VARCHAR,
  last_action_notes TEXT,
  -- Continue with existing fields
  total_actions_ever BIGINT,
  total_discounted_quantity NUMERIC,
  total_donated_quantity NUMERIC,
  total_disposed_quantity NUMERIC,
  total_sold_quantity NUMERIC,
  total_ignored_quantity NUMERIC,
  cost_price NUMERIC,
  selling_price NUMERIC,
  current_selling_price NUMERIC,
  profit_margin NUMERIC,
  profit_margin_percent NUMERIC,
  potential_loss_value NUMERIC,
  potential_revenue_value NUMERIC,
  current_total_value NUMERIC,
  unit_price NUMERIC,
  completion_status TEXT,
  todo_state TEXT,
  priority_order INTEGER,
  days_to_expiry INTEGER,
  hours_since_last_action NUMERIC,
  view_refreshed_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
    AND su.user_id = v_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    bts.batch_id,
    bts.store_id,
    bts.batch_number,
    bts.expiry_date,
    bts.current_quantity,
    bts.available_quantity,
    bts.lifecycle_status,
    bts.batch_status,
    bts.product_name,
    bts.product_brand,
    bts.ai_recommendation,
    bts.composite_score,
    bts.urgency_level,
    bts.ai_calculated_at,
    bts.last_action_type,
    bts.last_action_time,
    bts.last_action_quantity,
    bts.last_discount_percent,
    -- NEW: Include reason fields
    bts.last_action_disposal_reason,
    bts.last_action_dismissal_reason,
    bts.last_action_sale_timing,
    bts.last_action_sale_occurred_at,
    bts.last_action_recipient_id,
    bts.last_action_recipient_name,
    bts.last_action_notes,
    -- Continue with existing fields
    bts.total_actions_ever,
    bts.total_discounted_quantity,
    bts.total_donated_quantity,
    bts.total_disposed_quantity,
    bts.total_sold_quantity,
    bts.total_ignored_quantity,
    bts.cost_price,
    bts.selling_price,
    bts.current_selling_price,
    bts.profit_margin,
    bts.profit_margin_percent,
    bts.potential_loss_value,
    bts.potential_revenue_value,
    bts.current_total_value,
    bts.unit_price,
    bts.completion_status,
    bts.todo_state,
    bts.priority_order,
    bts.days_to_expiry,
    bts.hours_since_last_action,
    bts.view_refreshed_at,
    COUNT(*) OVER()::BIGINT as total_count
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND (p_todo_states IS NULL OR bts.todo_state = ANY(p_todo_states))
    AND (p_completion_statuses IS NULL OR bts.completion_status = ANY(p_completion_statuses))
  ORDER BY bts.priority_order ASC, bts.days_to_expiry ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_todos_with_filters(UUID, TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- Update get_todos_with_counts to include new columns
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_todos_with_counts(UUID, TEXT[], TEXT[], INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_todos_with_counts(
  p_store_id UUID,
  p_todo_states TEXT[] DEFAULT NULL,
  p_completion_statuses TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_data JSONB;
  v_counts JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
    AND su.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('data', '[]'::jsonb, 'counts', '{}'::jsonb);
  END IF;

  -- Get filtered data with new columns
  SELECT jsonb_agg(row_to_json(t))
  INTO v_data
  FROM (
    SELECT 
      bts.*,
      COUNT(*) OVER()::BIGINT as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND (p_todo_states IS NULL OR bts.todo_state = ANY(p_todo_states))
      AND (p_completion_statuses IS NULL OR bts.completion_status = ANY(p_completion_statuses))
    ORDER BY bts.priority_order ASC, bts.days_to_expiry ASC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  -- Get counts by completion status (unfiltered by status filters)
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE completion_status = 'pending'),
    'in_progress', COUNT(*) FILTER (WHERE completion_status = 'in_progress'),
    'completed', COUNT(*) FILTER (WHERE completion_status = 'completed'),
    'expiring', COUNT(*) FILTER (WHERE days_to_expiry BETWEEN 0 AND 3 AND completion_status != 'completed'),
    'expired', COUNT(*) FILTER (WHERE days_to_expiry < 0)
  )
  INTO v_counts
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id;

  RETURN jsonb_build_object(
    'data', COALESCE(v_data, '[]'::jsonb),
    'counts', v_counts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_todos_with_counts(UUID, TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION public.get_todos_with_filters(UUID, TEXT[], TEXT[], INTEGER, INTEGER) IS
'Returns filtered batch todo items with new reason tracking columns:
- last_action_disposal_reason
- last_action_dismissal_reason
- last_action_sale_timing
- last_action_sale_occurred_at
- last_action_recipient_id
- last_action_recipient_name
- last_action_notes';

COMMENT ON FUNCTION public.get_todos_with_counts(UUID, TEXT[], TEXT[], INTEGER, INTEGER) IS
'Returns filtered batch todo items with counts, including new reason tracking columns';
