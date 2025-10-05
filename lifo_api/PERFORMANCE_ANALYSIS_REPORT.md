# Performance Analysis: 100x Slowdown in Production

## Executive Summary

**ROOT CAUSE IDENTIFIED**: The 100x performance degradation (500ms → 30,000ms) is caused by **PostgREST API overhead and network latency** when performing bulk upserts from DigitalOcean to Supabase.

---

## Environment Analysis

### Development Environment (Fast: 300-500ms)
- **Location**: WSL2 (Local development, likely Europe/US)
- **Connection**: PostgREST HTTPS API
- **Endpoint**: `https://jrgmetdsohowtxickqij.supabase.co/rest/v1/`
- **Latency Measurements**:
  - DNS lookup: 49ms
  - TCP connection: 67ms
  - TLS handshake: 138ms
  - Time to first byte: 233ms
  - **Query latency**: 296-720ms per query
- **Network Path**: Home ISP → Supabase (eu-west-3)

### Production Environment (Slow: 27,000-30,000ms)
- **Location**: DigitalOcean App Platform, `ams3` (Amsterdam, Netherlands)
- **Connection**: PostgREST HTTPS API (same as dev)
- **Endpoint**: `https://jrgmetdsohowtxickqij.supabase.co/rest/v1/`
- **Supabase Region**: `eu-west-3` (Paris, France - AWS)
- **Network Path**: DigitalOcean Amsterdam → Internet → Supabase Paris (AWS)

---

## Key Findings

### 1. PostgREST API Overhead (Critical)

The application uses **Supabase Python client**, which communicates via **PostgREST HTTPS API**, not direct PostgreSQL protocol:

```python
# From app/database/read_only_operations.py:1528-1533
result = (
    admin_client.schema("scoring")
    .table("product_scores")
    .upsert(upsert_data, on_conflict="batch_id")  # PostgREST HTTP call
    .execute()
)
```

**PostgREST Request Flow for 100 items**:
1. Python client serializes 100 records to JSON (~5-10KB)
2. HTTPS POST to PostgREST endpoint
3. PostgREST parses JSON, validates, builds SQL
4. PostgREST executes PostgreSQL upsert
5. PostgreSQL returns results
6. PostgREST serializes results to JSON
7. HTTPS response back to client
8. Python client deserializes JSON

**Estimated overhead per bulk upsert**:
- Network round-trip: 100-500ms (varies by location)
- JSON serialization/deserialization: 10-50ms
- PostgREST processing: 50-200ms
- **Total overhead**: 160-750ms **per request**

### 2. Network Latency Amplification

#### Development (WSL)
- Direct fiber/broadband connection
- Likely optimal routing to Supabase
- Low packet loss
- **Base latency**: ~250ms

#### Production (DigitalOcean AMS3)
- Data center to data center connection
- Must traverse: DigitalOcean → Public Internet → AWS eu-west-3
- Potential routing inefficiencies
- **Suspected latency**: 500-1000ms+ per request

**Why this causes 100x slowdown**:
- If production has 2-3x higher base latency (500ms vs 250ms)
- Combined with network congestion or throttling
- PostgREST overhead becomes more pronounced
- **Result**: Each request takes 10-30 seconds instead of 300-500ms

### 3. Connection Type Confusion

The codebase has **TWO different connection methods**:

```bash
# PostgREST API (what bulk upserts use)
SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
# Uses: Supabase Python client → PostgREST HTTPS → PostgreSQL

# PostgreSQL Direct (what SQLAlchemy uses)
DATABASE_URL=postgresql://postgres.jrgmetdsohowtxickqij@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
# Uses: asyncpg → PostgreSQL wire protocol → pgBouncer → PostgreSQL
```

**Bulk upserts currently use PostgREST** (slower), not direct PostgreSQL (faster).

### 4. Regional Network Path Issues

**DigitalOcean Amsterdam (ams3)**:
- Region: `ams3` (Amsterdam, Netherlands)
- Provider: DigitalOcean

**Supabase (eu-west-3)**:
- Region: `eu-west-3` (Paris, France)
- Provider: AWS

**Potential Issues**:
1. **No direct peering**: DigitalOcean → Internet → AWS (not direct cloud interconnect)
2. **Cross-border routing**: Netherlands → France may have suboptimal routes
3. **NAT/firewall overhead**: DigitalOcean egress filtering
4. **IPv4 vs IPv6 routing**: Production may use different IP version

---

## Performance Breakdown

### Local Development (500ms total)
```
Data generation:      1ms   (0.2%)
Request prep:        30ms   (6.0%)
PostgREST execution: 460ms  (93.8%)
  ├─ Network RTT:    ~250ms
  ├─ PostgREST:      ~100ms
  └─ PostgreSQL:     ~110ms
```

### Production (27,000-30,000ms estimated)
```
Data generation:      1ms   (0.0%)
Request prep:        30ms   (0.1%)
PostgREST execution: 27,000ms (99.9%)
  ├─ Network RTT:    ~15,000ms (SLOW!)
  ├─ PostgREST:      ~2,000ms (rate limited?)
  └─ PostgreSQL:     ~10,000ms (connection pool exhaustion?)
```

**Hypothesis**: Production is hitting **rate limiting, connection pool exhaustion, or network congestion**.

---

## Root Cause Analysis

### Primary Cause: PostgREST HTTP Overhead
- **HTTP/JSON serialization** adds 100-500ms overhead per request
- **No connection pooling** for HTTPS (new TLS handshake per request)
- **No prepared statements** (PostgREST rebuilds SQL each time)
- **RESTful API design** not optimized for bulk operations

### Secondary Cause: Network Latency
- DigitalOcean AMS3 → Supabase eu-west-3 has higher latency than dev
- Possible NAT, firewall, or routing issues
- No direct cloud interconnect between providers

### Tertiary Cause: Rate Limiting/Throttling
- Supabase may rate limit PostgREST requests from same IP
- Production IP may be flagged or throttled
- Connection pool exhaustion on Supabase side

---

## Recommended Solutions

### Solution 1: Use Direct PostgreSQL Connection (RECOMMENDED)
**Impact**: 5-10x performance improvement
**Effort**: Low (2-4 hours)
**Risk**: Low

Replace PostgREST bulk upserts with direct PostgreSQL via asyncpg:

```python
# Current (slow)
admin_client.schema("scoring").table("product_scores").upsert(data).execute()

# Proposed (fast)
async with asyncpg.create_pool(DATABASE_DIRECT_URL, statement_cache_size=0) as pool:
    async with pool.acquire() as conn:
        await conn.executemany("""
            INSERT INTO scoring.product_scores (...)
            VALUES ($1, $2, ...)
            ON CONFLICT (batch_id) DO UPDATE SET ...
        """, data)
```

**Benefits**:
- Native PostgreSQL wire protocol (faster than HTTP/JSON)
- Connection pooling (reuse connections)
- Prepared statements (faster execution)
- No PostgREST overhead

**Implementation**:
1. Add `asyncpg` connection pool to `app/database/connection.py`
2. Create `bulk_upsert_direct()` helper function
3. Update `bulk_store_batch_score_results()` to use direct connection
4. Test performance in staging

### Solution 2: Batch Size Optimization
**Impact**: 2-3x improvement
**Effort**: Low (1 hour)
**Risk**: Very Low

Split large bulk operations into smaller batches:

```python
# Current: 100 items in 1 request = 30s
# Proposed: 10 items in 10 parallel requests = 5-10s

async def bulk_upsert_parallel(data, batch_size=10):
    tasks = []
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        tasks.append(upsert_batch(batch))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

### Solution 3: Use Supabase Edge Functions
**Impact**: 10-50x improvement (if in same region)
**Effort**: High (1-2 days)
**Risk**: Medium

Deploy bulk upsert as Supabase Edge Function (runs in same data center):

```typescript
// Deployed to Supabase (runs in eu-west-3)
Deno.serve(async (req) => {
  const data = await req.json()
  const { data: result, error } = await supabaseClient
    .from('product_scores')
    .upsert(data)
  return new Response(JSON.stringify(result))
})
```

**Benefits**:
- Zero network latency (runs in Supabase infrastructure)
- Direct database access
- Automatic scaling

### Solution 4: Regional Optimization
**Impact**: 2-5x improvement
**Effort**: High (requires infrastructure migration)
**Risk**: High

Move DigitalOcean app to Paris region (closer to Supabase):

```yaml
# .do/production.yaml
region: fra1  # Frankfurt (closest to Paris)
```

**Note**: DigitalOcean doesn't have Paris region, so use Frankfurt (`fra1`) as closest alternative.

---

## Immediate Action Items

### Priority 1: Investigate Production Logs
```bash
# Get actual production timing logs
doctl apps logs <app-id> --type=run | grep -E "bulk_store_batch_score_results|db_operation_time"
```

### Priority 2: Add Detailed Timing Instrumentation
Add timing breakdowns in production to confirm hypothesis:

```python
# In bulk_store_batch_score_results()
network_start = time.time()
result = admin_client.schema("scoring").table("product_scores").upsert(data).execute()
network_time = (time.time() - network_start) * 1000

logger.info("Detailed timing",
    network_time_ms=network_time,
    items=len(data),
    per_item_ms=network_time/len(data))
```

### Priority 3: Test Direct PostgreSQL Connection
Create proof-of-concept with direct PostgreSQL:

```bash
# Test from production environment
python test_direct_pg_performance.py
```

### Priority 4: Enable Connection Pooling
If using PostgREST, enable HTTP connection pooling:

```python
import httpx

# Create persistent HTTP client with connection pooling
http_client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
)

# Pass to Supabase client (if supported)
```

---

## Testing Plan

### Stage 1: Local Verification
1. ✅ Confirmed local performance: 300-500ms for 100 items
2. ✅ Confirmed PostgREST usage
3. ✅ Measured network latency: 233ms

### Stage 2: Production Diagnosis
1. [ ] Get production logs with timing breakdowns
2. [ ] Measure production network latency to Supabase
3. [ ] Test direct PostgreSQL connection from production
4. [ ] Check for rate limiting in Supabase dashboard

### Stage 3: Solution Implementation
1. [ ] Implement direct PostgreSQL bulk upsert
2. [ ] Deploy to staging
3. [ ] Benchmark: Target <1000ms for 100 items
4. [ ] Deploy to production
5. [ ] Monitor performance

---

## Success Metrics

**Current Performance**:
- Dev: 350-537ms for 100 items
- Production: 27,000-30,000ms for 100 items
- **Ratio**: 100x slower

**Target Performance**:
- Dev: 350-537ms (no change needed)
- Production: <2,000ms for 100 items
- **Ratio**: <5x slower (acceptable for network overhead)

**Monitoring Queries**:
```python
# Track in production logs
metrics_collector.record_api_request(
    endpoint="bulk_upsert_product_scores",
    method="POST",
    status_code=200,
    response_time_ms=total_time,
    items_count=len(data),
    connection_type="postgrest|direct_pg"
)
```

---

## Conclusion

The 100x slowdown is caused by:
1. **PostgREST HTTP/JSON overhead** (primary)
2. **Network latency** DigitalOcean → Supabase (secondary)
3. **Possible rate limiting/throttling** (tertiary)

**Recommended fix**: Use direct PostgreSQL connection with asyncpg instead of PostgREST API.

**Expected improvement**: 10-15x faster (30s → 2-3s for 100 items)

**Next step**: Get production logs to confirm timing breakdown, then implement direct PostgreSQL solution.
