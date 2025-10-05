-- ============================================================================
-- FOREIGN KEY PERFORMANCE DIAGNOSTIC SCRIPT
-- Diagnose 27-30 second foreign key validation delays in production
-- ============================================================================

-- Run this script on your PRODUCTION database to diagnose the FK bottleneck
-- Compare results with development database for discrepancies

-- ============================================================================
-- PART 1: FOREIGN KEY CONSTRAINT ANALYSIS
-- ============================================================================

\echo '\n=== PART 1: FOREIGN KEY CONSTRAINTS ON product_scores ==='
\echo 'Check all FK constraints and their configuration...\n'

-- List all FK constraints on product_scores table
SELECT
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule,
    -- Check if constraint is deferrable
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'product_scores'
    AND tc.table_schema = 'scoring'
ORDER BY tc.constraint_name;

-- ============================================================================
-- PART 2: INDEX ANALYSIS ON FOREIGN KEY COLUMNS
-- ============================================================================

\echo '\n=== PART 2: INDEX ANALYSIS ON REFERENCED TABLES ==='
\echo 'Critical: Check if batches.batch_id has proper indexes...\n'

-- Check indexes on batches.batch_id (referenced column)
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef,
    -- Index size
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size,
    -- Index usage statistics
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    -- Bloat indicators
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'RARELY_USED'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_indexes
JOIN pg_stat_user_indexes USING (schemaname, tablename, indexname)
WHERE schemaname = 'inventory'
    AND tablename = 'batches'
    AND (indexdef LIKE '%batch_id%' OR indexname LIKE '%pkey%')
ORDER BY idx_scan DESC;

-- Check if the primary key index is properly defined
SELECT
    i.relname as index_name,
    t.relname as table_name,
    a.attname as column_name,
    ix.indisunique as is_unique,
    ix.indisprimary as is_primary,
    ix.indisclustered as is_clustered,
    pg_size_pretty(pg_relation_size(i.oid)) as index_size,
    am.amname as index_type
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am am ON am.oid = i.relam
WHERE n.nspname = 'inventory'
    AND t.relname = 'batches'
    AND a.attname = 'batch_id'
ORDER BY ix.indisprimary DESC;

-- ============================================================================
-- PART 3: TABLE BLOAT ANALYSIS
-- ============================================================================

\echo '\n=== PART 3: TABLE BLOAT AND DEAD TUPLES ==='
\echo 'Check if batches table has excessive bloat causing sequential scans...\n'

-- Check table statistics and bloat
SELECT
    schemaname,
    relname as table_name,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
WHERE schemaname IN ('inventory', 'scoring')
    AND relname IN ('batches', 'product_scores', 'products')
ORDER BY dead_tuple_percent DESC;

-- Table size and bloat estimation
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname IN ('inventory', 'scoring')
    AND tablename IN ('batches', 'product_scores', 'products')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- PART 4: QUERY PLAN ANALYSIS
-- ============================================================================

\echo '\n=== PART 4: EXPLAIN PLAN FOR FK VALIDATION ==='
\echo 'Simulate what PostgreSQL does when validating FK constraint...\n'

-- Simulate FK validation query (what PostgreSQL runs internally)
-- This is the query that takes 27-30 seconds in production
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING)
SELECT 1
FROM inventory.batches
WHERE batch_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Test with a real batch_id from your production data
-- Replace with an actual batch_id
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING)
SELECT 1
FROM inventory.batches
WHERE batch_id IN (
    SELECT batch_id FROM inventory.batches LIMIT 100
);

-- ============================================================================
-- PART 5: LOCK ANALYSIS
-- ============================================================================

\echo '\n=== PART 5: LOCK CONTENTION ANALYSIS ==='
\echo 'Check for lock contention on batches table...\n'

-- Check current locks on batches table
SELECT
    locktype,
    database,
    relation::regclass,
    page,
    tuple,
    virtualxid,
    transactionid,
    mode,
    granted,
    fastpath
FROM pg_locks
WHERE relation = 'inventory.batches'::regclass
ORDER BY granted, mode;

-- Check blocking queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application,
    blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================================================
-- PART 6: CONSTRAINT TRIGGERS
-- ============================================================================

\echo '\n=== PART 6: CONSTRAINT TRIGGERS ==='
\echo 'Check for triggers that might slow down FK validation...\n'

-- List all triggers on batches and product_scores tables
SELECT
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE t.tgtype::integer & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END as trigger_level,
    CASE t.tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE
        WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT '
        ELSE ''
    END ||
    CASE
        WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE '
        ELSE ''
    END ||
    CASE
        WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE '
        ELSE ''
    END as trigger_event,
    t.tgenabled as is_enabled,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname IN ('inventory', 'scoring')
    AND c.relname IN ('batches', 'product_scores')
    AND NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname;

-- ============================================================================
-- PART 7: CONNECTION POOLING ISSUES (PGBOUNCER)
-- ============================================================================

\echo '\n=== PART 7: PGBOUNCER COMPATIBILITY CHECK ==='
\echo 'Check for prepared statement issues...\n'

-- Check for prepared statements (problematic with pgBouncer transaction mode)
SELECT
    name,
    statement,
    prepare_time,
    parameter_types,
    from_sql
FROM pg_prepared_statements
ORDER BY prepare_time DESC
LIMIT 20;

-- Check current database settings affecting FK checks
SELECT
    name,
    setting,
    unit,
    source,
    sourcefile
FROM pg_settings
WHERE name IN (
    'statement_timeout',
    'lock_timeout',
    'idle_in_transaction_session_timeout',
    'constraint_exclusion',
    'enable_seqscan',
    'enable_indexscan',
    'enable_bitmapscan',
    'random_page_cost',
    'seq_page_cost',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'max_parallel_workers_per_gather'
)
ORDER BY name;

-- ============================================================================
-- PART 8: BULK INSERT PERFORMANCE SIMULATION
-- ============================================================================

\echo '\n=== PART 8: BULK INSERT SIMULATION ==='
\echo 'Test FK validation overhead with bulk operations...\n'

-- Create a test to measure FK validation overhead
-- This will show the exact time spent on FK validation
DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    fk_validation_time interval;
BEGIN
    -- Time a simple FK validation lookup
    start_time := clock_timestamp();

    -- Simulate what happens during bulk insert with FK validation
    PERFORM 1 FROM inventory.batches WHERE batch_id = gen_random_uuid();

    end_time := clock_timestamp();
    fk_validation_time := end_time - start_time;

    RAISE NOTICE 'Single FK validation time: %', fk_validation_time;
END $$;

-- ============================================================================
-- PART 9: RECOMMENDED FIXES
-- ============================================================================

\echo '\n=== PART 9: RECOMMENDED FIXES ==='
\echo 'Based on the diagnostic results, here are potential fixes...\n'

-- Check if batch_id index needs rebuilding
SELECT
    'Index may need rebuilding' as recommendation,
    indexrelname as index_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    CASE
        WHEN idx_scan = 0 THEN 'CRITICAL: Index never used - possible bloat'
        WHEN idx_scan < 100 THEN 'WARNING: Index rarely used'
        ELSE 'OK: Index actively used'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'inventory'
    AND tablename = 'batches'
    AND indexrelname LIKE '%pkey%';

-- ============================================================================
-- RECOMMENDED SQL COMMANDS FOR FIXES
-- ============================================================================

\echo '\n=== RECOMMENDED FIXES (DO NOT RUN YET - REVIEW FIRST) ===\n'

-- FIX 1: Rebuild primary key index if bloated
-- REINDEX INDEX CONCURRENTLY inventory.batches_pkey;

-- FIX 2: Vacuum batches table to remove dead tuples
-- VACUUM (VERBOSE, ANALYZE) inventory.batches;

-- FIX 3: Update table statistics
-- ANALYZE inventory.batches;

-- FIX 4: Temporarily disable FK constraint (DANGEROUS - only for testing)
-- ALTER TABLE scoring.product_scores DROP CONSTRAINT IF EXISTS product_scores_batch_id_fkey;
-- ALTER TABLE scoring.product_scores ADD CONSTRAINT product_scores_batch_id_fkey
--     FOREIGN KEY (batch_id) REFERENCES inventory.batches(batch_id) NOT VALID;

-- FIX 5: Validate constraint in background (after NOT VALID)
-- ALTER TABLE scoring.product_scores VALIDATE CONSTRAINT product_scores_batch_id_fkey;

-- FIX 6: Add explicit index on FK column (usually not needed for PKs, but can help)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_batch_id_fk_validation
--     ON inventory.batches (batch_id) WHERE batch_id IS NOT NULL;

-- ============================================================================
-- SUMMARY QUERY
-- ============================================================================

\echo '\n=== DIAGNOSTIC SUMMARY ==='

SELECT
    'batches table' as object,
    (SELECT COUNT(*) FROM inventory.batches) as row_count,
    (SELECT COUNT(*) FROM inventory.batches WHERE batch_id IS NULL) as null_batch_ids,
    (SELECT pg_size_pretty(pg_total_relation_size('inventory.batches'))) as total_size,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'inventory' AND tablename = 'batches') as index_count,
    (SELECT n_dead_tup FROM pg_stat_user_tables WHERE schemaname = 'inventory' AND relname = 'batches') as dead_tuples,
    (SELECT last_vacuum FROM pg_stat_user_tables WHERE schemaname = 'inventory' AND relname = 'batches') as last_vacuum,
    (SELECT last_analyze FROM pg_stat_user_tables WHERE schemaname = 'inventory' AND relname = 'batches') as last_analyze;

\echo '\n=== END OF DIAGNOSTIC SCRIPT ===\n'
\echo 'Review the output above to identify the root cause of FK validation delays.\n'
\echo 'Compare production results with development database results.\n'
