-- Migration: 021_post_migration_test_data.sql
-- Simple test data and verification for normalized inventory schema
-- Run after migrations 018-020 to populate test data

BEGIN;

-- =============================================
-- TEST DATA FOR NORMALIZED SCHEMA
-- =============================================

-- Note: These are sample queries for manual testing
-- Run in Supabase SQL editor after applying migrations 018-020

-- =============================================
-- SAMPLE PRODUCTS (comment out if you have existing data)
-- =============================================

-- Sample normalized products (no store_id duplication)
INSERT INTO inventory.products (name, brand, category, unit_type, typical_shelf_life_days, barcode, barcode_type) VALUES
('Fresh Milk 1L', 'Local Dairy', 'dairy', 'liter', 7, '1234567890123', 'EAN13'),
('Whole Wheat Bread', 'Bakers Choice', 'bakery_fresh', 'loaf', 3, '2345678901234', 'EAN13'),
('Organic Bananas', 'Fresh Farm', 'fresh_produce', 'kg', 5, '3456789012345', 'EAN13'),
('Greek Yogurt 500g', 'Healthy Choice', 'dairy', 'cup', 14, '4567890123456', 'EAN13'),
('Salmon Fillet', 'Ocean Fresh', 'fresh_meat_fish', 'kg', 2, '5678901234567', 'EAN13')
ON CONFLICT (barcode) DO NOTHING; -- Skip if barcodes already exist

-- =============================================
-- SAMPLE STORE-PRODUCT ASSOCIATIONS
-- =============================================

-- Get your store ID (replace in queries below)
-- SELECT store_id, store_name FROM business.stores WHERE is_active = true;

-- Example: Add products to store with pricing
-- Replace 'YOUR-STORE-ID-HERE' with actual store UUID

/*
INSERT INTO inventory.store_products (store_id, product_id, cost_price, selling_price, added_by) 
SELECT 
    'YOUR-STORE-ID-HERE'::UUID as store_id,
    p.product_id,
    CASE p.category 
        WHEN 'dairy' THEN 2.50
        WHEN 'bakery_fresh' THEN 1.80
        WHEN 'fresh_produce' THEN 3.00
        WHEN 'fresh_meat_fish' THEN 12.00
        ELSE 5.00
    END as cost_price,
    CASE p.category 
        WHEN 'dairy' THEN 3.99
        WHEN 'bakery_fresh' THEN 2.99
        WHEN 'fresh_produce' THEN 4.99
        WHEN 'fresh_meat_fish' THEN 18.99
        ELSE 7.99
    END as selling_price,
    auth.uid() as added_by
FROM inventory.products p
WHERE p.barcode IS NOT NULL
ON CONFLICT (store_id, product_id) DO NOTHING;
*/

-- =============================================
-- VERIFICATION FUNCTIONS
-- =============================================

-- Function to check migration success
CREATE OR REPLACE FUNCTION inventory.verify_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count_result BIGINT,
    message TEXT
) AS $$
BEGIN
    -- Check 1: Products without store_id
    RETURN QUERY
    SELECT 
        'products_normalized'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'inventory' 
            AND table_name = 'products' 
            AND column_name = 'store_id'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        (SELECT COUNT(*) FROM inventory.products)::BIGINT,
        'Products table should not have store_id column'::TEXT;
    
    -- Check 2: Store_products table exists
    RETURN QUERY
    SELECT 
        'store_products_table'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'inventory' 
            AND table_name = 'store_products'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        (SELECT COUNT(*) FROM inventory.store_products)::BIGINT,
        'Store_products junction table exists'::TEXT;
    
    -- Check 3: Barcode columns added
    RETURN QUERY
    SELECT 
        'barcode_support'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'inventory' 
            AND table_name = 'products' 
            AND column_name = 'barcode'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        (SELECT COUNT(*) FROM inventory.products WHERE barcode IS NOT NULL)::BIGINT,
        'Products table has barcode support'::TEXT;
        
    -- Check 4: Batch enhancements
    RETURN QUERY
    SELECT 
        'batch_enhancements'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'inventory' 
            AND table_name = 'batches' 
            AND column_name = 'batch_source'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        (SELECT COUNT(*) FROM inventory.batches)::BIGINT,
        'Batches table has barcode workflow columns'::TEXT;
        
    -- Check 5: RLS policies active
    RETURN QUERY
    SELECT 
        'rls_policies'::TEXT,
        CASE WHEN (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'inventory' 
            AND tablename IN ('products', 'store_products', 'batches')
        ) > 5 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'inventory')::BIGINT,
        'RLS policies are configured'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================
-- POST-MIGRATION VERIFICATION
-- =============================================

-- Run this to verify the migration worked correctly:
-- SELECT * FROM inventory.verify_migration();

-- Quick data overview:
-- SELECT 'Products' as table_name, COUNT(*) as count FROM inventory.products
-- UNION ALL
-- SELECT 'Store Products', COUNT(*) FROM inventory.store_products  
-- UNION ALL
-- SELECT 'Batches', COUNT(*) FROM inventory.batches;

-- Check barcode support:
-- SELECT COUNT(*) as products_with_barcodes FROM inventory.products WHERE barcode IS NOT NULL;

-- View sample normalized data:
-- SELECT p.name, p.barcode, COUNT(sp.store_id) as store_count 
-- FROM inventory.products p
-- LEFT JOIN inventory.store_products sp ON p.product_id = sp.product_id
-- GROUP BY p.product_id, p.name, p.barcode
-- ORDER BY store_count DESC;