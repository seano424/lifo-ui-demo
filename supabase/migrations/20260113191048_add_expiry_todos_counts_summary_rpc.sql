-- Add expiry_todos_summary type and get_expiry_todos_counts_summary RPC function
-- Used for tab badges in the Expiring Soon page to show counts for different time ranges

set check_function_bodies = off;

-- Create the composite type for the summary result
create type "inventory"."expiry_todos_summary" as ("expiring_today" integer, "expiring_soon" integer, "expiring_week" integer, "expired" integer, "total" integer);

-- Create the RPC function to get the counts summary
CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_counts_summary(p_store_id uuid)
 RETURNS inventory.expiry_todos_summary
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_result inventory.expiry_todos_summary;
BEGIN
  SELECT
    -- Expiring Today: 0-1 days (today and tomorrow)
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 0 AND days_to_expiry <= 1
    )::INTEGER,

    -- Expiring Soon: 2-3 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 2 AND days_to_expiry <= 3
    )::INTEGER,

    -- Expiring This Week: 4-7 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 4 AND days_to_expiry <= 7
    )::INTEGER,

    -- Expired: negative days (already past expiry)
    COUNT(*) FILTER (
      WHERE days_to_expiry < 0
    )::INTEGER,

    -- Total: all items that need attention (expired + expiring within 7 days)
    COUNT(*) FILTER (
      WHERE days_to_expiry <= 7
    )::INTEGER

  INTO
    v_result.expiring_today,
    v_result.expiring_soon,
    v_result.expiring_week,
    v_result.expired,
    v_result.total
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id
    AND completion_status != 'completed'
    AND current_quantity > 0;

  -- Ensure no NULLs
  v_result.expiring_today := COALESCE(v_result.expiring_today, 0);
  v_result.expiring_soon := COALESCE(v_result.expiring_soon, 0);
  v_result.expiring_week := COALESCE(v_result.expiring_week, 0);
  v_result.expired := COALESCE(v_result.expired, 0);
  v_result.total := COALESCE(v_result.total, 0);

  RETURN v_result;
END;
$function$;
