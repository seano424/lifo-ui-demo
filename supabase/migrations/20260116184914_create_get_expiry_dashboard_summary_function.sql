-- Migration: create_get_expiry_dashboard_summary_function
-- Description: Simple dashboard summary for expiring batches count

CREATE OR REPLACE FUNCTION public.get_expiry_dashboard_summary(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'inventory', 'business', 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
      AND su.user_id = auth.uid()
      AND su.is_active = true
  ) THEN
    -- Return zeros for unauthorized access (don't leak existence)
    RETURN json_build_object(
      'expiring_today', 0,
      'expiring_tomorrow', 0,
      'expiring_this_week', 0,
      'total_active_batches', 0,
      'total_products', 0
    );
  END IF;

  SELECT json_build_object(
    'expiring_today', COALESCE(counts.today_count, 0)::INTEGER,
    'expiring_tomorrow', COALESCE(counts.tomorrow_count, 0)::INTEGER,
    'expiring_this_week', COALESCE(counts.week_count, 0)::INTEGER,
    'total_active_batches', COALESCE(counts.total_batches, 0)::INTEGER,
    'total_products', COALESCE(counts.product_count, 0)::INTEGER
  )
  INTO v_result
  FROM (
    SELECT
      COUNT(*) FILTER (
        WHERE expiry_date = CURRENT_DATE
          AND current_quantity > 0
          AND status = 'active'
      ) as today_count,

      COUNT(*) FILTER (
        WHERE expiry_date = CURRENT_DATE + 1
          AND current_quantity > 0
          AND status = 'active'
      ) as tomorrow_count,

      COUNT(*) FILTER (
        WHERE expiry_date > CURRENT_DATE + 1
          AND expiry_date <= CURRENT_DATE + 7
          AND current_quantity > 0
          AND status = 'active'
      ) as week_count,

      COUNT(*) FILTER (
        WHERE current_quantity > 0
          AND status = 'active'
      ) as total_batches,

      COUNT(DISTINCT product_id) FILTER (
        WHERE current_quantity > 0
          AND status = 'active'
      ) as product_count

    FROM inventory.batches
    WHERE store_id = p_store_id
  ) counts;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_expiry_dashboard_summary(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_expiry_dashboard_summary(uuid) IS
'Returns a simple dashboard summary with expiring batch counts by timeframe.
Returns: expiring_today, expiring_tomorrow, expiring_this_week, total_active_batches, total_products';
