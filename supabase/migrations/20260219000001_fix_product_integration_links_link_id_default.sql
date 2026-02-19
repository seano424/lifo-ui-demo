-- Migration: Add missing DEFAULT gen_random_uuid() to product_integration_links.link_id
-- Purpose: The original migration (20260212000000_create_product_integration_links.sql)
-- declared link_id as `uuid PRIMARY KEY DEFAULT gen_random_uuid()`, but the column was
-- created without the default. INSERTs that omit link_id (e.g. bulk_create_integration_links)
-- fail with "null value in column link_id violates not-null constraint".

ALTER TABLE inventory.product_integration_links
  ALTER COLUMN link_id SET DEFAULT gen_random_uuid();
