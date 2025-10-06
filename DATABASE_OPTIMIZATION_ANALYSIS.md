# Database Optimization Analysis

## Issues Identified by Supabase Advisor

### 1. 🔴 RLS Initplan Issues (33 policies) - HIGH IMPACT
**Problem**: Policies using `auth.uid()` directly re-evaluate for EACH row, causing severe performance degradation at scale.

**Fix**: Replace `auth.uid()` with `(SELECT auth.uid())` to evaluate once per query.

**Affected Tables**:
- `inventory.product_recognition_cache` (2 policies)
- `inventory.ocr_processing_batches` (3 policies)
- `sales.transactions` (4 policies)
- `inventory.store_products` (1 policy)
- `inventory.batches` (1 policy)
- `business.stores` (3 policies)
- `business.store_users` (4 policies)
- `user_mgmt.users` (4 policies)
- `user_mgmt.user_roles` (2 policies)
- `inventory.products` (1 policy)
- `inventory.batch_status_logs` (1 policy)
- `inventory.batch_actions` (4 policies)
- `user_mgmt.gdpr_deletion_log` (1 policy)

**Performance Impact**:
- Current: O(n) evaluations (n = row count)
- After fix: O(1) evaluation per query
- **Expected improvement: 10-100x for large result sets**

---

### 2. 🟡 Unused Indexes (54 indexes) - MEDIUM IMPACT
**Problem**: Indexes consume storage and slow down INSERT/UPDATE operations but are never used.

**Categories**:
1. **Audit Trail Indexes** (7 indexes):
   - `idx_analytics_actions_executed_by`
   - `idx_store_users_assigned_by`
   - `idx_batch_actions_verified_by`
   - `idx_batch_status_logs_created_by`
   - `idx_donation_recipients_created_by`
   - `idx_store_products_updated_by`
   - `idx_gdpr_deletion_log_performed_by`

2. **Foreign Key Indexes** (8 indexes):
   - `idx_batch_actions_donation_recipient_id`
   - `idx_batches_processing_batch_id`
   - `idx_ocr_processing_batches_store_id`
   - `idx_user_preferences_primary_store_id`
   - `idx_categories_parent_id`
   - `idx_batches_location`
   - `idx_batches_supplier`
   - Various transaction indexes

3. **Text Search Indexes** (2 indexes):
   - `idx_categories_text_search`
   - `idx_products_name_search`

4. **Composite Indexes** (Many complex unused indexes)

5. **Timeseries Indexes** (4 indexes on timeseries schema)

**Storage Impact**: ~50-100MB of wasted space
**Write Performance**: Each index adds ~5-10% overhead on writes

---

### 3. 🟠 Multiple Permissive Policies - MEDIUM IMPACT
**Problem**: Multiple overlapping RLS policies execute for each query, multiplying overhead.

**Affected Tables**:
- `business.store_settings` (12 duplicate policies across roles)
- `inventory.ocr_processing_batches` (2 duplicates)
- `inventory.product_recognition_cache` (6 duplicates)
- `user_mgmt.users` (8 duplicates)

**Fix**: Consolidate overlapping policies into single policies with OR conditions.

---

### 4. 🔵 Duplicate Index - LOW IMPACT
**Problem**: Two identical indexes on same table.

**Table**: `inventory.products`
- `idx_products_category` (duplicate)
- `idx_products_category_id` (keep this one)

**Fix**: Drop `idx_products_category`

---

## Optimization Priority

### Phase 1: RLS Policy Fixes (HIGH PRIORITY)
- **Impact**: 10-100x query performance improvement
- **Risk**: LOW (backward compatible change)
- **Effort**: MEDIUM (33 policies to update)

### Phase 2: Drop Unused Indexes (MEDIUM PRIORITY)
- **Impact**: 5-10% write performance improvement, storage savings
- **Risk**: LOW (unused = safe to drop)
- **Effort**: LOW (simple DROP INDEX commands)

### Phase 3: Consolidate Duplicate Policies (MEDIUM PRIORITY)
- **Impact**: Moderate query performance improvement
- **Risk**: MEDIUM (need to test logic carefully)
- **Effort**: HIGH (complex policy logic)

### Phase 4: Drop Duplicate Index (LOW PRIORITY)
- **Impact**: Minimal
- **Risk**: VERY LOW
- **Effort**: VERY LOW

---

## Migration Strategy

1. **Create backup** before applying changes
2. **Apply Phase 1** (RLS fixes) - Most impactful
3. **Monitor performance** for 24-48 hours
4. **Apply Phase 2** (drop unused indexes) if Phase 1 successful
5. **Consider Phase 3** (policy consolidation) for future optimization

---

## Estimated Performance Gains

| Optimization | Query Performance | Write Performance | Storage |
|--------------|-------------------|-------------------|---------|
| RLS Fixes | **+10-100x** | No change | No change |
| Drop Indexes | No change | **+5-10%** | **-50-100MB** |
| Consolidate Policies | **+20-30%** | No change | No change |
| Duplicate Index | Minimal | **+1-2%** | **-10MB** |

**Total Expected Improvement**:
- Query performance: **10-130x faster** (on affected queries)
- Write performance: **6-12% faster**
- Storage savings: **60-110MB**

---

## Next Steps

1. Create SQL migration file with Phase 1 (RLS fixes)
2. Test migration on staging environment
3. Apply to production with monitoring
4. Iterate with Phase 2-4 based on results
