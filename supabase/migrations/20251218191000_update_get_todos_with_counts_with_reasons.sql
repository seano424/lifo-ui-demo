-- Migration: Update get_todos_with_counts RPC to include reason tracking columns
-- Description: Adds the 7 new reason tracking columns to the RPC function that was
--              using explicit column selection instead of SELECT *

-- ============================================================================
-- Drop and recreate the function with explicit column selection
-- This is the version with p_filters JSONB parameter
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_todos_with_counts(UUID, JSONB, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_todos_with_counts(
    p_store_id UUID,
    p_filters JSONB DEFAULT '{}'::jsonb,
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
    view_refreshed_at TIMESTAMPTZ,
    total_count BIGINT,
    pending_count BIGINT,
    in_progress_count BIGINT,
    completed_count BIGINT,
    expiring_count BIGINT,
    expired_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completion_status text;
    v_urgency_levels text[];
    v_action_types text[];
    v_batch_statuses text[];
    v_lifecycle_statuses text[];
    v_product_name text;
    v_days_to_expiry_max integer;
    v_days_to_expiry_min integer;
BEGIN
    -- Extract filter parameters from JSONB
    v_completion_status := p_filters->>'completion_status';
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;

    -- Extract arrays with proper null/empty handling
    IF p_filters ? 'urgency_level'
       AND p_filters->'urgency_level' IS NOT NULL
       AND jsonb_typeof(p_filters->'urgency_level') = 'array'
       AND jsonb_array_length(p_filters->'urgency_level') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_urgency_levels
        FROM jsonb_array_elements_text(p_filters->'urgency_level');
    END IF;

    -- action_type filters by last_action_type (what action was taken)
    IF p_filters ? 'action_type'
       AND p_filters->'action_type' IS NOT NULL
       AND jsonb_typeof(p_filters->'action_type') = 'array'
       AND jsonb_array_length(p_filters->'action_type') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_action_types
        FROM jsonb_array_elements_text(p_filters->'action_type');
    END IF;

    IF p_filters ? 'batch_status'
       AND p_filters->'batch_status' IS NOT NULL
       AND jsonb_typeof(p_filters->'batch_status') = 'array'
       AND jsonb_array_length(p_filters->'batch_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_batch_statuses
        FROM jsonb_array_elements_text(p_filters->'batch_status');
    END IF;

    IF p_filters ? 'lifecycle_status'
       AND p_filters->'lifecycle_status' IS NOT NULL
       AND jsonb_typeof(p_filters->'lifecycle_status') = 'array'
       AND jsonb_array_length(p_filters->'lifecycle_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_lifecycle_statuses
        FROM jsonb_array_elements_text(p_filters->'lifecycle_status');
    END IF;

    -- Single query with window functions for counts
    RETURN QUERY
    WITH filtered_base AS (
        -- Base filtered data (no pagination yet)
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
          -- Completion status filter
          AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
          -- Urgency level filter
          AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
          -- Action type filter (uses last_action_type - what action was taken)
          AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
          -- Batch status filter (disposition)
          AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
          -- Lifecycle status filter (active/expired)
          AND (v_lifecycle_statuses IS NULL OR bts.lifecycle_status = ANY(v_lifecycle_statuses))
          -- Product name search
          AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
          -- Days to expiry range
          AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
          AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
    ),
    with_counts AS (
        -- Add counts using window functions (calculated once across all filtered rows)
        SELECT
            fb.*,
            COUNT(*) OVER() as total_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'pending') OVER() as pending_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'in_progress') OVER() as in_progress_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'completed') OVER() as completed_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'active') OVER() as expiring_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'expired') OVER() as expired_count
        FROM filtered_base fb
    )
    SELECT
        wc.batch_id,
        wc.store_id,
        wc.batch_number,
        wc.expiry_date,
        wc.current_quantity,
        wc.available_quantity,
        wc.lifecycle_status,
        wc.batch_status,
        wc.product_name,
        wc.product_brand,
        wc.ai_recommendation,
        wc.composite_score,
        wc.urgency_level,
        wc.ai_calculated_at,
        wc.last_action_type,
        wc.last_action_time,
        wc.last_action_quantity,
        wc.last_discount_percent,
        -- NEW: Include reason tracking columns
        wc.last_action_disposal_reason,
        wc.last_action_dismissal_reason,
        wc.last_action_sale_timing,
        wc.last_action_sale_occurred_at,
        wc.last_action_recipient_id,
        wc.last_action_recipient_name,
        wc.last_action_notes,
        -- Continue with existing columns
        wc.total_actions_ever,
        wc.total_discounted_quantity,
        wc.total_donated_quantity,
        wc.total_disposed_quantity,
        wc.total_sold_quantity,
        wc.total_ignored_quantity,
        wc.cost_price,
        wc.selling_price,
        wc.current_selling_price,
        wc.profit_margin,
        wc.profit_margin_percent,
        wc.potential_loss_value,
        wc.potential_revenue_value,
        wc.current_total_value,
        wc.unit_price,
        wc.completion_status,
        wc.todo_state,
        wc.priority_order,
        wc.days_to_expiry,
        wc.hours_since_last_action,
        wc.view_refreshed_at,
        wc.total_count,
        wc.pending_count,
        wc.in_progress_count,
        wc.completed_count,
        wc.expiring_count,
        wc.expired_count
    FROM with_counts wc
    ORDER BY
        wc.priority_order ASC,
        wc.days_to_expiry ASC,
        wc.expiry_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_todos_with_counts(UUID, JSONB, INTEGER, INTEGER) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_todos_with_counts(UUID, JSONB, INTEGER, INTEGER) IS
'Returns filtered batch todo items with counts, including reason tracking columns:
- last_action_disposal_reason: Why item was disposed
- last_action_dismissal_reason: Why AI recommendation was dismissed
- last_action_sale_timing: When sale occurred (just_now, today, etc.)
- last_action_sale_occurred_at: Precise timestamp of sale
- last_action_recipient_id: Donation recipient UUID
- last_action_recipient_name: Donation recipient name
- last_action_notes: Notes from the last action';
