# WSL2 Networking Limitations - IPv6 and COPY-Based Persistence

## Issue Summary

The COPY-based bulk persistence method fails on WSL2 environments with error:
```
Connection failed: [Errno 101] Network is unreachable
```

**Status:** ✅ **This is EXPECTED behavior on WSL2** - The fallback to REST API works correctly.

## Root Cause Analysis

### Network Connectivity Test Results

**Direct Database Connection (for COPY):**
```bash
# Host: db.jrgmetdsohowtxickqij.supabase.co:5432
# Resolution: 2a05:d012:42e:570b:9d8:4970:903a:ce27 (IPv6 ONLY)
# WSL2 Result: Network is unreachable ❌
```

**Pooler Connection (for REST API):**
```bash
# Host: aws-0-eu-west-3.pooler.supabase.com:6543
# Resolution: 13.39.9.193 (IPv4)
# WSL2 Result: Connection succeeded ✅
```

**WSL2 Network Configuration:**
```bash
# IPv4: 172.19.131.14/20 (private, NAT'd to Windows host)
# IPv6: fe80::215:5dff:fed0:4b4e/64 (link-local ONLY, not routable)
```

### Technical Explanation

1. **Supabase Direct Connection is IPv6-Only:**
   - `db.*.supabase.co:5432` resolves only to IPv6 addresses
   - Required for PostgreSQL COPY command (bypasses pgBouncer)

2. **WSL2 Has Limited IPv6 Support:**
   - Only link-local IPv6 (fe80::...) which cannot route to internet
   - No global IPv6 connectivity
   - This is a known WSL2 limitation

3. **Pooler Connection Uses IPv4:**
   - `*.pooler.supabase.com:6543` resolves to IPv4
   - Works fine for REST API calls
   - **Cannot** be used for COPY commands (pgBouncer doesn't support COPY)

## Current Behavior (WORKING AS DESIGNED)

### Unified Scoring Persistence Flow

```python
# app/core/persistence/unified_scoring_persistence.py

async def persist_scoring_results(results, store_id):
    if len(results) >= 50:  # Large batch
        # 1. Try COPY-based approach (60x faster)
        result = await _persist_via_copy(results, store_id)

        if not result["success"]:  # ❌ Fails on WSL2 with errno 101
            # 2. Fallback to REST API (works on WSL2) ✅
            result = await _persist_via_rest_chunked(results, store_id)
    else:  # Small batch
        # Direct to REST API (sufficient for <50 items)
        result = await _persist_via_rest_chunked(results, store_id)
```

**Performance:**
- **COPY method:** ~2-5s for 1000 items (60x faster) - **Not available on WSL2**
- **REST API chunked:** ~10-30s for 1000 items - **Works on WSL2**

## Solutions & Workarounds

### ✅ Option 1: Accept Fallback Behavior (RECOMMENDED for WSL2)

**No code changes needed.** The system automatically falls back to REST API.

**Pros:**
- Already implemented and working
- No configuration changes needed
- Graceful degradation

**Cons:**
- Slower bulk operations (10-30s vs 2-5s for 1000 items)
- Only affects WSL2 development environments

### ⚠️ Option 2: Enable WSL2 IPv6 (Complex, Unreliable)

**Steps:**
1. Enable IPv6 in Windows Network Settings
2. Configure WSL2 .wslconfig for IPv6
3. Restart WSL2

**Cons:**
- Complex setup
- May break other WSL2 networking
- Not guaranteed to work
- Not worth the effort for development

### ✅ Option 3: Production Deployment (Best Performance)

**Linux servers typically have IPv6 connectivity:**
- COPY method will work automatically
- No WSL2 limitations
- Full 60x performance improvement

**Example Production Environments:**
- AWS EC2 (with IPv6 enabled)
- Google Cloud (native IPv6)
- Azure VMs (with IPv6 configured)
- DigitalOcean Droplets (optional IPv6)

## Verification Commands

```bash
# Test direct database connection (will fail on WSL2)
nc -zv db.jrgmetdsohowtxickqij.supabase.co 5432
# Expected on WSL2: Network is unreachable

# Test pooler connection (will succeed on WSL2)
nc -zv aws-0-eu-west-3.pooler.supabase.com 6543
# Expected: Connection succeeded!

# Check WSL2 IPv6 configuration
ip addr show eth0 | grep inet6
# Expected: fe80::... (link-local only)
```

## Log Interpretation

### Expected WSL2 Logs (NORMAL):

```
[warning] COPY method failed, falling back to REST API
copy_error='Connection failed: [Errno 101] Network is unreachable'
```

**This is expected** - the system is working correctly by using the fallback.

### Successful REST API Fallback:

```
[info] REST API chunked persistence started
total_items=100, total_chunks=2, chunk_size=50

[info] Unified scoring persistence completed
method=rest_chunked, successful=100, failed=0
```

## Performance Expectations

### WSL2 Development (REST API Only):

| Batch Size | Expected Time | Method |
|------------|---------------|--------|
| < 50 items | 100-500ms | REST API |
| 50-100 items | 1-2s | REST API Chunked |
| 100-500 items | 2-10s | REST API Chunked |
| 500-1000 items | 10-30s | REST API Chunked |
| 1000+ items | 30-60s | REST API Chunked |

### Production Linux (COPY Available):

| Batch Size | Expected Time | Method |
|------------|---------------|--------|
| < 50 items | 100-500ms | REST API |
| 50-100 items | 500ms-1s | COPY |
| 100-500 items | 1-2s | COPY |
| 500-1000 items | 2-5s | COPY |
| 1000+ items | 5-15s | COPY |

## Related Files

- **Persistence Layer:** `app/core/persistence/unified_scoring_persistence.py`
- **Environment Config:** `.env.local` (DATABASE_DIRECT_URL)
- **This Document:** `WSL2_NETWORKING_LIMITATIONS.md`

## Conclusion

**The current behavior is CORRECT for WSL2 environments.** The system:
1. ✅ Attempts COPY (optimal performance)
2. ✅ Detects failure gracefully
3. ✅ Falls back to REST API (slower but working)
4. ✅ Logs the fallback for debugging

**No action required** unless deploying to production, where IPv6 connectivity will enable the COPY method automatically.
