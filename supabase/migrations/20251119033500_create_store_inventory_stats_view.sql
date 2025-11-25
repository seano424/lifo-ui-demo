-- Migration: Create store_inventory_stats view for real-time inventory aggregation
--
-- Context: Replaces the store-specific columns removed from products table.
-- This view aggregates batch data to provide real-time inventory metrics per store.
--
-- Benefits:
--   - Always up-to-date (no stale data)
--   - No trigger overhead on writes
--   - Proper table boundaries (products = catalog, batches = inventory)
--   - Includes draft batch tracking for onboarding workflow
--
-- Usage:
--   Frontend can query this view directly via Supabase PostgREST
--   SELECT * FROM inventory.store_inventory_stats WHERE store_id = ?

-- Create the real-time inventory aggregation view
CREATE OR REPLACE VIEW inventory.store_inventory_stats AS
SELECT
  sp.store_id,
  sp.product_id,

  -- Total stock across all batches (active + draft)
  COALESCE(
    SUM(b.current_quantity) FILTER (WHERE b.status IN ('active', 'draft')),
    0
  ) as total_stock,

  -- Count of active batches (excludes drafts)
  COUNT(b.batch_id) FILTER (WHERE b.status = 'active') as active_batches_count,

  -- Count of incomplete batches needing expiry dates
  COUNT(b.batch_id) FILTER (WHERE b.status = 'draft') as incomplete_batches_count,

  -- Average days until expiry (only for active batches with expiry dates)
  AVG(
    CASE
      WHEN b.expiry_date IS NOT NULL THEN (b.expiry_date::date - CURRENT_DATE::date)
      ELSE NULL
    END
  ) FILTER (
    WHERE b.status = 'active'
    AND b.expiry_date IS NOT NULL
  ) as avg_days_to_expiry,

  -- Earliest expiry date among active batches
  MIN(b.expiry_date) FILTER (WHERE b.status = 'active') as earliest_expiry_date,

  -- Latest expiry date among active batches
  MAX(b.expiry_date) FILTER (WHERE b.status = 'active') as latest_expiry_date,

  -- Total reserved quantity
  COALESCE(
    SUM(b.reserved_quantity) FILTER (WHERE b.status = 'active'),
    0
  ) as total_reserved_quantity,

  -- Available quantity (total - reserved)
  COALESCE(
    SUM(b.current_quantity - b.reserved_quantity) FILTER (WHERE b.status IN ('active', 'draft')),
    0
  ) as available_quantity

FROM inventory.store_products sp
LEFT JOIN inventory.batches b
  ON b.product_id = sp.product_id
  AND b.store_id = sp.store_id
GROUP BY sp.store_id, sp.product_id;

-- Add comment explaining the view
COMMENT ON VIEW inventory.store_inventory_stats IS
'Real-time inventory metrics per store. Aggregates data from batches table. Use this instead of denormalized columns in products table.';

-- Performance indexes for the underlying batches table
-- These make the view queries fast even with thousands of batches

-- Index for filtering by store + product + status
CREATE INDEX IF NOT EXISTS idx_batches_store_product_status
  ON inventory.batches(store_id, product_id, status)
  WHERE status IN ('active', 'draft');

-- Index for expiry date queries on active batches
CREATE INDEX IF NOT EXISTS idx_batches_expiry_active
  ON inventory.batches(expiry_date)
  WHERE status = 'active' AND expiry_date IS NOT NULL;

-- Index for quantity aggregations
CREATE INDEX IF NOT EXISTS idx_batches_quantities
  ON inventory.batches(store_id, product_id, current_quantity, reserved_quantity)
  WHERE status IN ('active', 'draft');

-- Grant SELECT permissions on the view (adjust as needed for your RLS policies)
-- GRANT SELECT ON inventory.store_inventory_stats TO authenticated;
