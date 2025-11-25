-- Migration: Remove store-specific columns from products table
--
-- Context: Products table is a global catalog shared across all stores.
-- Inventory metrics (total_stock, active_batches_count, avg_days_to_expiry)
-- are store-specific and should be computed via views from batches table.
--
-- Impact: These columns will be replaced by inventory.store_inventory_stats view
-- which provides real-time aggregation per store.

-- Remove store-specific inventory columns from global product catalog
ALTER TABLE inventory.products
  DROP COLUMN IF EXISTS total_stock CASCADE,
  DROP COLUMN IF EXISTS active_batches_count CASCADE,
  DROP COLUMN IF EXISTS avg_days_to_expiry CASCADE;

-- Add comment explaining new architecture
COMMENT ON TABLE inventory.products IS
'Global product catalog shared across all stores. For store-specific inventory metrics (stock levels, batch counts), use the store_inventory_stats view which aggregates data from the batches table.';
