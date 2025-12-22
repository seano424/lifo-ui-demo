-- Migration: Fix get_todos_with_filters to include new reason tracking columns
-- Description: Updates the correct get_todos_with_filters function (JSONB signature)
--              to return the new reason tracking columns from batch_todo_states view

-- ============================================================================
-- Drop and recreate get_todos_with_filters with new columns
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_todos_with_filters(UUID, JSONB, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(
  p_store_id UUID,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  batch_id UUID,
  store_id UUID,
  batch_number VARCHAR,
  expiry_date DATE,
  current_quantity NUMERIC,
  available_quantity NUMERIC,
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
  -- NEW: Reason tracking columns
  last_action_disposal_reason TEXT,
  last_action_dismissal_reason TEXT,
  last_action_sale_timing TEXT,
  last_action_sale_occurred_at TIMESTAMPTZ,
  last_action_recipient_id UUID,
  last_action_recipient_name VARCHAR,
  last_action_notes TEXT,
  -- Continue with existing columns
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
  view_refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'inventory', 'scoring', 'business'
AS $$
DECLARE
  v_completion_status text;
  v_urgency_levels text[];
  v_action_types text[];
  v_batch_statuses text[];
  v_product_name text;
  v_days_to_expiry_max integer;
  v_days_to_expiry_min integer;
BEGIN
  -- Extract filter parameters from JSONB
  v_completion_status := p_filters->>'completion_status';
  v_product_name := p_filters->>'product_name';
  v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
  v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;

  -- Extract arrays from JSONB
  IF p_filters ? 'urgency_level' THEN
    SELECT array_agg(value::text)
    INTO v_urgency_levels
    FROM jsonb_array_elements_text(p_filters->'urgency_level');
  END IF;

  IF p_filters ? 'action_type' THEN
    SELECT array_agg(value::text)
    INTO v_action_types
    FROM jsonb_array_elements_text(p_filters->'action_type');
  END IF;

  IF p_filters ? 'batch_status' THEN
    SELECT array_agg(value::text)
    INTO v_batch_statuses
    FROM jsonb_array_elements_text(p_filters->'batch_status');
  END IF;

  -- Query the view with filters, now including new columns
  RETURN QUERY
  SELECT
    bts.batch_id,
    bts.store_id,
    bts.batch_number,
    bts.expiry_date,
    bts.current_quantity,
    bts.available_quantity,
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
    -- NEW: Include reason tracking columns
    bts.last_action_disposal_reason,
    bts.last_action_dismissal_reason,
    bts.last_action_sale_timing,
    bts.last_action_sale_occurred_at,
    bts.last_action_recipient_id,
    bts.last_action_recipient_name,
    bts.last_action_notes,
    -- Continue with existing columns
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
    bts.view_refreshed_at
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
    AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
    AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
    AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
    AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
    AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
    AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
  ORDER BY
    bts.priority_order ASC,
    bts.days_to_expiry ASC,
    bts.expiry_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_todos_with_filters(UUID, JSONB, INTEGER, INTEGER) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_todos_with_filters(UUID, JSONB, INTEGER, INTEGER) IS
'SECURITY: SECURITY DEFINER function. Enforces store access via business.stores RLS.
CRITICAL: Verify filter JSON cannot bypass store restrictions.
Returns batch todo items with reason tracking columns:
- last_action_disposal_reason
- last_action_dismissal_reason
- last_action_sale_timing
- last_action_sale_occurred_at
- last_action_recipient_id
- last_action_recipient_name
- last_action_notes
Last updated: 2025-12-18 - Added reason tracking columns';
