-- Fix catastrophic performance issue with batch_actions trigger
-- Problem: FOR EACH ROW trigger refreshes materialized view 14,406 times
-- Solution: Use FOR EACH STATEMENT (refreshes once per INSERT)

BEGIN;

-- Drop the existing row-level trigger
DROP TRIGGER IF EXISTS refresh_todos_on_action_sync ON inventory.batch_actions;

-- Create a statement-level trigger (fires once per INSERT/UPDATE/DELETE)
-- This will refresh the view ONCE instead of 14,406 times
CREATE TRIGGER refresh_todos_on_action_sync
AFTER INSERT OR DELETE OR UPDATE
ON inventory.batch_actions
FOR EACH STATEMENT  -- KEY CHANGE: statement-level instead of row-level
EXECUTE FUNCTION inventory.trigger_todo_states_refresh_sync();

COMMIT;

-- Performance impact:
-- Before: 14,406 materialized view refreshes (120+ seconds, timeout)
-- After: 1 materialized view refresh (<1 second)
