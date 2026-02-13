-- Migration: Add quantity columns to store_products
-- Purpose: Store the integration-reported quantity (e.g., from Square inventory sync)
-- directly on store_products. This decouples "how many does the POS say we have"
-- from "how many do our batches track" (total_stock in store_inventory_stats).
-- The frontend can display discrepancies between quantity and total_stock.

ALTER TABLE inventory.store_products
  ADD COLUMN IF NOT EXISTS quantity decimal(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_updated_at timestamp without time zone;
