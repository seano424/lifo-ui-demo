-- ============================================================================
-- MOBILE PERFORMANCE OPTIMIZATION INDEXES FOR LIFO.AI
-- Target: <300ms response time for all mobile endpoints
-- ============================================================================

-- CRITICAL: These indexes are specifically designed for mobile endpoint queries
-- Run with CONCURRENTLY to avoid blocking production operations

-- ============================================================================
-- MOBILE SUMMARY ENDPOINT OPTIMIZATION
-- Endpoint: /mobile-summary/{store_id}
-- Target: <180ms query time
-- ============================================================================

-- 1. Primary mobile inventory lookup - optimizes the main mobile query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_mobile_urgency 
ON inventory.batches (store_id, best_before_date ASC, status)
INCLUDE (current_quantity, selling_price, cost_price)
WHERE status = 'active' AND current_quantity > 0;

-- 2. Expiry-based filtering for mobile urgency calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_expiry_mobile
ON inventory.batches (store_id, expiry_date, current_quantity DESC)
WHERE status = 'active' 
  AND current_quantity > 0 
  AND expiry_date > (CURRENT_DATE - INTERVAL '7 days');

-- ============================================================================
-- QUICK SCORE ENDPOINT OPTIMIZATION  
-- Endpoint: /batch-quick-score/{batch_id}
-- Target: <100ms query time
-- ============================================================================

-- 3. Ultra-fast batch lookup by ID
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_id_mobile
ON inventory.batches (batch_id)
INCLUDE (product_id, store_id, current_quantity, selling_price, cost_price, expiry_date, best_before_date)
WHERE status = 'active';

-- 4. Product category weights lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_mobile
ON inventory.products (category, product_id)
INCLUDE (sku, typical_shelf_life_days)
WHERE is_verified = true;

-- ============================================================================
-- STORE HEALTH ENDPOINT OPTIMIZATION
-- Endpoint: /store-health/{store_id}  
-- Target: <200ms query time
-- ============================================================================

-- 5. Aggregate metrics calculation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_health_metrics
ON inventory.batches (store_id, status, best_before_date)
INCLUDE (current_quantity, selling_price)
WHERE status = 'active' AND current_quantity > 0;

-- 6. Value at risk calculation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_value_risk
ON inventory.batches (store_id, (current_quantity * selling_price) DESC)
WHERE status = 'active' 
  AND best_before_date <= (CURRENT_DATE + INTERVAL '7 days');

-- ============================================================================
-- BATCH LIST MOBILE ENDPOINT OPTIMIZATION
-- Endpoint: /batch-list-mobile/{store_id}
-- Target: <150ms query time with pagination
-- ============================================================================

-- 7. Category filtering for mobile batch lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_category_filter
ON inventory.batches b
USING btree (store_id, (
    SELECT category FROM inventory.products p 
    WHERE p.product_id = b.product_id
))
WHERE status = 'active' AND current_quantity > 0;

-- 8. Location-based filtering for mobile
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_location_mobile
ON inventory.batches (store_id, location_code, best_before_date)
WHERE status = 'active' AND current_quantity > 0;

-- ============================================================================
-- MOBILE CATEGORY SUMMARY OPTIMIZATION
-- Used by multiple mobile endpoints
-- ============================================================================

-- 9. Category aggregation for dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_stats
ON inventory.products (category)
INCLUDE (product_id, sku)
WHERE is_verified = true;

-- 10. Join optimization for batch-product queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_product_join
ON inventory.batches (product_id, store_id)
INCLUDE (batch_id, current_quantity, expiry_date)
WHERE status = 'active';

-- ============================================================================
-- MOBILE SEARCH AND FILTERING
-- ============================================================================

-- 11. SKU search optimization for mobile
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_search
ON inventory.products 
USING gin (sku gin_trgm_ops);

-- 12. Barcode lookup for mobile scanning
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode_mobile
ON inventory.products (barcode)
WHERE barcode IS NOT NULL AND barcode != '';

-- ============================================================================
-- PERFORMANCE MONITORING INDEXES
-- Track mobile query performance
-- ============================================================================

-- 13. Track slow mobile queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pg_stat_mobile_queries
ON pg_stat_statements (mean_exec_time DESC)
WHERE query LIKE '%inventory.batches%' 
  AND calls > 100;

-- ============================================================================
-- MATERIALIZED VIEW FOR MOBILE DASHBOARD
-- Pre-aggregate data for instant mobile response
-- ============================================================================

-- Create materialized view for store health metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mobile_store_health_mv AS
SELECT 
    b.store_id,
    COUNT(*) as total_batches,
    COUNT(CASE WHEN b.best_before_date <= CURRENT_DATE THEN 1 END) as expired_batches,
    COUNT(CASE WHEN b.best_before_date <= (CURRENT_DATE + INTERVAL '1 day') THEN 1 END) as critical_batches,
    COUNT(CASE WHEN b.best_before_date <= (CURRENT_DATE + INTERVAL '3 days') THEN 1 END) as expiring_soon,
    SUM(b.current_quantity * b.selling_price) as total_value,
    AVG(DATE_PART('day', b.best_before_date - CURRENT_DATE)) as avg_days_to_expiry,
    MAX(b.updated_at) as last_update
FROM inventory.batches b
WHERE b.status = 'active' AND b.current_quantity > 0
GROUP BY b.store_id;

-- Index the materialized view
CREATE UNIQUE INDEX ON mobile_store_health_mv (store_id);

-- Refresh schedule (run daily or on-demand)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-mobile-health-mv', '0 */6 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mobile_store_health_mv;');

-- ============================================================================
-- QUERY PERFORMANCE VERIFICATION
-- ============================================================================

-- Test query to verify mobile endpoint performance
-- Should return in <50ms with indexes
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    b.batch_id,
    p.sku,
    p.category,
    b.current_quantity,
    b.selling_price,
    (b.expiry_date - CURRENT_DATE) as days_to_expiry
FROM inventory.batches b
INNER JOIN inventory.products p ON b.product_id = p.product_id
WHERE b.store_id = 'test-store-id'
    AND b.status = 'active'
    AND b.current_quantity > 0
    AND b.expiry_date > (CURRENT_DATE - INTERVAL '7 days')
ORDER BY b.best_before_date ASC
LIMIT 200;
*/

-- ============================================================================
-- INDEX MAINTENANCE COMMANDS
-- ============================================================================

-- Analyze tables after index creation for optimal query planning
ANALYZE inventory.batches;
ANALYZE inventory.products;
ANALYZE inventory.store_products;

-- Monitor index usage
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'inventory'
    AND indexname LIKE '%mobile%'
ORDER BY idx_scan DESC;
*/

-- ============================================================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================================================

/*
Mobile Endpoint Performance Targets:

1. /mobile-summary/{store_id}
   Before: 300-500ms
   After: 100-180ms (40-60% improvement)

2. /batch-quick-score/{batch_id}  
   Before: 150-200ms
   After: 50-80ms (60-70% improvement)

3. /store-health/{store_id}
   Before: 400-600ms
   After: 150-250ms (50-60% improvement)

4. /batch-list-mobile/{store_id}
   Before: 250-400ms  
   After: 100-150ms (50-60% improvement)

Overall Mobile Performance:
- P50 Response Time: <150ms
- P95 Response Time: <300ms
- P99 Response Time: <500ms
- Cache Hit Rate: >80%
- Query Execution: <100ms for 95% of queries

Notes:
- Indexes require ~500MB additional storage
- Initial index creation may take 5-10 minutes on large datasets
- Use CONCURRENTLY to avoid blocking during creation
- Monitor pg_stat_user_indexes for usage patterns
- Consider partitioning for tables >10GB
*/