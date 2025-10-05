# Foreign Key Validation Performance Analysis

## Problem Summary

**Production Issue:** Foreign key constraint validation on `scoring.product_scores.batch_id → inventory.batches.batch_id` is taking **27,000-30,000ms** (27-30 seconds) per 100-item chunk in production, compared to **350-537ms** in development (100x slower).

**Impact:**
- Batch creation hitting 30-second statement timeout
- 270ms per record FK validation overhead (should be <5ms)
- Production CSV uploads failing or taking 5-10 minutes
- Development uploads complete in 5-10 seconds

---

## Root Cause Hypotheses (Ranked by Likelihood)

### 1. **INDEX BLOAT ON batches_pkey** (90% Confidence)
**Why this is likely the culprit:**

Production databases with 14,456 rows in `batches` table can experience significant index bloat over time due to:
- Frequent INSERT/UPDATE/DELETE operations
- VACUUM not running or not effective
- Dead tuples accumulating in index pages
- Index page fragmentation

**Expected Behavior:**
- Primary key index lookup: **<1ms** per lookup
- 100 FK validations: **<100ms total**

**Actual Production Behavior:**
- Primary key index lookup: **~270ms** per lookup
- 100 FK validations: **27,000ms total**

**Evidence Supporting This:**
- Your code shows direct database connection with statement_cache_size=0 (rules out prepared statement caching)
- Error message is "statement timeout" not "deadlock" (rules out lock contention)
- Development works fine (fresh database without bloat)
- Production slows down over time (characteristic of bloat)

**Diagnostic:**
```sql
-- Check index bloat
SELECT
    pg_size_pretty(pg_relation_size('inventory.batches_pkey')) as index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    n_dead_tup as dead_tuples
FROM pg_stat_user_indexes ui
JOIN pg_stat_user_tables ut ON ui.relid = ut.relid
WHERE ui.indexrelname = 'batches_pkey';
```

**Fix:**
```sql
-- Rebuild the primary key index (no downtime with CONCURRENTLY)
REINDEX INDEX CONCURRENTLY inventory.batches_pkey;

-- Follow up with vacuum
VACUUM ANALYZE inventory.batches;
```

---

### 2. **TABLE BLOAT WITH DEAD TUPLES** (80% Confidence)
**Why this matters:**

Even if the index is healthy, the table itself may have excessive dead tuples causing:
- Sequential scans instead of index scans
- Poor cache efficiency
- Increased I/O operations

**Expected Dead Tuple Ratio:** <5% of total tuples
**Critical Threshold:** >20% indicates urgent maintenance needed

**Diagnostic:**
```sql
-- Check table bloat
SELECT
    schemaname,
    relname,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'inventory' AND relname = 'batches';
```

**Fix:**
```sql
-- Full vacuum (may require maintenance window)
VACUUM (FULL, ANALYZE, VERBOSE) inventory.batches;

-- Or concurrent vacuum (no locks)
VACUUM (ANALYZE, VERBOSE) inventory.batches;
```

---

### 3. **OUTDATED TABLE STATISTICS** (70% Confidence)
**Why this causes problems:**

PostgreSQL query planner relies on statistics to choose optimal execution plans. Outdated statistics can cause:
- Query planner choosing sequential scans over index scans
- Incorrect row count estimates
- Poor join strategies

**When Statistics Become Stale:**
- After bulk inserts (like CSV uploads)
- After large batch deletions
- When autovacuum is disabled or delayed
- In high-write tables with insufficient analyze frequency

**Diagnostic:**
```sql
-- Check when statistics were last updated
SELECT
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze,
    analyze_count,
    autoanalyze_count,
    n_mod_since_analyze as rows_modified_since_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'inventory' AND tablename = 'batches';
```

**Fix:**
```sql
-- Update statistics immediately
ANALYZE VERBOSE inventory.batches;
ANALYZE VERBOSE inventory.products;
ANALYZE VERBOSE scoring.product_scores;
```

---

### 4. **MISSING OR CORRUPT INDEX** (40% Confidence)
**Less likely, but possible:**

While the schema shows a primary key exists, the index could be:
- Corrupted due to crash or hardware failure
- Not actually being used by the query planner
- Missing entirely (though constraint would fail)

**Diagnostic:**
```sql
-- Verify index exists and is valid
SELECT
    indexname,
    indexdef,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexname)
WHERE schemaname = 'inventory'
    AND tablename = 'batches'
    AND indexdef LIKE '%batch_id%';
```

**Fix:**
```sql
-- Recreate index if missing or corrupt
DROP INDEX IF EXISTS inventory.batches_pkey;
ALTER TABLE inventory.batches ADD PRIMARY KEY (batch_id);
```

---

### 5. **PGBOUNCER TRANSACTION POOLING ISSUES** (20% Confidence)
**Less likely because:**

Your code already handles this with:
- `statement_cache_size=0`
- `prepared_statement_cache_size=0`
- `plan_cache_mode=force_generic_plan`
- `query_cache_size=0`

However, FK constraint validation uses **internal queries** that might still use prepared statements.

**Diagnostic:**
```sql
-- Check for prepared statements
SELECT name, statement, prepare_time
FROM pg_prepared_statements
ORDER BY prepare_time DESC;

-- Check pgBouncer pool mode
SHOW pool_mode; -- Should be 'transaction' or 'session'
```

**Fix:**
```sql
-- If using transaction pooling, consider temporary session pooling
-- Or use direct connection for bulk operations (you already do this)
```

---

### 6. **LOCK CONTENTION** (10% Confidence)
**Why this is unlikely:**

- Error is "statement timeout" not "deadlock detected"
- No evidence of concurrent writes in logs
- Development environment (lower concurrency) also uses same FK

**Diagnostic:**
```sql
-- Check for blocking locks
SELECT
    locktype,
    relation::regclass,
    mode,
    granted,
    pid,
    query
FROM pg_locks l
JOIN pg_stat_activity a USING (pid)
WHERE relation = 'inventory.batches'::regclass;
```

---

## Why Development is Fast vs Production is Slow

| Factor | Development | Production | Impact |
|--------|-------------|------------|--------|
| **Data Volume** | <100 batches | 14,456 batches | Minimal (index should scale) |
| **Index Bloat** | Fresh database | Months of operations | **CRITICAL** |
| **Dead Tuples** | 0% | Unknown (likely 10-30%) | **HIGH** |
| **Statistics** | Fresh ANALYZE | May be stale | **MEDIUM** |
| **Vacuum History** | N/A | Possibly never | **CRITICAL** |
| **Cache Warming** | Cold cache | Possibly cold | **LOW** |

---

## Recommended Immediate Actions (Priority Order)

### **ACTION 1: Run Diagnostic Script** (5 minutes)
```bash
# On production database
psql $DATABASE_URL -f /home/slim/lifo-app/diagnose_fk_performance.sql > diagnostic_output.txt
```

This will identify the exact root cause.

---

### **ACTION 2: Emergency Fix - Update Statistics** (2 minutes, NO DOWNTIME)
```sql
-- Run immediately - safe in production
ANALYZE VERBOSE inventory.batches;
ANALYZE VERBOSE inventory.products;
ANALYZE VERBOSE scoring.product_scores;
```

**Expected Impact:** 20-40% improvement if statistics were stale

---

### **ACTION 3: Vacuum Tables** (5-10 minutes, NO DOWNTIME)
```sql
-- Safe to run in production (no locks)
VACUUM (ANALYZE, VERBOSE) inventory.batches;
VACUUM (ANALYZE, VERBOSE) inventory.products;
VACUUM (ANALYZE, VERBOSE) scoring.product_scores;
```

**Expected Impact:** 30-50% improvement if dead tuples >10%

---

### **ACTION 4: Rebuild Primary Key Index** (10-20 minutes, NO DOWNTIME)
```sql
-- Use CONCURRENTLY to avoid locks
REINDEX INDEX CONCURRENTLY inventory.batches_pkey;
```

**Expected Impact:** 60-90% improvement if index is bloated

⚠️ **CAUTION:** This creates a new index alongside the old one, then swaps them. Requires 2x disk space temporarily.

---

### **ACTION 5: Monitor and Verify** (Ongoing)
```sql
-- Check performance improvement
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1 FROM inventory.batches WHERE batch_id = :batch_id;

-- Monitor FK validation time in logs
-- Should be <1ms per lookup after fixes
```

---

## Long-Term Solutions

### **1. Automated Maintenance Schedule**
```sql
-- Enable autovacuum (should be on by default)
ALTER TABLE inventory.batches SET (autovacuum_enabled = true);
ALTER TABLE inventory.batches SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE inventory.batches SET (autovacuum_analyze_scale_factor = 0.05);

-- Schedule weekly REINDEX
-- Use pg_cron or external scheduler
SELECT cron.schedule(
    'reindex-batches-weekly',
    '0 2 * * 0',  -- Sunday 2 AM
    'REINDEX INDEX CONCURRENTLY inventory.batches_pkey;'
);
```

### **2. Disable FK Constraint During Bulk Inserts** (Advanced)
```sql
-- DANGEROUS: Only for controlled bulk operations
-- Requires application-level validation

-- Before bulk insert
ALTER TABLE scoring.product_scores
    DROP CONSTRAINT product_scores_batch_id_fkey;

-- After bulk insert completes
ALTER TABLE scoring.product_scores
    ADD CONSTRAINT product_scores_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES inventory.batches(batch_id);
```

⚠️ **NOT RECOMMENDED** - Loss of data integrity protection

### **3. Deferred Constraint Validation**
```sql
-- Change FK to be deferrable (checked at COMMIT instead of per-row)
ALTER TABLE scoring.product_scores
    DROP CONSTRAINT product_scores_batch_id_fkey;

ALTER TABLE scoring.product_scores
    ADD CONSTRAINT product_scores_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES inventory.batches(batch_id)
    DEFERRABLE INITIALLY DEFERRED;
```

**Expected Impact:** 70-90% improvement during bulk inserts

### **4. Optimize Bulk Insert Code** (Already Implemented)
Your code already does this correctly:
- Uses direct database connection (bypasses pgBouncer)
- Disables prepared statements
- Chunks operations (100 items)
- Single transaction per chunk

**Potential improvement:**
```python
# In _bulk_insert_batches_optimized, consider:
# 1. Pre-validate all batch_ids exist before INSERT
# 2. Use COPY instead of INSERT VALUES (10x faster)
# 3. Defer FK validation to COMMIT
```

---

## Performance Benchmarks (Expected)

| Scenario | Current Production | After Statistics | After Vacuum | After Reindex |
|----------|-------------------|------------------|--------------|---------------|
| 100 items | 27,000ms | ~18,000ms | ~8,000ms | **500-800ms** |
| Per-item | 270ms | ~180ms | ~80ms | **5-8ms** |
| Success Rate | Timeouts | Partial | Good | **Excellent** |

---

## Testing Plan

### **1. Baseline Measurement (Before Fixes)**
```bash
# Time a 100-item CSV upload
time curl -X POST https://your-api/upload-csv \
    -F "file=@test_100_items.csv"

# Expected: 30+ seconds, possible timeout
```

### **2. After Each Fix**
```bash
# Re-run same test
time curl -X POST https://your-api/upload-csv \
    -F "file=@test_100_items.csv"

# Expected improvements:
# After ANALYZE: 20-25 seconds
# After VACUUM: 10-15 seconds
# After REINDEX: 3-5 seconds ✅
```

### **3. Verify No Regression**
```bash
# Test different batch sizes
# 10 items: <1 second
# 50 items: <3 seconds
# 100 items: <5 seconds
# 500 items: <20 seconds
```

---

## Monitoring Queries for Production

### **Daily Health Check**
```sql
-- Run daily to catch bloat early
SELECT
    'batches' as table_name,
    pg_size_pretty(pg_total_relation_size('inventory.batches')) as total_size,
    (SELECT COUNT(*) FROM inventory.batches) as row_count,
    (SELECT n_dead_tup FROM pg_stat_user_tables
     WHERE schemaname='inventory' AND relname='batches') as dead_tuples,
    (SELECT ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2)
     FROM pg_stat_user_tables
     WHERE schemaname='inventory' AND relname='batches') as dead_pct,
    (SELECT last_vacuum FROM pg_stat_user_tables
     WHERE schemaname='inventory' AND relname='batches') as last_vacuum,
    CASE
        WHEN (SELECT n_dead_tup FROM pg_stat_user_tables
              WHERE schemaname='inventory' AND relname='batches') > 1000
        THEN '⚠️ VACUUM NEEDED'
        ELSE '✅ OK'
    END as health_status;
```

### **Alert Thresholds**
- Dead tuples >1000: Run VACUUM
- Dead tuple % >10%: Run VACUUM ANALYZE
- Dead tuple % >30%: Run VACUUM FULL (maintenance window)
- Last vacuum >7 days: Investigate autovacuum
- Index scans = 0: Index not being used (investigate)

---

## Critical Files and Line Numbers

### **Bulk Insert Code** (`batch_creation_service_optimized.py`)
- **Line 665-714**: Bulk batch insert - FK validation happens here
- **Line 228-316**: Chunk processing with transaction boundaries
- **Line 606-715**: `_bulk_insert_batches_optimized()` method

### **Database Connection** (`connection.py`)
- **Line 147-169**: Production connection settings
- **Line 200-244**: Direct database connection (bypasses pgBouncer)
- **Line 149**: `command_timeout: 30s` - statement timeout setting

### **Schema** (`models.py`)
- **Line 340-347**: FK constraint definition on product_scores.batch_id

---

## Next Steps

1. **Immediate (Today):**
   - Run diagnostic script: `/home/slim/lifo-app/diagnose_fk_performance.sql`
   - Run `ANALYZE` on batches table (2 minutes, safe)
   - Review diagnostic output to confirm hypothesis

2. **Short-term (This Week):**
   - Run `VACUUM ANALYZE` on batches table (10 minutes)
   - `REINDEX` batches_pkey if bloated (20 minutes)
   - Verify 90%+ performance improvement

3. **Long-term (This Month):**
   - Implement automated maintenance schedule
   - Monitor dead tuple accumulation weekly
   - Consider deferred FK constraint for bulk operations
   - Add monitoring alerts for index health

---

## Questions to Answer with Diagnostic Script

1. ✅ Is batches_pkey index bloated? (Check index size vs row count)
2. ✅ What % of batches table is dead tuples? (Should be <5%)
3. ✅ When was last VACUUM/ANALYZE? (Should be recent)
4. ✅ Is query planner using the index? (Check EXPLAIN output)
5. ✅ Are there prepared statement issues? (Check pg_prepared_statements)
6. ✅ Any lock contention on batches? (Check pg_locks)
7. ✅ Are constraint triggers slowing things down? (Check pg_trigger)

Run the diagnostic script and share the output for precise recommendations.
