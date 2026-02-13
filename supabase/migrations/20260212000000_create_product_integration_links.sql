-- Migration: Create product_integration_links table
-- Purpose: Decouple integration-specific metadata (Square, Shopify, CSV, etc.) from the products table.
-- This enables multi-integration support and fixes the SKU conflict bug where
-- catalog sync's ON CONFLICT (square_variation_id) fails when a product exists
-- from CSV/manual import with the same SKU but no Square metadata.

-- ============================================================================
-- 1. Create table
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory.product_integration_links (
  link_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid NOT NULL REFERENCES inventory.products(product_id) ON DELETE CASCADE,
  integration_type   varchar(50) NOT NULL,        -- 'square', 'shopify', 'csv', 'manual'
  external_id        varchar(255) NOT NULL,        -- square_variation_id, shopify_variant_id, etc.
  external_parent_id varchar(255),                 -- square_item_id (shared across variations)
  external_sku       varchar(255),                 -- SKU as known to the integration
  external_name      varchar(500),                 -- Name from integration (for mismatch logging)
  is_authoritative   boolean DEFAULT false,         -- Does this integration own canonical updates?
  claim_source       varchar(50),                   -- 'auto_id', 'auto_sku', 'manual'
  name_mismatch_logged boolean DEFAULT false,
  metadata           jsonb DEFAULT '{}',
  synced_at          timestamp without time zone,
  created_at         timestamp without time zone DEFAULT now() NOT NULL,
  updated_at         timestamp without time zone DEFAULT now() NOT NULL,

  -- One link per integration per external ID (e.g., one Square variation can only link to one product)
  CONSTRAINT pil_unique_integration_external UNIQUE (integration_type, external_id),
  -- One link per product per integration type (a product can't have two Square links)
  CONSTRAINT pil_unique_product_integration UNIQUE (product_id, integration_type)
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
-- Primary lookup: find product by integration + external ID
CREATE INDEX IF NOT EXISTS idx_pil_integration_external
  ON inventory.product_integration_links (integration_type, external_id);

-- Reverse lookup: find all integration links for a product
CREATE INDEX IF NOT EXISTS idx_pil_product_id
  ON inventory.product_integration_links (product_id);

-- SKU-based claim lookup: find products by integration + external SKU
CREATE INDEX IF NOT EXISTS idx_pil_integration_sku
  ON inventory.product_integration_links (integration_type, external_sku);

-- ============================================================================
-- 3. Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION inventory.update_pil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pil_updated_at ON inventory.product_integration_links;
CREATE TRIGGER trg_pil_updated_at
  BEFORE UPDATE ON inventory.product_integration_links
  FOR EACH ROW
  EXECUTE FUNCTION inventory.update_pil_updated_at();

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================
ALTER TABLE inventory.product_integration_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read links for products in stores they have access to
CREATE POLICY "pil_select_authenticated"
  ON inventory.product_integration_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory.store_products sp
      JOIN business.store_users su ON su.store_id = sp.store_id
      WHERE sp.product_id = product_integration_links.product_id
        AND su.user_id = auth.uid()
        AND su.is_active = true
    )
  );

-- Service role gets full access (for sync operations)
CREATE POLICY "pil_all_service_role"
  ON inventory.product_integration_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. Backfill from existing Square products
-- ============================================================================
INSERT INTO inventory.product_integration_links (
  product_id,
  integration_type,
  external_id,
  external_parent_id,
  external_sku,
  external_name,
  is_authoritative,
  claim_source,
  synced_at,
  created_at,
  updated_at
)
SELECT
  p.product_id,
  'square',
  p.square_variation_id,
  p.square_item_id,
  p.sku,
  p.name,
  p.is_square_managed,
  'auto_id',
  p.square_synced_at,
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM inventory.products p
WHERE p.square_variation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- NOTE: Square columns on products table are NOT dropped yet.
-- They remain for backward compatibility during the transition period.
