-- Migration: 021_simple_manual_migration_guide.sql
-- Simple manual migration guide for MVP/testing phase
-- Since we're in testing with sample data, keep it simple!

BEGIN;

-- =============================================
-- SIMPLE MANUAL MIGRATION APPROACH
-- =============================================

-- For MVP/testing phase, we'll just provide simple queries 
-- that can be run manually in the Supabase dashboard

-- Step 1: Create a few sample global products manually
-- Run these in the SQL editor:

/*
INSERT INTO global.products (name, brand, primary_category, barcode, typical_shelf_life_days, unit_type, verification_status) VALUES
('Fresh Milk', 'Local Dairy', 'dairy', '1234567890123', 7, 'liter', 'verified'),
('Whole Wheat Bread', 'Baker''s Choice', 'bakery_fresh', '2345678901234', 3, 'loaf', 'verified'),
('Organic Bananas', 'Fresh Farm', 'fresh_produce', '3456789012345', 5, 'kg', 'verified'),
('Greek Yogurt', 'Healthy Choice', 'dairy', '4567890123456', 14, 'cup', 'verified'),
('Salmon Fillet', 'Ocean Fresh', 'fresh_meat_fish', '5678901234567', 2, 'kg', 'verified');
*/

-- Step 2: Add these products to your stores
-- Replace 'your-store-id-here' with actual store ID:

/*
-- Get your store ID first:
SELECT store_id, store_name FROM business.stores WHERE is_active = true;

-- Then add products to store with pricing:
INSERT INTO business.store_product (store_id, product_id, default_cost_price, default_selling_price, added_by) 
SELECT 
    'your-store-id-here'::UUID as store_id,
    product_id,
    5.00 as default_cost_price,   -- Set your cost price
    7.50 as default_selling_price, -- Set your selling price  
    auth.uid() as added_by
FROM global.products 
WHERE verification_status = 'verified';
*/

-- Step 3: Update existing batches to use global products (optional)
-- This links your existing test batches to the new global products:

/*
-- First, see what batches you have:
SELECT b.batch_id, b.batch_number, p.name as product_name, p.category 
FROM inventory.batches b 
JOIN inventory.products p ON p.product_id = b.product_id;

-- Then manually update a few batches to test:
UPDATE inventory.batches 
SET global_product_id = (SELECT product_id FROM global.products WHERE name = 'Fresh Milk' LIMIT 1),
    inherited_from_store_product = true,
    batch_source = 'manual'
WHERE batch_id = 'your-batch-id-here';
*/

-- =============================================
-- HELPER QUERIES FOR TESTING
-- =============================================

-- Check what global products exist:
-- SELECT * FROM global.products;

-- Check store-product relationships:
-- SELECT sp.*, gp.name, gp.brand FROM business.store_product sp JOIN global.products gp ON gp.product_id = sp.product_id;

-- Check batches with global product info:
-- SELECT * FROM inventory.batches_with_products WHERE uses_global_product = true;

-- Test the search function:
-- SELECT * FROM search_global_products_fuzzy('milk', 'your-store-id');

-- Test barcode lookup:
-- SELECT * FROM find_product_by_barcode('1234567890123', 'your-store-id');

-- =============================================
-- QUICK CLEANUP (if needed)
-- =============================================

-- If you want to start fresh during testing:
/*
-- Clear test data:
DELETE FROM business.store_product;
DELETE FROM global.products WHERE verification_status = 'verified';

-- Reset batch references:
UPDATE inventory.batches SET global_product_id = NULL, inherited_from_store_product = false;
*/

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON SCHEMA global IS 'New global product schema - ready for OCR and barcode features';

-- Sample API usage for future frontend integration:
/*
-- Add product to store via API:
SELECT add_product_to_store(
    'store-id'::UUID, 
    'product-id'::UUID, 
    5.00, -- cost
    7.50  -- selling price
);

-- Create new global product:
SELECT create_global_product(
    'New Product Name',
    'Brand Name', 
    'dairy',
    '1234567890123',
    7,
    'pcs'
);

-- Get store products:
SELECT * FROM get_store_products('store-id'::UUID, true, 50, 0);
*/

COMMIT;