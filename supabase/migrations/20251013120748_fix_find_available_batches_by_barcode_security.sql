-- ============================================================================
-- FILE 1: fix_find_available_batches_by_barcode_security.sql
-- ============================================================================
-- Migration: Fix security issues in find_available_batches_by_barcode
-- Issues: 
--   1. Remove 'public' from search_path (SQL injection risk)
--   2. Add store access verification (RLS bypass)
-- ============================================================================

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
  cost_price NUMERIC,
  selling_price NUMERIC,
  location_code VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  product_name VARCHAR,
  brand_name VARCHAR,
  product_barcode TEXT,
  category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, business, scoring  -- FIXED: Removed 'public'
AS $$
BEGIN
  -- ADDED: Verify user has access to this store
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
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_available_batches_by_barcode(TEXT, UUID) 
  TO authenticated;

COMMENT ON FUNCTION public.find_available_batches_by_barcode IS 
'Securely finds available batches by barcode with store access verification';

