-- Migration: Fix scoring trigger to use efficient statement-level refresh
-- Version: 20251007_fix_scoring_trigger_statement_level
-- 
-- Problem: The existing trigger fires FOR EACH ROW when scores are inserted,
-- causing 50+ unnecessary trigger executions during bulk scoring operations.
-- The trigger also uses async notifications that have no listener.
--
-- Solution: Change to FOR EACH STATEMENT to fire once per bulk operation,
-- and use synchronous refresh for consistency.
--
-- Performance Impact:
-- - Before: 50 triggers × async notify (no refresh happens) = 0ms but broken
-- - After: 1 trigger × sync refresh = ~300ms overhead but consistent data
--
-- Migration created: 2025-10-07

-- ==============================================================================
-- STEP 1: Drop the broken per-row async trigger
-- ==============================================================================

DROP TRIGGER IF EXISTS refresh_todos_on_scoring ON scoring.product_scores;

-- ==============================================================================
-- STEP 2: Create efficient statement-level sync trigger
-- ==============================================================================

CREATE TRIGGER refresh_todos_on_scoring_statement
    AFTER INSERT OR UPDATE ON scoring.product_scores
    FOR EACH STATEMENT  -- ✅ Fires ONCE per bulk operation (not per row)
    EXECUTE FUNCTION inventory.trigger_todo_states_refresh_sync();

-- ==============================================================================
-- STEP 3: Add documentation
-- ==============================================================================

COMMENT ON TRIGGER refresh_todos_on_scoring_statement ON scoring.product_scores IS 
'Refreshes batch_todo_states materialized view once per scoring operation.
Uses statement-level trigger (not row-level) for performance during bulk inserts.
Typical bulk scoring: 50 rows = 1 refresh (~300ms) instead of 50 refreshes (~15s).
Uses synchronous refresh for data consistency.';

-- ==============================================================================
-- STEP 4: Verify trigger setup
-- ==============================================================================

-- Check all triggers on scoring.product_scores
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_orientation,  -- Should be 'STATEMENT'
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'scoring' 
  AND event_object_table = 'product_scores'
ORDER BY trigger_name;

-- Expected result:
-- trigger_name: refresh_todos_on_scoring_statement
-- event_manipulation: INSERT or UPDATE
-- action_timing: AFTER
-- action_orientation: STATEMENT (not ROW!)
-- action_statement: EXECUTE FUNCTION inventory.trigger_todo_states_refresh_sync()

-- ==============================================================================
-- OPTIONAL: Test the trigger (uncomment to test)
-- ==============================================================================

/*
-- Test 1: Insert a single score (should refresh once)
-- Test 2: Insert 10 scores in bulk (should still refresh only once)

BEGIN;

-- Get initial refresh time
SELECT NOW() as before_test;

-- Bulk insert test scores
INSERT INTO scoring.product_scores (
    batch_id, 
    composite_score, 
    urgency_level, 
    recommendation,
    created_at
)
SELECT 
    batch_id,
    0.75,
    'high',
    'discount',
    NOW()
FROM inventory.batches
LIMIT 10
ON CONFLICT (batch_id) DO UPDATE SET
    composite_score = EXCLUDED.composite_score,
    updated_at = NOW();

-- Check that view was refreshed (should show recent timestamp)
SELECT 
    MAX(view_refreshed_at) as last_refresh,
    COUNT(*) as total_batches
FROM inventory.batch_todo_states;

ROLLBACK;  -- Don't actually save test data
*/

-- ==============================================================================
-- SUMMARY OF COMPLETE TRIGGER ARCHITECTURE
-- ==============================================================================

-- After this migration, your complete trigger setup should be:
--
-- 1. SINGLE-ROW OPERATIONS (row-level sync triggers - fine for infrequent ops)
--    ✅ refresh_todos_on_batch_update - fires on batch quantity/status changes
--    ✅ refresh_todos_on_batch_insert - fires when new batches created
--    ✅ refresh_todos_on_batch_delete - fires when batches deleted
--    ✅ refresh_todos_on_action_sync - fires on batch actions (sold, donated, etc)
--
-- 2. BULK OPERATIONS (statement-level sync trigger - efficient)
--    ✅ refresh_todos_on_scoring_statement - fires once per bulk scoring operation
--
-- All triggers now use inventory.trigger_todo_states_refresh_sync() for consistency
-- except this is the only statement-level trigger for performance optimization.