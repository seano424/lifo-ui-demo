# 🔧 Bulk Scoring Endpoint Fix Guide

## 🎯 Problem Summary

The `/api/v1/scoring/batch/{store_id}/bulk` endpoint was failing due to:

1. **Complex multi-tier persistence architecture** with multiple failure points
2. **Database connection issues** between WSL/Windows and Supabase
3. **Timeout configurations** conflicting with pgBouncer and large operations
4. **Over-optimization** that introduced more complexity than performance gains

## 🛠️ Solution Implementation

### **Changes Made:**

1. **Simplified Persistence Service** (`app/core/simplified_scoring_persistence.py`)
   - Single strategy using Supabase REST API only
   - Smaller chunk size (50 items) for better reliability
   - Retry logic with exponential backoff
   - Clear error isolation and reporting

2. **Updated Scoring Service** (`app/core/scoring.py`)
   - Replaced complex `BulkResultPersister` with simplified approach
   - Better error handling and progress monitoring

3. **Test Script** (`test_bulk_scoring_fix.py`)
   - Comprehensive testing with performance monitoring
   - Health checks and detailed error reporting

## 📋 Environment Configuration

### **Required Environment Variables:**

```bash
# Core Supabase Configuration (REQUIRED)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
# Note: DATABASE_DIRECT_URL is now optional with simplified approach

# Environment
ENVIRONMENT=development  # or production
```

### **Verify Configuration:**

1. **Test Supabase Connection:**
   ```python
   from app.database.supabase_service import get_supabase_service
   
   service = get_supabase_service()
   success = await service.test_connection()
   print(f"Connection test: {'✅ SUCCESS' if success else '❌ FAILED'}")
   ```

2. **Test Database Health:**
   ```bash
   curl http://localhost:8000/api/health
   ```

## 🚀 Testing the Fix

### **Step 1: Start the API Server**

```bash
cd lifo_api
python -m uvicorn app.main:app --reload --port 8000
```

### **Step 2: Run the Test Script**

```bash
# Update configuration in test_bulk_scoring_fix.py
python test_bulk_scoring_fix.py
```

### **Step 3: Manual API Test**

```bash
curl -X POST "http://localhost:8000/api/v1/scoring/batch/your-store-id/bulk" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"force_recalculate": false}'
```

## 📊 Expected Performance

### **Target Metrics:**
- **Response Time:** 3-10 seconds for 1000 batches
- **Success Rate:** >95% for normal operations
- **Error Recovery:** Automatic retry with exponential backoff
- **Memory Usage:** Consistent, no memory leaks

### **Performance Comparison:**

| Metric | Before (Complex) | After (Simplified) |
|--------|------------------|-------------------|
| Architecture | 3-tier fallback | Single tier |
| Chunk Size | 100 items | 50 items |
| Retry Logic | Basic | Exponential backoff |
| Error Isolation | Poor | Excellent |
| Timeout Handling | Inconsistent | Reliable |

## 🏥 Troubleshooting

### **Common Issues:**

1. **"Connection timeout"**
   - Check `SUPABASE_URL` and network connectivity
   - Verify WSL can reach Supabase (try from Windows browser)
   - Check firewall settings

2. **"Authentication failed"**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Check JWT token expiration
   - Ensure RLS policies allow service role access

3. **"Schema not found"**
   - Verify database schema exists (`scoring` schema)
   - Check table exists (`scoring.product_scores`)
   - Verify service role has permissions

4. **Still getting timeouts**
   - Reduce chunk size further (from 50 to 25)
   - Check database query performance
   - Monitor Supabase dashboard for slow queries

### **Debug Commands:**

```bash
# Check environment variables
python -c "import os; print('SUPABASE_URL:', os.getenv('SUPABASE_URL', 'NOT SET'))"

# Test database connection
python -c "
import asyncio
from app.database.supabase_service import get_supabase_service
async def test():
    service = get_supabase_service()
    result = await service.test_connection()
    print(f'Connection: {result}')
asyncio.run(test())
"

# Check scoring table
python -c "
from app.database.supabase_service import get_supabase_service
service = get_supabase_service()
client = service.get_admin_client()
result = client.schema('scoring').table('product_scores').select('*').limit(1).execute()
print(f'Table access: {len(result.data)} rows found')
"
```

## 🎯 Performance Monitoring

### **Key Metrics to Monitor:**

1. **Response Time:** Should be <10s for normal operations
2. **Error Rate:** Should be <5% under normal conditions
3. **Database Connections:** Monitor for connection leaks
4. **Memory Usage:** Should remain stable over time

### **Logging:**

The simplified service provides detailed logging:
- Chunk processing progress
- Retry attempts with backoff timing
- Database operation metrics
- Clear error messages with actionable information

## 🔄 Rollback Plan

If the simplified approach doesn't work:

1. **Revert scoring.py changes:**
   ```bash
   git checkout HEAD~1 -- lifo_api/app/core/scoring.py
   ```

2. **Remove simplified persistence:**
   ```bash
   rm lifo_api/app/core/simplified_scoring_persistence.py
   ```

3. **Check original environment requirements:**
   - Ensure `DATABASE_DIRECT_URL` is set properly
   - Verify asyncpg connection pools work in your environment

## ✅ Success Criteria

The fix is successful when:

1. **API responds within 10 seconds** for 1000+ batches
2. **Database writes complete successfully** (no timeout errors)
3. **Error rates drop below 5%**
4. **Works consistently** across local/development/production
5. **Memory usage remains stable** over multiple requests

## 🎉 Next Steps

1. **Test in production environment**
2. **Monitor performance metrics**
3. **Consider further optimizations:**
   - Implement caching for frequently accessed data
   - Add background processing for very large datasets
   - Optimize database indexes for scoring queries

---

**Need help?** Check the logs in the console or contact the development team with:
- Error messages from the API
- Environment variable configuration (redacted)
- Network/connectivity test results