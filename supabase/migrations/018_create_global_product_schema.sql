-- Migration: 018_normalize_inventory_products.sql
-- Normalize inventory.products to remove data duplication
-- Create store-specific product settings in inventory.store_products

BEGIN;

-- =============================================
-- STEP 1: BACKUP EXISTING DATA
-- =============================================

-- Create temporary backup of current products
CREATE TEMP TABLE products_backup AS 
SELECT * FROM inventory.products;

-- Debug: Check for products without store_id
DO $$
DECLARE
    null_store_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_store_count 
    FROM products_backup 
    WHERE store_id IS NULL;
    
    IF null_store_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % products with NULL store_id. These will be skipped in migration.', null_store_count;
    END IF;
END $$;

-- =============================================
-- STEP 2: DROP EXISTING RLS POLICIES THAT DEPEND ON STORE_ID
-- =============================================

-- Drop existing policies that reference store_id column
DROP POLICY IF EXISTS "Users can view products from their stores" ON inventory.products;
DROP POLICY IF EXISTS "Users can create products in their stores" ON inventory.products;
DROP POLICY IF EXISTS "Users can update products in their stores" ON inventory.products;
DROP POLICY IF EXISTS "Users can delete products in their stores" ON inventory.products;

-- =============================================
-- STEP 3: NORMALIZE INVENTORY.PRODUCTS
-- =============================================

-- Drop foreign key constraint first
ALTER TABLE inventory.products DROP CONSTRAINT IF EXISTS products_store_id_fkey;

-- Remove store_id from products (normalize - no more duplication)
ALTER TABLE inventory.products DROP COLUMN store_id;

-- Add enhanced fields for LIFO.AI (barcode already exists)
ALTER TABLE inventory.products 
ADD COLUMN barcode_type VARCHAR(20), -- EAN13, UPC, Code128, etc.
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_count INTEGER DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMP;

-- =============================================
-- STEP 4: CREATE STORE_PRODUCTS JUNCTION TABLE
-- =============================================

CREATE TABLE inventory.store_products (
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    
    -- Store-specific pricing (replaces product-level pricing)
    cost_price DECIMAL(12,4),
    selling_price DECIMAL(12,4),
    
    -- Store-specific settings
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Store-specific product settings
    store_sku VARCHAR(100), -- Store's internal SKU if different
    supplier_code VARCHAR(50), -- Store's supplier reference
    
    -- Audit and tracking
    added_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (store_id, product_id)
);

-- =============================================
-- STEP 5: MIGRATE EXISTING DATA
-- =============================================

-- Step 5a: Create deduplicated products temporary table
CREATE TEMP TABLE deduplicated_products AS
SELECT 
    (array_agg(product_id ORDER BY created_at ASC))[1] as kept_product_id,
    name,
    brand,
    category,
    unit_type,
    typical_shelf_life_days,
    -- Take the most recent values for other fields
    (array_agg(created_by ORDER BY created_at DESC))[1] as created_by,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at
FROM products_backup
GROUP BY name, brand, category, unit_type, typical_shelf_life_days;

-- Step 5b: Create product mapping temporary table
CREATE TEMP TABLE product_mapping AS
SELECT 
    pb.product_id as old_product_id,
    dp.kept_product_id as new_product_id,
    pb.store_id,
    pb.base_cost_price,
    pb.base_selling_price,
    pb.created_by as added_by
FROM products_backup pb
JOIN deduplicated_products dp ON (
    pb.name = dp.name AND 
    pb.brand = dp.brand AND 
    pb.category = dp.category AND
    pb.unit_type = dp.unit_type AND
    pb.typical_shelf_life_days = dp.typical_shelf_life_days
);

-- Step 5c: Insert store_products data
INSERT INTO inventory.store_products (
    store_id, product_id, cost_price, selling_price, added_by, created_at, updated_at
)
SELECT DISTINCT
    pm.store_id,
    pm.new_product_id,
    pm.base_cost_price,
    pm.base_selling_price,
    pm.added_by,
    NOW(),
    NOW()
FROM product_mapping pm
WHERE pm.store_id IS NOT NULL;

-- Step 5d: Update inventory.products with deduplicated data
DELETE FROM inventory.products;

INSERT INTO inventory.products (
    product_id, sku, name, description, category, brand, unit_type,
    typical_shelf_life_days, base_cost_price, base_selling_price,
    created_by, created_at, updated_at
)
SELECT 
    dp.kept_product_id,
    'SKU-' || dp.kept_product_id::text, -- Generate new unique SKUs
    dp.name,
    '', -- description
    dp.category,
    dp.brand,
    dp.unit_type,
    dp.typical_shelf_life_days,
    -- Use average pricing from all instances of this product
    AVG(pb.base_cost_price) as base_cost_price,
    AVG(pb.base_selling_price) as base_selling_price,
    dp.created_by,
    dp.created_at,
    dp.updated_at
FROM deduplicated_products dp
JOIN products_backup pb ON (
    pb.name = dp.name AND 
    pb.brand = dp.brand AND 
    pb.category = dp.category AND
    pb.unit_type = dp.unit_type AND
    pb.typical_shelf_life_days = dp.typical_shelf_life_days
)
GROUP BY dp.kept_product_id, dp.name, dp.category, dp.brand, dp.unit_type, 
         dp.typical_shelf_life_days, dp.created_by, dp.created_at, dp.updated_at;

-- =============================================
-- STEP 6: UPDATE BATCHES REFERENCES
-- =============================================

-- Create batch mapping table using existing product_mapping temp table
CREATE TEMP TABLE batch_product_mapping AS
SELECT DISTINCT
    pm.old_product_id,
    pm.new_product_id
FROM product_mapping pm;

-- Update batches to reference new product_ids
UPDATE inventory.batches 
SET product_id = bpm.new_product_id
FROM batch_product_mapping bpm
WHERE inventory.batches.product_id = bpm.old_product_id;

-- =============================================
-- STEP 7: INDEXES AND CONSTRAINTS
-- =============================================

-- Core lookup indexes
CREATE INDEX idx_store_products_store ON inventory.store_products(store_id);
CREATE INDEX idx_store_products_product ON inventory.store_products(product_id);
CREATE INDEX idx_store_products_active ON inventory.store_products(store_id, is_active) WHERE is_active = TRUE;

-- Barcode lookup
CREATE INDEX idx_products_barcode ON inventory.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_name_search ON inventory.products USING gin(to_tsvector('english', name));

-- Pricing lookup indexes
CREATE INDEX idx_store_products_pricing ON inventory.store_products(store_id, is_active) 
    WHERE is_active = TRUE;

-- =============================================
-- STEP 8: ADD USEFUL CONSTRAINTS
-- =============================================

-- Ensure pricing consistency
ALTER TABLE inventory.store_products
ADD CONSTRAINT store_products_pricing_check 
CHECK (cost_price IS NULL OR cost_price > 0),
ADD CONSTRAINT store_products_selling_price_check 
CHECK (selling_price IS NULL OR selling_price > 0);

-- Note: No stock level constraints needed - LIFO.AI tracks and recommends, doesn't manage inventory

-- Barcode format validation (basic)
ALTER TABLE inventory.products
ADD CONSTRAINT products_barcode_format_check
CHECK (barcode IS NULL OR length(barcode) BETWEEN 8 AND 50);

COMMIT;

-- =============================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================

-- Check deduplication worked
-- SELECT name, brand, COUNT(*) FROM inventory.products GROUP BY name, brand HAVING COUNT(*) > 1;

-- Check store_products created correctly  
-- SELECT COUNT(*) FROM inventory.store_products;

-- Check batches still reference valid products
-- SELECT COUNT(*) FROM inventory.batches b LEFT JOIN inventory.products p ON b.product_id = p.product_id WHERE p.product_id IS NULL;