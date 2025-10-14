-- Fix the ONE remaining RLS performance issue on batch_status_logs
-- This policy is re-evaluating auth.uid() per row instead of once per query

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view batch status logs" ON inventory.batch_status_logs;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Users can view batch status logs"
    ON inventory.batch_status_logs
    FOR SELECT
    USING (
        store_id IN (
            SELECT store_id
            FROM business.store_users
            WHERE user_id = (SELECT auth.uid())  -- Cached, evaluated ONCE per query
            AND is_active = true
        )
    );

-- Also ensure service_role bypasses RLS for bulk operations
GRANT ALL ON inventory.batch_status_logs TO service_role;
GRANT ALL ON inventory.batches TO service_role;
GRANT ALL ON inventory.products TO service_role;
GRANT ALL ON inventory.store_products TO service_role;
