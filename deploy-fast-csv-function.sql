-- Deploy this in your Supabase SQL Editor to enable ultra-fast CSV uploads
-- Copy this entire SQL and run it in: https://supabase.com/dashboard/project/jrgmetdsohowtxickqij/sql

-- Ultra-fast CSV import with simple duplicate skipping
-- This combines duplicate detection + processing in ONE database call

CREATE OR REPLACE FUNCTION fast_csv_import_skip_duplicates(
  p_store_id UUID,
  p_user_id UUID,
  p_csv_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_detection_start TIMESTAMP := clock_timestamp();
  database_operations_start TIMESTAMP;
  processed_count INTEGER := 0;
  skipped_count INTEGER := 0;
  errors TEXT[] := '{}';
  duplicates_skipped JSONB[] := '{}';
  duplicate_detection_ms INTEGER;
  database_operations_ms INTEGER;
BEGIN
  -- Validate store access
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
      'skipped', 0
    );
  END IF;

  -- STEP 1: MEGA-FAST duplicate detection using CTEs
  -- This approach processes ALL items in a single scan
  database_operations_start := clock_timestamp();
  
  WITH csv_items AS (
    -- Parse all CSV data
    SELECT 
      (item->>'SKU')::TEXT as sku,
      (item->>'Product_Name')::TEXT as product_name,
      (item->>'Category')::TEXT as category,
      (item->>'Quantity')::INTEGER as quantity,
      (item->>'Expiry_Date')::DATE as expiry_date,
      (item->>'Brand')::TEXT as brand,
      (item->>'Cost_Price')::NUMERIC as cost_price,
      (item->>'Selling_Price')::NUMERIC as selling_price,
      (item->>'Location')::TEXT as location_code,
      (item->>'Unit_Type')::TEXT as unit_type,
      item as original_item
    FROM jsonb_array_elements(p_csv_data) as item
  ),
  
  existing_product_check AS (
    -- Get all existing products for these SKUs in one query
    SELECT ci.sku, p.product_id
    FROM csv_items ci
    LEFT JOIN inventory.products p ON p.sku = ci.sku
  ),
  
  duplicate_batches AS (
    -- Find ALL duplicate batches in one query
    SELECT DISTINCT
      ci.sku,
      ci.expiry_date,
      ci.product_name
    FROM csv_items ci
    JOIN inventory.products p ON p.sku = ci.sku
    WHERE EXISTS (
      SELECT 1 FROM inventory.batches b
      WHERE b.store_id = p_store_id
        AND b.product_id = p.product_id
        AND b.expiry_date = ci.expiry_date
        AND b.status = 'active'
        AND b.current_quantity > 0
    )
  ),
  
  non_duplicate_items AS (
    -- Filter out duplicates - only process new items
    SELECT ci.*
    FROM csv_items ci
    LEFT JOIN duplicate_batches db ON db.sku = ci.sku AND db.expiry_date = ci.expiry_date
    WHERE db.sku IS NULL
  ),
  
  -- STEP 2: Bulk create all new products in one statement
  new_products AS (
    INSERT INTO inventory.products (
      sku, name, brand, category, unit_type,
      typical_shelf_life_days, base_cost_price, base_selling_price, created_by
    )
    SELECT DISTINCT
      ndi.sku,
      ndi.product_name,
      COALESCE(ndi.brand, 'Unknown'),
      COALESCE(ndi.category, 'dry_goods'),
      COALESCE(ndi.unit_type, 'units'),
      CASE 
        WHEN ndi.category = 'dairy' THEN 14
        WHEN ndi.category = 'bakery' THEN 3
        WHEN ndi.category = 'produce' THEN 7
        ELSE 30
      END,
      COALESCE(ndi.cost_price, 0),
      COALESCE(ndi.selling_price, 0),
      p_user_id
    FROM non_duplicate_items ndi
    LEFT JOIN existing_product_check epc ON epc.sku = ndi.sku
    WHERE epc.product_id IS NULL
    ON CONFLICT (sku) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING sku, product_id
  ),
  
  all_products AS (
    -- Combine existing and new products
    SELECT sku, product_id FROM existing_product_check WHERE product_id IS NOT NULL
    UNION ALL
    SELECT sku, product_id FROM new_products
  ),
  
  -- STEP 3: Bulk create store_products associations
  store_products_upsert AS (
    INSERT INTO inventory.store_products (
      store_id, product_id, selling_price, cost_price, is_active, added_by
    )
    SELECT DISTINCT
      p_store_id,
      ap.product_id,
      COALESCE(ndi.selling_price, 0),
      COALESCE(ndi.cost_price, 0),
      true,
      p_user_id
    FROM non_duplicate_items ndi
    JOIN all_products ap ON ap.sku = ndi.sku
    ON CONFLICT (store_id, product_id) DO UPDATE SET
      selling_price = EXCLUDED.selling_price,
      cost_price = EXCLUDED.cost_price,
      updated_at = NOW()
    RETURNING store_id, product_id
  ),
  
  -- STEP 4: Bulk create all batches in one statement
  new_batches AS (
    INSERT INTO inventory.batches (
      store_id, product_id, batch_number,
      initial_quantity, current_quantity, cost_price, selling_price,
      expiry_date, location_code, batch_source, status, created_by
    )
    SELECT 
      p_store_id,
      ap.product_id,
      'CSV-' || extract(epoch from now())::TEXT || '-' || gen_random_uuid()::TEXT,
      ndi.quantity,
      ndi.quantity,
      COALESCE(ndi.cost_price, 0),
      COALESCE(ndi.selling_price, 0),
      ndi.expiry_date,
      COALESCE(ndi.location_code, 'MAIN'),
      'csv_import',
      'active',
      p_user_id
    FROM non_duplicate_items ndi
    JOIN all_products ap ON ap.sku = ndi.sku
    RETURNING batch_id, product_id
  )
  
  -- Count results
  SELECT COUNT(*) INTO processed_count FROM new_batches;
  
  -- Count skipped duplicates and build skip list
  SELECT 
    COUNT(*),
    array_agg(
      jsonb_build_object(
        'sku', sku,
        'product_name', product_name,
        'expiry_date', expiry_date,
        'reason', 'Duplicate batch with same expiry date'
      )
    )
  INTO skipped_count, duplicates_skipped
  FROM duplicate_batches;

  -- Calculate timing
  duplicate_detection_ms := EXTRACT(milliseconds FROM database_operations_start - duplicate_detection_start)::INTEGER;
  database_operations_ms := EXTRACT(milliseconds FROM clock_timestamp() - database_operations_start)::INTEGER;

  -- Return comprehensive results
  RETURN jsonb_build_object(
    'success', true,
    'processed', processed_count,
    'skipped', COALESCE(skipped_count, 0),
    'total_items', jsonb_array_length(p_csv_data),
    'errors', errors,
    'duplicates_skipped', COALESCE(duplicates_skipped, '{}'),
    'duplicate_detection_ms', duplicate_detection_ms,
    'database_operations_ms', database_operations_ms,
    'method', 'ultra_fast_skip_duplicates'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error with partial results
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'processed', 0,
    'skipped', 0,
    'total_items', jsonb_array_length(p_csv_data)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fast_csv_import_skip_duplicates TO authenticated;

-- Create index for super-fast duplicate detection if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_batches_store_product_expiry_active 
ON inventory.batches (store_id, product_id, expiry_date, status, current_quantity) 
WHERE status = 'active' AND current_quantity > 0;

-- Test the function exists
SELECT 'fast_csv_import_skip_duplicates function deployed successfully!' as status;