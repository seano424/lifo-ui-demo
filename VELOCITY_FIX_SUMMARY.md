# Velocity Data Fetch Fix - October 13, 2025

## 🎯 Problem Summary

**Error**: `permission denied for schema sales`

**Context**: Bulk scoring failing for store with 14K batches (7,584 products) when fetching sales velocity data.

---

## 🔍 Root Cause Analysis

Using Supabase MCP, we discovered **three separate issues**:

### 1. **Schema Permission Missing**
- `service_role` lacked USAGE permission on `sales` schema
- Even though service_role bypasses RLS, it still needs schema-level USAGE grant

### 2. **Wrong Column Names**
- Code queried: `product_id, quantity_sold, sale_date`
- Actual table has: `batch_id, quantity, sale_date`
- The `sales.transactions` table doesn't have a `product_id` column!

### 3. **Missing Relationship Join**
- `sales.transactions` uses `batch_id` to link to `inventory.batches`
- Need to JOIN with `batches` table to get `product_id`
- Direct product_id query was impossible

**Actual Table Structure** (from Supabase MCP):
```json
{
  "schema": "sales",
  "name": "transactions",
  "columns": [
    {"name": "transaction_id", "type": "uuid"},
    {"name": "store_id", "type": "uuid"},
    {"name": "batch_id", "type": "uuid"},  // ✅ Links to inventory.batches
    {"name": "quantity", "type": "numeric"},  // ✅ Not "quantity_sold"
    {"name": "sale_date", "type": "date"},  // ✅ Correct
    {"name": "unit_price", "type": "numeric"},
    ...
  ]
}
```

---

## ✅ Fixes Applied

### Fix 1: Schema Permission Grant

**File**: `supabase/migrations/102_grant_sales_schema_permissions.sql`

```sql
-- Grant USAGE on the sales schema (required to access any objects)
GRANT USAGE ON SCHEMA sales TO service_role;

-- Grant SELECT on all existing tables in sales schema
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO service_role;

-- Auto-grant for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA sales
    GRANT SELECT ON TABLES TO service_role;

-- Verify and grant explicit permissions on transactions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'transactions'
    ) THEN
        GRANT SELECT ON sales.transactions TO service_role;
        RAISE NOTICE 'Granted SELECT on sales.transactions to service_role';
    ELSE
        RAISE WARNING 'Table sales.transactions does not exist - skipping explicit grant';
    END IF;
END $$;
```

**To Apply**:
```bash
# Option 1: Via Supabase Dashboard SQL Editor
# 1. Open your project at https://supabase.com/dashboard
# 2. Go to SQL Editor
# 3. Copy and paste contents of: supabase/migrations/102_grant_sales_schema_permissions.sql
# 4. Click "Run"

# Option 2: Via Supabase CLI (if using local dev)
supabase db push
```

---

### Fix 2: Query with Correct Columns & Batch Mapping

**File**: `lifo_api/app/database/read_only_operations.py`

**Method**: `get_bulk_sales_velocity_data` (lines 1333-1480)

**Before** ❌:
```python
# Wrong columns, trying to query non-existent product_id
result = (
    admin_client.schema("sales")
    .table("transactions")
    .select("product_id, quantity_sold, sale_date")  # ❌ Wrong!
    .eq("store_id", store_id)
    .in_("product_id", chunk)  # ❌ Column doesn't exist
    .gte("sale_date", start_date)
    .execute()
)
```

**After** ✅:
```python
# Step 1: Get batch_id -> product_id mapping from inventory.batches
batch_result = (
    admin_client.schema("inventory")
    .table("batches")
    .select("batch_id, product_id")
    .eq("store_id", store_id)
    .in_("product_id", product_ids)  # Query by product_id here
    .execute()
)

# Create in-memory mapping
batch_to_product = {
    batch["batch_id"]: batch["product_id"]
    for batch in batch_result.data
}
batch_ids = list(batch_to_product.keys())

# Step 2: Query transactions with CORRECT columns
# Chunk batch_ids to avoid URL length limits (500 per chunk)
for i in range(0, len(batch_ids), 500):
    chunk = batch_ids[i:i + 500]

    result = (
        admin_client.schema("sales")
        .table("transactions")
        .select("batch_id, quantity, sale_date")  # ✅ Correct columns!
        .eq("store_id", store_id)
        .in_("batch_id", chunk)  # ✅ Use batch_id
        .gte("sale_date", start_date)
        .execute()
    )
    all_sales_data.extend(result.data)

# Step 3: Map batch sales to products and aggregate
for product_id in product_ids:
    product_sales = [
        sale for sale in all_sales_data
        if batch_to_product.get(sale["batch_id"]) == product_id
    ]

    total_quantity = sum(sale.get("quantity", 0) for sale in product_sales)
    avg_daily_sales = total_quantity / days if days > 0 else 0

    velocity_data[product_id] = {
        "avg_daily_sales": max(avg_daily_sales, 1.0),
        "total_sales": len(product_sales),
        "total_quantity": total_quantity,
    }
```

---

## 📊 Expected Performance

### Before Fix
```
❌ ERROR: Failed to get bulk sales velocity data
   error="permission denied for schema sales"

❌ ERROR: URL component 'query' too long (if permission was granted)

Result: No velocity data, degraded score quality
```

### After Fix
```
✅ Batch mappings retrieved: 14,000 batches
✅ Velocity data fetched in chunks: 28 API calls (500 batches each)
✅ Products with velocity data: 7,584 products
✅ Duration: ~4-6 seconds

Result: Full-quality urgency scores with accurate velocity data
```

---

## 🧪 Testing Instructions

### 1. Apply the Schema Permission Migration

```bash
# Via Supabase Dashboard SQL Editor
# Copy and run: supabase/migrations/102_grant_sales_schema_permissions.sql
```

### 2. Restart the FastAPI Server

```bash
# Ensure code changes are loaded
cd lifo_api
uvicorn app.main:app --reload
```

### 3. Test Bulk Scoring

```bash
# Test with the problematic store (14K batches)
curl -X POST "http://localhost:8000/api/v1/scoring/batch/e3b41480-79a3-4cb7-8151-3fe014a1b60f/bulk" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Expected Output**:
- ✅ No "permission denied" errors
- ✅ Log: "Batch mappings retrieved" with batch count
- ✅ Log: "Bulk velocity data retrieved (CHUNKED)" with product count
- ✅ Scoring completes in 15-30 seconds (depending on COPY protocol)

---

## 🎓 Key Learnings

### ★ Insight ─────────────────────────────────────
1. **Always Verify Schema Structure**: Use MCP tools or SQL queries to verify actual table structure before writing queries. Assumptions about column names can lead to hard-to-debug errors.

2. **Service Role Permissions**: Even though `service_role` bypasses RLS policies, it still needs schema-level USAGE grants in PostgreSQL. Schema permissions are separate from RLS.

3. **Batch-Based Architecture**: When `sales.transactions` uses `batch_id` instead of `product_id`, you need an in-memory mapping strategy. The two-step approach (fetch mappings, then fetch sales) is more efficient than complex JOINs for large datasets.

4. **Chunking for Scale**: With 14K batches, chunking is essential. 500 items per chunk provides a good balance between API roundtrips and URL length limits.
─────────────────────────────────────────────────

---

## 📁 Files Modified

### Created:
- `supabase/migrations/102_grant_sales_schema_permissions.sql` (migration)
- `VELOCITY_FIX_SUMMARY.md` (this document)

### Modified:
- `lifo_api/app/database/read_only_operations.py` (method: `get_bulk_sales_velocity_data`)
- `PERFORMANCE_IMPROVEMENTS_OCT13_PART2.md` (documentation update)

---

## 🚀 Next Steps

1. ✅ Apply schema permission migration
2. ✅ Restart API server
3. 🔄 Test bulk scoring on store `e3b41480-79a3-4cb7-8151-3fe014a1b60f`
4. 🔄 Verify velocity data in logs
5. 🔄 Confirm score quality improvement
6. 🔄 Deploy to staging/production

---

**Document Version**: 1.0
**Date**: October 13, 2025
**Status**: ✅ Ready for Testing
**Fixes**: Schema Permission + Column Mapping + Batch JOIN
