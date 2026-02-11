-- Migration: Add square_variation_id to Products table
-- This enables proper 1:1 mapping between Square CatalogItemVariations and LIFO Products
-- Also modifies triggers to preserve explicitly-provided timestamps from external sources
--
-- IMPORTANT: square_item_id is NOT unique (multiple variations share the same parent item)
--            square_variation_id IS unique (one product per variation)

-- ============================================================================
-- Step 0: Fix square_item_id constraint (remove unique, add index)
-- Multiple variations from the same item share the same square_item_id
-- ============================================================================

-- Drop the unique constraint if it exists (may have different names in different environments)
ALTER TABLE inventory.products
DROP CONSTRAINT IF EXISTS products_square_item_id_key;

ALTER TABLE inventory.products
DROP CONSTRAINT IF EXISTS products_square_item_id_unique;

-- Drop unique index if it exists
DROP INDEX IF EXISTS inventory.products_square_item_id_key;
DROP INDEX IF EXISTS inventory.idx_products_square_item_id;

-- Add a regular index for efficient lookups (not unique)
CREATE INDEX IF NOT EXISTS idx_products_square_item_id
ON inventory.products(square_item_id)
WHERE square_item_id IS NOT NULL;

-- ============================================================================
-- Step 1: Add square_variation_id to products table
-- ============================================================================

-- Add the column (unique to ensure 1:1 mapping with Square variations)
ALTER TABLE inventory.products
ADD COLUMN IF NOT EXISTS square_variation_id VARCHAR(255);

-- Add unique constraint (only one product per Square variation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_square_variation_id_key'
    ) THEN
        ALTER TABLE inventory.products
        ADD CONSTRAINT products_square_variation_id_key UNIQUE (square_variation_id);
    END IF;
END $$;

-- Create partial index for efficient lookups (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_products_square_variation_id
ON inventory.products(square_variation_id)
WHERE square_variation_id IS NOT NULL;

-- Add documentation comment
COMMENT ON COLUMN inventory.products.square_variation_id IS
  'Square CatalogItemVariation ID - used for inventory sync matching. Each variation maps to exactly one LIFO product.';

-- ============================================================================
-- Step 2: Backfill existing Square products from SKU pattern
-- ============================================================================

-- For products with SKU format 'SQUARE-{variation_id}', extract the variation_id
UPDATE inventory.products
SET square_variation_id = SUBSTRING(sku FROM 8)  -- Extract ID after 'SQUARE-'
WHERE sku LIKE 'SQUARE-%'
  AND square_variation_id IS NULL
  AND LENGTH(sku) > 7;

-- ============================================================================
-- Step 3: Remove square_variation_id from store_products (now redundant)
-- The Product now holds this info directly (1:1 mapping)
-- ============================================================================

-- Drop the column if it exists (may not exist in all environments)
ALTER TABLE inventory.store_products
DROP COLUMN IF EXISTS square_variation_id;

-- ============================================================================
-- Step 4: Modify triggers to preserve explicit timestamps
-- This allows Square sync to set timestamps from the API
-- ============================================================================

-- Update the main updated_at trigger function
-- Logic: Only set NOW() if updated_at wasn't explicitly changed
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set NOW() if updated_at is NULL or unchanged from old value
    -- This allows external sources (Square, CSV) to provide their own timestamps
    IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update the batches-specific trigger for inventory sync
-- (inventory sync uses calculated_at from Square for batch timestamps)
CREATE OR REPLACE FUNCTION public.update_batches_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set NOW() if updated_at is NULL or unchanged from old value
    -- This allows inventory sync to use Square's calculated_at timestamp
    IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 5: Update integrations schema trigger as well
-- ============================================================================

CREATE OR REPLACE FUNCTION integrations.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verification: Log the changes
-- ============================================================================

DO $$
DECLARE
    backfilled_count INTEGER;
    total_square_products INTEGER;
BEGIN
    -- Count backfilled products
    SELECT COUNT(*) INTO backfilled_count
    FROM inventory.products
    WHERE square_variation_id IS NOT NULL;

    -- Count total Square-managed products
    SELECT COUNT(*) INTO total_square_products
    FROM inventory.products
    WHERE is_square_managed = true;

    RAISE NOTICE 'Migration completed: % products with square_variation_id, % total Square-managed products',
        backfilled_count, total_square_products;
END $$;
