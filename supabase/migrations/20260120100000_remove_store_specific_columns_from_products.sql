-- Migration: Remove store-specific columns from products table (cleanup)
--
-- Context: The products table is a global catalog shared across all stores.
-- Store-specific inventory metrics (total_stock, active_batches_count, avg_days_to_expiry)
-- were correctly removed in migration 20251119033300, but were re-added by
-- remote_schema.sql migrations that synced with an outdated schema.
--
-- These columns are semantically incorrect on the products table because:
--   1. A product in the catalog doesn't have a single stock value
--   2. Each store has its own inventory for the same product
--   3. The store_inventory_stats view provides real-time per-store metrics
--
-- The application code already computes these values from batches, so these
-- columns are unused and their presence is misleading.

-- First, drop dependent views that reference these columns
DROP VIEW IF EXISTS inventory.expiring_products CASCADE;
DROP VIEW IF EXISTS inventory.my_store_products CASCADE;
DROP VIEW IF EXISTS inventory.products_needing_barcodes CASCADE;
DROP VIEW IF EXISTS inventory.products_with_categories CASCADE;

-- Remove store-specific inventory columns from global product catalog
ALTER TABLE inventory.products
  DROP COLUMN IF EXISTS total_stock,
  DROP COLUMN IF EXISTS active_batches_count,
  DROP COLUMN IF EXISTS avg_days_to_expiry;

-- Recreate views without the removed columns
-- These views now properly reflect that products is a catalog table

-- View: expiring_products - shows products with batches expiring soon
-- Slim view with only essential columns for expiry alerts
CREATE OR REPLACE VIEW inventory.expiring_products
WITH (security_invoker = on) AS
SELECT
  p.product_id,
  p.name,
  p.brand,
  p.barcode,
  c.category_code,
  b.batch_id,
  b.store_id,
  b.expiry_date,
  b.current_quantity,
  (b.expiry_date - CURRENT_DATE) AS days_to_expiry
FROM inventory.products p
JOIN inventory.categories c ON p.category_id = c.category_id
JOIN inventory.batches b ON p.product_id = b.product_id
WHERE b.expiry_date <= (CURRENT_DATE + INTERVAL '7 days')
  AND b.status::text = 'active'
  AND b.current_quantity > 0;

ALTER VIEW inventory.expiring_products OWNER TO postgres;

-- View: my_store_products - products for user's stores with inventory stats
-- Now joins store_inventory_stats for real-time inventory metrics
CREATE OR REPLACE VIEW inventory.my_store_products
WITH (security_invoker = on) AS
SELECT
  p.product_id,
  p.sku,
  p.name,
  p.description,
  p.brand,
  p.unit_type,
  p.typical_shelf_life_days,
  p.base_cost_price,
  p.base_selling_price,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.barcode,
  p.image_url,
  p.open_food_facts_data,
  p.last_verified,
  p.barcode_type,
  p.is_verified,
  p.verification_count,
  p.last_scanned_at,
  p.category_id,
  sp.store_id,
  sp.cost_price AS store_cost_price,
  sp.selling_price AS store_selling_price,
  sp.is_active AS store_is_active,
  sp.store_sku,
  sp.supplier_code,
  c.category_code,
  c.display_name_en AS category_name,
  -- Real-time inventory stats from view
  COALESCE(sis.total_stock, 0) AS total_stock,
  COALESCE(sis.active_batches_count, 0) AS active_batches_count,
  sis.avg_days_to_expiry
FROM inventory.products p
JOIN inventory.store_products sp ON p.product_id = sp.product_id
JOIN inventory.categories c ON p.category_id = c.category_id
LEFT JOIN inventory.store_inventory_stats sis
  ON sis.store_id = sp.store_id AND sis.product_id = sp.product_id
WHERE sp.store_id IN (
  SELECT su.store_id
  FROM business.store_users su
  WHERE su.user_id = auth.uid()
);

ALTER VIEW inventory.my_store_products OWNER TO postgres;

-- View: products_needing_barcodes - catalog products without valid barcodes
-- Slim view with only essential columns for barcode management
CREATE OR REPLACE VIEW inventory.products_needing_barcodes
WITH (security_invoker = on) AS
SELECT
  p.product_id,
  p.sku,
  p.name,
  p.brand,
  p.barcode,
  p.is_verified,
  c.category_code
FROM inventory.products p
JOIN inventory.categories c ON p.category_id = c.category_id
WHERE p.barcode IS NULL
   OR p.barcode = ''
   OR p.is_verified = false;

ALTER VIEW inventory.products_needing_barcodes OWNER TO postgres;

-- View: products_with_categories - catalog products with category info
CREATE OR REPLACE VIEW inventory.products_with_categories
WITH (security_invoker = on) AS
SELECT
  p.product_id,
  p.sku,
  p.name,
  p.description,
  p.brand,
  p.unit_type,
  p.typical_shelf_life_days,
  p.base_cost_price,
  p.base_selling_price,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.barcode,
  p.image_url,
  p.open_food_facts_data,
  p.last_verified,
  p.barcode_type,
  p.is_verified,
  p.verification_count,
  p.last_scanned_at,
  p.category_id,
  c.category_code,
  c.display_name_en AS category_display_name_en,
  c.display_name_fr AS category_display_name_fr,
  c.typical_shelf_life_days AS category_shelf_life,
  COALESCE(p.typical_shelf_life_days, c.typical_shelf_life_days) AS effective_shelf_life
FROM inventory.products p
JOIN inventory.categories c ON p.category_id = c.category_id;

ALTER VIEW inventory.products_with_categories OWNER TO postgres;

-- Re-grant permissions on views
GRANT ALL ON TABLE inventory.expiring_products TO anon;
GRANT ALL ON TABLE inventory.expiring_products TO authenticated;
GRANT ALL ON TABLE inventory.expiring_products TO service_role;

GRANT ALL ON TABLE inventory.my_store_products TO anon;
GRANT ALL ON TABLE inventory.my_store_products TO authenticated;
GRANT ALL ON TABLE inventory.my_store_products TO service_role;

GRANT ALL ON TABLE inventory.products_needing_barcodes TO anon;
GRANT ALL ON TABLE inventory.products_needing_barcodes TO authenticated;
GRANT ALL ON TABLE inventory.products_needing_barcodes TO service_role;

GRANT ALL ON TABLE inventory.products_with_categories TO anon;
GRANT ALL ON TABLE inventory.products_with_categories TO authenticated;
GRANT ALL ON TABLE inventory.products_with_categories TO service_role;

-- Update table comment to reflect the architecture
COMMENT ON TABLE inventory.products IS
'Global product catalog shared across all stores. For store-specific inventory metrics (stock levels, batch counts, expiry stats), use the store_inventory_stats view which aggregates data from the batches table in real-time.';
