-- ============================================================================
-- Migration: Add missing fields to batch RPC functions
-- Purpose: Fix type casting issues by returning actual DB values
-- Issues Fixed:
--   1. Add initial_quantity to return values
--   2. Add verification_status to return values
--   3. Ensure batch_number nullability matches DB schema
-- ============================================================================

-- Update find_available_batches_by_barcode to return missing fields
CREATE OR REPLACE FUNCTION public.find_available_batches_by_barcode(
  barcode_param TEXT,
  store_id_param UUID
)
RETURNS TABLE(
  batch_id UUID,
  batch_number VARCHAR,
  product_id UUID,
  store_id UUID,
  expiry_date DATE,
  current_quantity NUMERIC,
  available_quantity NUMERIC,
  initial_quantity NUMERIC,
  cost_price NUMERIC,
  selling_price NUMERIC,
  location_code VARCHAR,
  status VARCHAR,
  verification_status VARCHAR,
  created_at TIMESTAMP,
  product_name VARCHAR,
  brand_name VARCHAR,
  product_barcode TEXT,
  category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, business, scoring
AS $$
BEGIN
  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = auth.uid()
      AND store_id = store_id_param
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  -- Return available batches for the product matching this barcode
  RETURN QUERY
  SELECT
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.initial_quantity,
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
    b.verification_status,
    b.created_at,
    p.name AS product_name,
    p.brand AS brand_name,
    p.barcode AS product_barcode,
    c.display_name_en AS category_name
  FROM inventory.batches b
  INNER JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE p.barcode = barcode_param
    AND b.store_id = store_id_param
    AND b.status = 'active'
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_available_batches_by_barcode(TEXT, UUID)
  TO authenticated;

COMMENT ON FUNCTION public.find_available_batches_by_barcode IS
'Securely finds available batches by barcode with store access verification. Includes all batch metadata.';

-- Update get_available_batches_by_product to return missing fields
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
  initial_quantity NUMERIC,
  cost_price NUMERIC,
  selling_price NUMERIC,
  location_code VARCHAR,
  status VARCHAR,
  verification_status VARCHAR,
  created_at TIMESTAMP,
  product_name VARCHAR,
  brand_name VARCHAR,
  barcode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = auth.uid()
      AND store_id = p_store_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  RETURN QUERY
  SELECT
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.initial_quantity,
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
    b.verification_status,
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

GRANT EXECUTE ON FUNCTION inventory.get_available_batches_by_product(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION inventory.get_available_batches_by_product IS
  'Retrieves available batches for a specific product at a store. Handles complex join through store_products bridge table. Returns batches ordered by expiry date (FIFO) with complete metadata.';
