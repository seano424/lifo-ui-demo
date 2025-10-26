-- =============================================
-- Create RPC function to get todo counts by filter
-- This allows efficient counting without fetching full todo data
-- =============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_todos_counts_with_filters(UUID, JSONB);

-- Create function to get counts for all todo tabs
CREATE OR REPLACE FUNCTION get_todos_counts_with_filters(
    p_store_id UUID,
    p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, inventory, scoring
AS $$
DECLARE
    v_pending_count INT := 0;
    v_in_progress_count INT := 0;
    v_completed_count INT := 0;
    v_expiring_count INT := 0;
    v_expired_count INT := 0;
    v_urgency_levels TEXT[];
    v_action_types TEXT[];
    v_batch_statuses TEXT[];
    v_product_name TEXT;
    v_days_to_expiry_min INT;
    v_days_to_expiry_max INT;
BEGIN
    -- Extract filter values from JSONB
    v_urgency_levels := ARRAY(SELECT jsonb_array_elements_text(p_filters->'urgency_level'));
    v_action_types := ARRAY(SELECT jsonb_array_elements_text(p_filters->'action_type'));
    v_batch_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'batch_status'));
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::INT;
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::INT;

    -- Count pending todos
    SELECT COUNT(*)
    INTO v_pending_count
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
      AND completion_status = 'pending'
      AND (v_urgency_levels IS NULL OR array_length(v_urgency_levels, 1) = 0 OR urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR array_length(v_action_types, 1) = 0 OR recommended_action = ANY(v_action_types))
      AND (v_batch_statuses IS NULL OR array_length(v_batch_statuses, 1) = 0 OR batch_status = ANY(v_batch_statuses))
      AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
      AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max);

    -- Count in_progress todos
    SELECT COUNT(*)
    INTO v_in_progress_count
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
      AND completion_status = 'in_progress'
      AND (v_urgency_levels IS NULL OR array_length(v_urgency_levels, 1) = 0 OR urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR array_length(v_action_types, 1) = 0 OR recommended_action = ANY(v_action_types))
      AND (v_batch_statuses IS NULL OR array_length(v_batch_statuses, 1) = 0 OR batch_status = ANY(v_batch_statuses))
      AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
      AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max);

    -- Count completed todos
    SELECT COUNT(*)
    INTO v_completed_count
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
      AND completion_status = 'completed'
      AND (v_urgency_levels IS NULL OR array_length(v_urgency_levels, 1) = 0 OR urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR array_length(v_action_types, 1) = 0 OR recommended_action = ANY(v_action_types))
      AND (v_batch_statuses IS NULL OR array_length(v_batch_statuses, 1) = 0 OR batch_status = ANY(v_batch_statuses))
      AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
      AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max);

    -- Count expiring todos (batch_status = 'active')
    -- Note: For expiring tab, we always filter to active batches and days_to_expiry_min defaults to 0
    SELECT COUNT(*)
    INTO v_expiring_count
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
      AND batch_status = 'active'
      AND (v_urgency_levels IS NULL OR array_length(v_urgency_levels, 1) = 0 OR urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR array_length(v_action_types, 1) = 0 OR recommended_action = ANY(v_action_types))
      AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
      AND days_to_expiry >= COALESCE(v_days_to_expiry_min, 0)
      AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max);

    -- Count expired todos (batch_status = 'expired')
    SELECT COUNT(*)
    INTO v_expired_count
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
      AND batch_status = 'expired'
      AND (v_urgency_levels IS NULL OR array_length(v_urgency_levels, 1) = 0 OR urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR array_length(v_action_types, 1) = 0 OR recommended_action = ANY(v_action_types))
      AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
      AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max);

    -- Return counts as JSONB
    RETURN jsonb_build_object(
        'pending', v_pending_count,
        'in_progress', v_in_progress_count,
        'completed', v_completed_count,
        'expiring', v_expiring_count,
        'expired', v_expired_count
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_todos_counts_with_filters(UUID, JSONB) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_todos_counts_with_filters IS
'Returns counts for all todo tabs (pending, in_progress, completed, expiring, expired) based on filters.
This is more efficient than fetching all todos just to get counts.';
