-- Migration: Update store_inventory_stats view to include integration quantity
-- Purpose: Add quantity and quantity_updated_at from store_products so the frontend
-- can display discrepancies between integration-reported quantity and batch-derived total_stock.

CREATE OR REPLACE VIEW inventory.store_inventory_stats AS
SELECT
  sp.store_id,
  sp.product_id,
  -- Integration-reported quantity (from Square, Shopify, etc.)
  COALESCE(sp.quantity, 0) as quantity,
  sp.quantity_updated_at,
  -- Batch-derived total stock (LIFO's truth)
  COALESCE(
    SUM(b.current_quantity) FILTER (WHERE b.status IN ('active', 'draft')),
    0
  ) as total_stock,
  COUNT(b.batch_id) FILTER (WHERE b.status = 'active') as active_batches_count,
  COUNT(b.batch_id) FILTER (WHERE b.status = 'draft') as incomplete_batches_count,
  AVG(
    CASE
      WHEN b.expiry_date IS NOT NULL THEN (b.expiry_date::date - CURRENT_DATE::date)
      ELSE NULL
    END
  ) FILTER (
    WHERE b.status = 'active'
    AND b.expiry_date IS NOT NULL
  ) as avg_days_to_expiry,
  MIN(b.expiry_date) FILTER (WHERE b.status = 'active') as earliest_expiry_date,
  MAX(b.expiry_date) FILTER (WHERE b.status = 'active') as latest_expiry_date,
  COALESCE(
    SUM(b.reserved_quantity) FILTER (WHERE b.status = 'active'),
    0
  ) as total_reserved_quantity,
  COALESCE(
    SUM(b.current_quantity - b.reserved_quantity) FILTER (WHERE b.status IN ('active', 'draft')),
    0
  ) as available_quantity
FROM inventory.store_products sp
LEFT JOIN inventory.batches b
  ON b.product_id = sp.product_id
  AND b.store_id = sp.store_id
GROUP BY sp.store_id, sp.product_id, sp.quantity, sp.quantity_updated_at;
