-- Migration: Add image_url to inventory.store_products
--
-- Context: Enable database storage for product images.
-- Required for syncing product images from Square POS integration.
--
-- Changes:
--   1. Add nullable image_url column to store_products table

-- Step 1: Add image_url column (safe operation)
ALTER TABLE inventory.store_products
  ADD COLUMN IF NOT EXISTS image_url text;

-- Step 2: Add documentation
COMMENT ON COLUMN inventory.store_products.image_url IS
'URL of the product image from external source (e.g., Square). Nullable.';