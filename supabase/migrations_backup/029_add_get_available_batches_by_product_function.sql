-- RPC function to get available batches for a specific product at a store
-- This handles the complex join through store_products bridge table
-- Created: 2025-10-13
-- Purpose: Fix PostgREST schema relationship error in scan-out workflow

CREATE OR REPLACE FUNCTION inventory.get_available_batches_by_product(
  p_product_id UUID,
  p_store_id UUID
)
RETURNS TABLE (
  batch_id UUID,
  batch_number VARCHAR,
  product_id UUID,
  store_id UUID,
  expiry_date DATE,
  current_quantity NUMERIC,
  available_quantity NUMERIC,
  cost_price NUMERIC,
  selling_price NUMERIC,
  location_code VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  product_name VARCHAR,
  brand_name VARCHAR,
  barcode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, business, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
    b.created_at,
    p.name AS product_name,
    p.brand AS brand_name,
    p.barcode
  FROM inventory.batches b
  INNER JOIN inventory.store_products sp
    ON b.product_id = sp.product_id
    AND b.store_id = sp.store_id
  INNER JOIN inventory.products p
    ON sp.product_id = p.product_id
  WHERE b.product_id = p_product_id
    AND b.store_id = p_store_id
    AND b.status = 'active'
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION inventory.get_available_batches_by_product(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION inventory.get_available_batches_by_product IS
  'Retrieves available batches for a specific product at a store. Handles complex join through store_products bridge table. Returns batches ordered by expiry date (FIFO).';
