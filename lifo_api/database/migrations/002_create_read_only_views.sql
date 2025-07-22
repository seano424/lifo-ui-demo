-- Create read-only views for FastAPI AI features
-- Part of hybrid architecture security remediation

-- Create read-only inventory view for scoring
CREATE OR REPLACE VIEW inventory_view_for_scoring AS
SELECT 
    b.batch_id,
    b.product_id,
    b.store_id,
    b.current_quantity,
    b.expiry_date,
    b.selling_price,
    b.cost_price,
    (b.expiry_date - CURRENT_DATE) as days_to_expiry,
    p.sku,
    p.category,
    p.typical_shelf_life_days,
    p.name as product_name
FROM inventory.batches b
JOIN inventory.products p ON b.product_id = p.product_id
WHERE b.status = 'active' 
AND b.current_quantity > 0
AND b.expiry_date > CURRENT_DATE - INTERVAL '30 days';

-- Create read-only sales events view
CREATE OR REPLACE VIEW sales_events_view AS
SELECT 
    se.sale_id,
    se.batch_id,
    se.store_id,
    se.product_id,
    se.quantity_sold,
    se.sale_timestamp::date as sale_date,
    se.unit_price
FROM analytics.sales_events se
WHERE se.sale_timestamp >= CURRENT_DATE - INTERVAL '90 days';

-- Create read-only category weights view
CREATE OR REPLACE VIEW category_weights_view AS
SELECT 
    cw.category,
    cw.spoilage_risk_weight,
    cw.turnover_speed_weight,
    cw.value_impact_weight,
    cw.is_active
FROM scoring.category_weights cw
WHERE cw.is_active = true;

-- Create read-only analytics summary view
CREATE OR REPLACE VIEW analytics_summary_view AS
WITH inventory_stats AS (
    SELECT 
        b.store_id,
        CURRENT_DATE as analysis_date,
        COUNT(b.batch_id) as total_batches,
        SUM(b.current_quantity) as total_quantity,
        SUM(b.current_quantity * b.selling_price) as total_value,
        COUNT(CASE WHEN b.expiry_date < CURRENT_DATE THEN 1 END) as expired_count,
        COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as expiring_soon_count
    FROM inventory.batches b
    WHERE b.status = 'active'
    GROUP BY b.store_id
),
urgency_stats AS (
    SELECT 
        b.store_id,
        COUNT(CASE WHEN ps.urgency_level = 'critical' THEN 1 END) as critical_items,
        COUNT(CASE WHEN ps.urgency_level = 'high' THEN 1 END) as high_urgency_items,
        COUNT(CASE WHEN ps.urgency_level = 'medium' THEN 1 END) as medium_urgency_items,
        COUNT(CASE WHEN ps.urgency_level = 'low' THEN 1 END) as low_urgency_items
    FROM inventory.batches b
    LEFT JOIN scoring.product_scores ps ON b.batch_id = ps.batch_id
    WHERE b.status = 'active'
    GROUP BY b.store_id
)
SELECT 
    i.store_id,
    i.analysis_date,
    i.total_batches,
    i.total_quantity,
    i.total_value,
    i.expired_count,
    i.expiring_soon_count,
    COALESCE(u.critical_items, 0) as critical_items,
    COALESCE(u.high_urgency_items, 0) as high_urgency_items,
    COALESCE(u.medium_urgency_items, 0) as medium_urgency_items,
    COALESCE(u.low_urgency_items, 0) as low_urgency_items
FROM inventory_stats i
LEFT JOIN urgency_stats u ON i.store_id = u.store_id;

-- Create service user for FastAPI with limited permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fastapi_service_user') THEN
        CREATE USER fastapi_service_user WITH PASSWORD 'secure_ai_service_password_2024';
    END IF;
END
$$;

-- Grant read-only access to views
GRANT SELECT ON inventory_view_for_scoring TO fastapi_service_user;
GRANT SELECT ON sales_events_view TO fastapi_service_user;
GRANT SELECT ON category_weights_view TO fastapi_service_user;
GRANT SELECT ON analytics_summary_view TO fastapi_service_user;

-- Grant write access ONLY to scores table
GRANT INSERT, UPDATE ON scoring.product_scores TO fastapi_service_user;
GRANT USAGE ON SEQUENCE scoring.product_scores_score_id_seq TO fastapi_service_user;

-- Grant write access to analytics logs for monitoring
GRANT INSERT ON analytics.processing_logs TO fastapi_service_user;
GRANT USAGE ON SEQUENCE analytics.processing_logs_log_id_seq TO fastapi_service_user;

-- Revoke all other permissions (no CRUD on business data)
REVOKE ALL ON inventory.batches FROM fastapi_service_user;
REVOKE ALL ON inventory.products FROM fastapi_service_user;
REVOKE ALL ON business.stores FROM fastapi_service_user;
REVOKE ALL ON business.store_users FROM fastapi_service_user;
-- Note: auth.users table permissions are managed by Supabase

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_scoring_store_id ON inventory.batches(store_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_scoring_expiry ON inventory.batches(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sales_events_store_product ON analytics.sales_events(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_batch_id ON scoring.product_scores(batch_id);

-- Add comments for documentation
COMMENT ON VIEW inventory_view_for_scoring IS 'Read-only view for FastAPI AI scoring features - no business data modification allowed';
COMMENT ON VIEW sales_events_view IS 'Read-only view for sales velocity calculations - limited to 90 days';
COMMENT ON VIEW category_weights_view IS 'Read-only view for category-specific scoring weights';
COMMENT ON VIEW analytics_summary_view IS 'Read-only view for dashboard analytics - aggregated data only';

-- Log the migration
INSERT INTO public.schema_migrations (version, applied_at) VALUES (2, NOW());