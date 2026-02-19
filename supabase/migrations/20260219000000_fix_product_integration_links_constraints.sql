-- Migration: Add missing unique constraints to product_integration_links
-- Purpose: The original migration (20260212000000_create_product_integration_links.sql)
-- declared both constraints in the CREATE TABLE statement, but the table was created
-- without them. This migration adds them idempotently.
--
-- pil_unique_integration_external: one Square variation ID maps to exactly one product
-- pil_unique_product_integration:  one product has at most one link per integration type
--
-- Both are required for ON CONFLICT upserts in bulk_create_integration_links.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'inventory.product_integration_links'::regclass
      AND conname = 'pil_unique_integration_external'
  ) THEN
    ALTER TABLE inventory.product_integration_links
    ADD CONSTRAINT pil_unique_integration_external UNIQUE (integration_type, external_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'inventory.product_integration_links'::regclass
      AND conname = 'pil_unique_product_integration'
  ) THEN
    ALTER TABLE inventory.product_integration_links
    ADD CONSTRAINT pil_unique_product_integration UNIQUE (product_id, integration_type);
  END IF;
END $$;
