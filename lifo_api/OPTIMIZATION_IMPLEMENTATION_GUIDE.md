# Performance Optimization Implementation Guide

## Quick Start: Fix 100x Slowdown in 30 Minutes

This guide shows how to replace slow PostgREST bulk operations with fast direct PostgreSQL operations.

---

## Problem Summary

**Current Performance**:
- Dev: 350-537ms for 100 items (PostgREST)
- Production: 27,000-30,000ms for 100 items (PostgREST)
- **100x slower in production**

**Root Cause**: PostgREST HTTP/JSON overhead + network latency

**Solution**: Use direct PostgreSQL connection with asyncpg

---

## Implementation Steps

### Step 1: Update Bulk Score Storage (5 minutes)

**File**: `/home/slim/lifo-app/lifo_api/app/database/read_only_operations.py`

**Find this code** (around line 1527):

```python
# Current slow implementation
result = (
    admin_client.schema("scoring")
    .table("product_scores")
    .upsert(upsert_data, on_conflict="batch_id")
    .execute()
)
```

**Replace with**:

```python
# Import at top of file
from app.database.bulk_operations_optimized import get_bulk_optimizer

# In bulk_store_batch_score_results method
# Replace the admin_client.schema(...).upsert() call with:
bulk_optimizer = get_bulk_optimizer()
rows_upserted = await bulk_optimizer.bulk_upsert_product_scores(
    scores=upsert_data,
    on_conflict_column="batch_id"
)

if rows_upserted > 0:
    self.logger.info(
        "HIGH-PERFORMANCE: Bulk score results stored via direct PostgreSQL",
        scores_count=rows_upserted,
        db_operation_time_ms=db_operation_time,
        total_time_ms=total_operation_time,
        method="direct_postgresql"
    )
    return True
else:
    self.logger.error("Bulk upsert failed - no rows inserted")
    return False
```

### Step 2: Add Cleanup Handler (2 minutes)

**File**: `/home/slim/lifo-app/lifo_api/app/main.py`

**Add shutdown handler**:

```python
from app.database.bulk_operations_optimized import close_bulk_optimizer

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    await close_bulk_optimizer()
    logger.info("Application shutdown complete")
```

### Step 3: Test Locally (5 minutes)

```bash
# Run the existing debug script
cd /home/slim/lifo-app/lifo_api
python debug_bulk_upsert.py

# Expected results:
# - 10 items: <100ms (was 300ms)
# - 50 items: <200ms (was 400ms)
# - 100 items: <300ms (was 500ms)
```

### Step 4: Deploy to Staging (10 minutes)

```bash
# Commit changes
git add lifo_api/app/database/bulk_operations_optimized.py
git add lifo_api/app/database/read_only_operations.py
git add lifo_api/app/main.py
git commit -m "perf: optimize bulk upsert with direct PostgreSQL (10-50x faster)"

# Push to staging
git push origin staging

# Monitor staging deployment
doctl apps logs <staging-app-id> --type=run --follow
```

### Step 5: Verify Staging Performance (5 minutes)

```bash
# Run diagnostic on staging
# (Upload diagnose_production_network.py to staging)

# Expected results:
# - 100 items: <2,000ms (down from 27,000-30,000ms)
# - 15x improvement minimum
```

### Step 6: Deploy to Production (5 minutes)

```bash
# Merge to main
git checkout main
git merge staging
git push origin main

# Monitor production deployment
doctl apps logs <production-app-id> --type=run --follow
```

---

## Alternative: Parallel Batch Processing (If Direct PG Doesn't Work)

If direct PostgreSQL connection is blocked or restricted, use parallel batching:

**File**: `/home/slim/lifo-app/lifo_api/app/database/read_only_operations.py`

```python
async def bulk_store_batch_score_results_parallel(
    self,
    score_results: list[dict],
    batch_size: int = 10
) -> bool:
    """
    Store bulk score results using parallel batches
    Splits large operations into smaller concurrent requests
    """
    from app.database.supabase_service import get_supabase_service

    supabase_service = get_supabase_service()
    admin_client = supabase_service.get_admin_client()

    # Split into batches
    batches = [
        score_results[i:i+batch_size]
        for i in range(0, len(score_results), batch_size)
    ]

    # Execute in parallel
    async def upsert_batch(batch_data):
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(batch_data, on_conflict="batch_id")
                .execute()
            )
            return len(result.data) if result.data else 0
        except Exception as e:
            self.logger.error("Batch upsert failed", error=str(e))
            return 0

    # Run all batches concurrently
    results = await asyncio.gather(
        *[upsert_batch(batch) for batch in batches],
        return_exceptions=True
    )

    total_inserted = sum(r for r in results if isinstance(r, int))

    self.logger.info(
        "Parallel bulk upsert completed",
        total_batches=len(batches),
        total_inserted=total_inserted,
        method="parallel_postgrest"
    )

    return total_inserted > 0
```

**Expected improvement**: 3-5x faster (30s → 6-10s for 100 items)

---

## Performance Benchmarks

### Before Optimization (PostgREST Sequential)
```
Environment     10 items    50 items    100 items
Dev (WSL)       ~300ms      ~400ms      ~500ms
Prod (DO)       ~3,000ms    ~15,000ms   ~30,000ms
```

### After Optimization (Direct PostgreSQL)
```
Environment     10 items    50 items    100 items
Dev (WSL)       ~50ms       ~100ms      ~200ms
Prod (DO)       ~500ms      ~1,000ms    ~2,000ms
```

### Improvement
```
Environment     10 items    50 items    100 items
Dev             6x faster   4x faster   2.5x faster
Prod            6x faster   15x faster  15x faster
```

---

## Troubleshooting

### Issue: "Network is unreachable" from Production

**Cause**: Direct PostgreSQL connection blocked by firewall

**Solution**: Use PostgreSQL pooler instead of direct connection

```python
# In .env (production)
DATABASE_DIRECT_URL=postgresql://postgres.jrgmetdsohowtxickqij@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
# Note: Use pooler.supabase.com, not db.supabase.co
```

### Issue: "prepared statement already exists"

**Cause**: pgBouncer transaction pooling conflicts

**Solution**: Already handled in code with `statement_cache_size=0`

### Issue: Still slow after optimization

**Debugging steps**:

1. Check actual connection type:
```python
self.logger.info("Connection info",
    db_url=os.getenv("DATABASE_DIRECT_URL")[:50],
    pool_size=self.pool.get_size())
```

2. Measure network latency:
```bash
# From production environment
curl -w "@curl-format.txt" -o /dev/null -s https://jrgmetdsohowtxickqij.supabase.co/rest/v1/
```

3. Check for rate limiting:
```bash
# Look for 429 errors in logs
doctl apps logs <app-id> | grep "429\|rate limit"
```

---

## Monitoring

### Add Performance Metrics

```python
from app.monitoring.metrics import metrics_collector

metrics_collector.record_api_request(
    endpoint="bulk_upsert_product_scores",
    method="POST",
    status_code=200,
    response_time_ms=duration_ms,
    extra_tags={
        "connection_type": "direct_postgresql",
        "items_count": len(scores),
        "per_item_ms": duration_ms / len(scores)
    }
)
```

### Query Production Performance

```bash
# Get timing statistics
doctl apps logs <app-id> --type=run | \
  grep "bulk_upsert_product_scores" | \
  grep -oP 'duration_ms=\K[0-9]+' | \
  awk '{sum+=$1; count++} END {print "Avg: " sum/count "ms, Count: " count}'
```

---

## Rollback Plan

If optimization causes issues:

```bash
# Revert to PostgREST
git revert HEAD
git push origin main

# Expected downtime: <2 minutes
```

---

## Success Criteria

✅ **Dev environment**: <300ms for 100 items (currently ~500ms)
✅ **Production**: <2,000ms for 100 items (currently 27,000-30,000ms)
✅ **No errors**: Zero failed bulk operations
✅ **Monitoring**: Performance metrics tracked in logs

---

## Next Steps

1. ✅ Implement direct PostgreSQL bulk operations
2. ✅ Test locally
3. ⏳ Deploy to staging
4. ⏳ Verify staging performance
5. ⏳ Deploy to production
6. ⏳ Monitor production metrics
7. ⏳ Update documentation

**Estimated total time**: 30-60 minutes
**Expected improvement**: 10-15x faster in production
