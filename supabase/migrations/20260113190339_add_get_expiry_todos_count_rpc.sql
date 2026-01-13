-- Add get_expiry_todos_count RPC function for notification bell
-- Counts batches expiring within the threshold (configurable via store_settings.expiry_alert_days)

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_count(p_store_id uuid, p_expiry_days integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_expiry_days INTEGER;
  v_count INTEGER;
BEGIN
  -- Determine expiry threshold:
  -- 1. Use provided parameter if given
  -- 2. Otherwise, use store's configured setting
  -- 3. Fall back to default of 3 if neither exists
  IF p_expiry_days IS NOT NULL THEN
    v_expiry_days := p_expiry_days;
  ELSE
    SELECT COALESCE(ss.expiry_alert_days, 3)
    INTO v_expiry_days
    FROM business.store_settings ss
    WHERE ss.store_id = p_store_id;

    -- If store has no settings record, use default
    IF v_expiry_days IS NULL THEN
      v_expiry_days := 3;
    END IF;
  END IF;

  -- Count batches expiring within the threshold
  SELECT COUNT(*)::INT
  INTO v_count
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND bts.days_to_expiry >= 0
    AND bts.days_to_expiry <= v_expiry_days
    AND bts.completion_status != 'completed'
    AND bts.current_quantity > 0;

  RETURN COALESCE(v_count, 0);
END;
$function$;
