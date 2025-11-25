-- Migration: Remove triggers and functions that update removed columns
--
-- Context: Previous migration removed total_stock, active_batches_count, avg_days_to_expiry
-- from products table. Database triggers and functions still try to update these columns.
--
-- This migration:
-- 1. Drops trigger that updates product totals when batches change
-- 2. Drops the trigger function
-- 3. Drops paginated product functions that reference removed columns
--
-- Replacement: Use store_inventory_stats view for real-time inventory metrics

-- Step 1: Drop the trigger that updates product totals
DROP TRIGGER IF EXISTS trigger_update_product_totals ON inventory.batches;

-- Step 2: Drop the function that the trigger calls
DROP FUNCTION IF EXISTS public.update_product_totals CASCADE;

-- Step 3: Drop paginated product functions that reference removed columns
DROP FUNCTION IF EXISTS inventory.get_products_paginated CASCADE;
DROP FUNCTION IF EXISTS public.get_products_paginated CASCADE;

-- Step 4: Add helpful comment
COMMENT ON VIEW inventory.store_inventory_stats IS
'Real-time inventory metrics per store. Replaces denormalized columns (total_stock, active_batches_count, avg_days_to_expiry) that were removed from products table. Query this view directly for inventory data.';
