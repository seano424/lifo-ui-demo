-- Bulk CSV Import Stored Procedure for Maximum Performance
-- This replaces 100s of individual queries with a single bulk transaction

CREATE OR REPLACE FUNCTION bulk_csv_import(
  p_store_id UUID,
  p_user_id UUID,
  p_csv_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  product_id UUID;
  batch_id UUID;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  
  -- Temporary data structures
  products_to_insert JSONB[] := '{}';
  store_products_to_upsert JSONB[] := '{}';
  batches_to_insert JSONB[] := '{}';
  
  -- Bulk insert results
  inserted_products RECORD;
  existing_products RECORD;
BEGIN
  -- Validate store access first
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users 
    WHERE store_id = p_store_id 
    AND user_id = p_user_id 
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied to store',
      'processed', 0,
      'errors', ARRAY['Access denied to store']
    );
  END IF;

  -- Step 1: Bulk create products that don't exist
  -- Get all unique SKUs from CSV
  WITH csv_products AS (
    SELECT DISTINCT
      (item->>'SKU')::TEXT as sku,
      (item->>'Product_Name')::TEXT as name,
      (item->>'Brand')::TEXT as brand,
      (item->>'Category')::TEXT as category,
      (item->>'Unit_Type')::TEXT as unit_type,
      COALESCE((item->>'Cost_Price')::NUMERIC, 0) as base_cost_price,
      COALESCE((item->>'Selling_Price')::NUMERIC, 0) as base_selling_price
    FROM jsonb_array_elements(p_csv_data) as item
  ),
  existing_product_check AS (
    SELECT cp.sku, p.product_id
    FROM csv_products cp
    LEFT JOIN inventory.products p ON p.sku = cp.sku
  ),
  new_products AS (
    SELECT cp.*
    FROM csv_products cp
    LEFT JOIN existing_product_check epc ON epc.sku = cp.sku
    WHERE epc.product_id IS NULL
  )
  -- Bulk insert new products
  INSERT INTO inventory.products (
    sku, name, brand, category, unit_type, 
    base_cost_price, base_selling_price, 
    typical_shelf_life_days, created_by
  )
  SELECT 
    sku, name, brand, category, 
    COALESCE(unit_type, 'units'),
    base_cost_price, base_selling_price,
    CASE 
      WHEN category = 'fresh_produce' THEN 7
      WHEN category = 'dairy' THEN 14
      WHEN category = 'bakery' THEN 3
      WHEN category = 'meat' THEN 5
      WHEN category = 'fish' THEN 3
      WHEN category = 'frozen' THEN 90
      WHEN category = 'packaged' THEN 365
      WHEN category = 'beverages' THEN 180
      WHEN category = 'snacks' THEN 180
      ELSE 30
    END,
    p_user_id
  FROM new_products;

  -- Step 2: Bulk upsert store_products for all products
  WITH csv_store_products AS (
    SELECT DISTINCT
      p.product_id,
      (item->>'Selling_Price')::NUMERIC as selling_price,
      (item->>'Cost_Price')::NUMERIC as cost_price
    FROM jsonb_array_elements(p_csv_data) as item
    JOIN inventory.products p ON p.sku = (item->>'SKU')::TEXT
  )
  INSERT INTO inventory.store_products (
    store_id, product_id, selling_price, cost_price, 
    is_active, added_by
  )
  SELECT 
    p_store_id, product_id, 
    COALESCE(selling_price, 0), COALESCE(cost_price, 0),
    true, p_user_id
  FROM csv_store_products
  ON CONFLICT (store_id, product_id) 
  DO UPDATE SET 
    selling_price = EXCLUDED.selling_price,
    cost_price = EXCLUDED.cost_price,
    is_active = true,
    updated_at = NOW();

  -- Step 3: Bulk duplicate detection
  -- Get all batches that would be duplicates
  WITH csv_batches AS (
    SELECT 
      (item->>'SKU')::TEXT as sku,
      (item->>'Expiry_Date')::DATE as expiry_date,
      item
    FROM jsonb_array_elements(p_csv_data) as item
  ),
  duplicate_check AS (  
    SELECT cb.sku, cb.expiry_date
    FROM csv_batches cb
    JOIN inventory.products p ON p.sku = cb.sku
    WHERE EXISTS (
      SELECT 1 FROM inventory.batches b
      WHERE b.store_id = p_store_id
      AND b.product_id = p.product_id
      AND b.expiry_date = cb.expiry_date
      AND b.status = 'active'
    )
  ),
  -- Filter out duplicates from CSV data
  non_duplicate_batches AS (
    SELECT cb.item
    FROM csv_batches cb
    LEFT JOIN duplicate_check dc ON dc.sku = cb.sku AND dc.expiry_date = cb.expiry_date
    WHERE dc.sku IS NULL
  )
  -- Step 4: Bulk insert batches (non-duplicates only)
  INSERT INTO inventory.batches (
    store_id, product_id, batch_number, 
    initial_quantity, current_quantity,
    cost_price, selling_price, manufacture_date, expiry_date,
    location_code, batch_source, status, created_by
  )
  SELECT 
    p_store_id,
    p.product_id,
    COALESCE((item->>'Batch_Number')::TEXT, 'CSV-' || extract(epoch from now())::TEXT || '-' || gen_random_uuid()::TEXT),
    (item->>'Quantity')::INTEGER,
    (item->>'Quantity')::INTEGER,
    COALESCE((item->>'Cost_Price')::NUMERIC, 0),
    COALESCE((item->>'Selling_Price')::NUMERIC, 0),
    CASE 
      WHEN (item->>'Manufacture_Date') IS NOT NULL THEN (item->>'Manufacture_Date')::DATE
      ELSE NULL
    END,
    (item->>'Expiry_Date')::DATE,
    COALESCE((item->>'Location')::TEXT, 'MAIN'),
    'csv_import',
    'active',
    p_user_id
  FROM non_duplicate_batches ndb
  JOIN inventory.products p ON p.sku = (ndb.item->>'SKU')::TEXT;

  -- Get final counts
  GET DIAGNOSTICS processed_count = ROW_COUNT;

  -- Calculate warnings for duplicates
  WITH duplicate_count AS (
    SELECT COUNT(*) as dup_count
    FROM jsonb_array_elements(p_csv_data) as item
    JOIN inventory.products p ON p.sku = (item->>'SKU')::TEXT
    WHERE EXISTS (
      SELECT 1 FROM inventory.batches b
      WHERE b.store_id = p_store_id
      AND b.product_id = p.product_id
      AND b.expiry_date = (item->>'Expiry_Date')::DATE
      AND b.status = 'active'
    )
  )
  SELECT ARRAY['Skipped ' || dup_count || ' duplicate batches'] INTO warnings
  FROM duplicate_count
  WHERE dup_count > 0;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'processed', processed_count,
    'total_items', jsonb_array_length(p_csv_data),
    'errors', errors,
    'warnings', COALESCE(warnings, '{}'),
    'processing_time_ms', 0, -- Will be calculated in API
    'method', 'bulk_database_procedure'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error result
  RETURN jsonb_build_object(
    'success', false,
    'processed', 0,
    'error', SQLERRM,
    'errors', ARRAY[SQLERRM],
    'warnings', '{}',
    'total_items', jsonb_array_length(p_csv_data)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_csv_import TO authenticated;

-- Create function for bulk duplicate detection
CREATE OR REPLACE FUNCTION find_duplicate_batches_bulk(
  p_store_id UUID,
  p_sku_expiry_pairs TEXT
)
RETURNS TABLE (
  sku TEXT,
  expiry_date DATE,
  batch_id UUID,
  batch_number TEXT,
  current_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a simplified version - would need proper parsing of the pairs parameter
  -- For now, return empty result set and rely on application-level duplicate detection
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION find_duplicate_batches_bulk TO authenticated;