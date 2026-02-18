-- Migration: add_sort_by_store_quantity_and_untracked_qty
--
-- Extends get_products_paginated to support sorting by:
--   - store_quantity (POS-synced quantity from store_products.quantity)
--   - untracked_qty (computed: GREATEST(0, store_quantity - batch_tracked_stock))
--
-- Also adds untracked_qty as a computed column in the result set.
--
-- DROP + CREATE required because adding a column changes the return type.

DROP FUNCTION IF EXISTS public.get_products_paginated(uuid, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS inventory.get_products_paginated(uuid, text, text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION inventory.get_products_paginated(
  p_store_id uuid,
  p_category_code text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_field text DEFAULT 'created_at',
  p_sort_direction text DEFAULT 'desc',
  p_page_size integer DEFAULT 20,
  p_page_offset integer DEFAULT 0
)
RETURNS TABLE(
  product_id uuid,
  sku character varying,
  name character varying,
  description text,
  brand character varying,
  unit_type character varying,
  typical_shelf_life_days integer,
  base_cost_price numeric,
  base_selling_price numeric,
  total_stock numeric,
  active_batches_count integer,
  avg_days_to_expiry numeric,
  created_by uuid,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  barcode text,
  image_url text,
  open_food_facts_data jsonb,
  last_verified timestamp without time zone,
  barcode_type character varying,
  is_verified boolean,
  verification_count integer,
  last_scanned_at timestamp without time zone,
  category_id uuid,
  store_cost_price numeric,
  store_selling_price numeric,
  store_is_active boolean,
  store_sku character varying,
  supplier_code character varying,
  category_code text,
  category_display_name text,
  category_display_name_fr text,
  calculated_total_stock numeric,
  calculated_active_batches_count bigint,
  total_count bigint,
  store_quantity numeric,
  untracked_qty numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  RETURN QUERY
  WITH filtered_products AS (
    SELECT
      p.product_id,
      p.sku,
      p.name,
      p.description,
      p.brand,
      p.unit_type,
      p.typical_shelf_life_days,
      p.base_cost_price,
      p.base_selling_price,
      COALESCE(sis.total_stock, 0) AS total_stock,
      COALESCE(sis.active_batches_count, 0)::integer AS active_batches_count,
      sis.avg_days_to_expiry,
      p.created_by,
      p.created_at,
      p.updated_at,
      p.barcode,
      p.image_url,
      p.open_food_facts_data,
      p.last_verified,
      p.barcode_type,
      p.is_verified,
      p.verification_count,
      p.last_scanned_at,
      p.category_id,
      sp.cost_price AS store_cost_price,
      sp.selling_price AS store_selling_price,
      sp.is_active AS store_is_active,
      sp.store_sku,
      sp.supplier_code,
      c.category_code,
      c.display_name_en AS category_display_name,
      c.display_name_fr AS category_display_name_fr,
      COALESCE(sis.total_stock, 0) AS calculated_total_stock,
      COALESCE(sis.active_batches_count, 0) AS calculated_active_batches_count,
      COUNT(*) OVER() AS total_count,
      sp.quantity AS store_quantity,
      GREATEST(0, COALESCE(sp.quantity, 0) - COALESCE(sis.total_stock, 0)) AS untracked_qty
    FROM inventory.store_products sp
    INNER JOIN inventory.products p ON sp.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    LEFT JOIN inventory.store_inventory_stats sis
      ON sis.store_id = sp.store_id AND sis.product_id = sp.product_id
    WHERE
      sp.store_id = p_store_id
      AND sp.is_active = true
      AND (p_category_code IS NULL OR c.category_code = p_category_code)
      AND (p_brand IS NULL OR p.brand = p_brand)
      AND (
        p_search IS NULL
        OR p.name ILIKE '%' || p_search || '%'
        OR p.brand ILIKE '%' || p_search || '%'
        OR p.barcode ILIKE '%' || p_search || '%'
        OR p.sku ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    fp.product_id,
    fp.sku,
    fp.name,
    fp.description,
    fp.brand,
    fp.unit_type,
    fp.typical_shelf_life_days,
    fp.base_cost_price,
    fp.base_selling_price,
    fp.total_stock,
    fp.active_batches_count,
    fp.avg_days_to_expiry,
    fp.created_by,
    fp.created_at,
    fp.updated_at,
    fp.barcode,
    fp.image_url,
    fp.open_food_facts_data,
    fp.last_verified,
    fp.barcode_type,
    fp.is_verified,
    fp.verification_count,
    fp.last_scanned_at,
    fp.category_id,
    fp.store_cost_price,
    fp.store_selling_price,
    fp.store_is_active,
    fp.store_sku,
    fp.supplier_code,
    fp.category_code,
    fp.category_display_name,
    fp.category_display_name_fr,
    fp.calculated_total_stock,
    fp.calculated_active_batches_count,
    fp.total_count,
    fp.store_quantity,
    fp.untracked_qty
  FROM filtered_products fp
  ORDER BY
    CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'asc' THEN fp.name END ASC,
    CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'desc' THEN fp.name END DESC,
    CASE WHEN p_sort_field = 'brand' AND p_sort_direction = 'asc' THEN fp.brand END ASC,
    CASE WHEN p_sort_field = 'brand' AND p_sort_direction = 'desc' THEN fp.brand END DESC,
    CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'asc' THEN fp.category_display_name END ASC,
    CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'desc' THEN fp.category_display_name END DESC,
    CASE WHEN p_sort_field = 'total_stock' AND p_sort_direction = 'asc' THEN fp.calculated_total_stock END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'total_stock' AND p_sort_direction = 'desc' THEN fp.calculated_total_stock END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'active_batches_count' AND p_sort_direction = 'asc' THEN fp.calculated_active_batches_count END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'active_batches_count' AND p_sort_direction = 'desc' THEN fp.calculated_active_batches_count END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'base_selling_price' AND p_sort_direction = 'asc' THEN fp.base_selling_price END ASC,
    CASE WHEN p_sort_field = 'base_selling_price' AND p_sort_direction = 'desc' THEN fp.base_selling_price END DESC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN fp.created_at END ASC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN fp.created_at END DESC,
    CASE WHEN p_sort_field = 'store_quantity' AND p_sort_direction = 'asc' THEN fp.store_quantity END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'store_quantity' AND p_sort_direction = 'desc' THEN fp.store_quantity END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'untracked_qty' AND p_sort_direction = 'asc' THEN fp.untracked_qty END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'untracked_qty' AND p_sort_direction = 'desc' THEN fp.untracked_qty END DESC NULLS LAST
  LIMIT p_page_size
  OFFSET p_page_offset;
END;
$$;

ALTER FUNCTION inventory.get_products_paginated(
  uuid, text, text, text, text, text, integer, integer
) OWNER TO postgres;

COMMENT ON FUNCTION inventory.get_products_paginated(
  uuid, text, text, text, text, text, integer, integer
) IS 'Paginated product listing with filtering, search, and sorting. Supports store_quantity (POS-synced) and untracked_qty (store_quantity - batch_tracked_stock) sort fields.';

-- Update public wrapper to include untracked_qty
CREATE OR REPLACE FUNCTION public.get_products_paginated(
  p_store_id uuid,
  p_category_code text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_sort_field text DEFAULT 'created_at',
  p_sort_direction text DEFAULT 'desc',
  p_page_size integer DEFAULT 20,
  p_page_offset integer DEFAULT 0
)
RETURNS TABLE(
  product_id uuid,
  sku character varying,
  name character varying,
  description text,
  brand character varying,
  unit_type character varying,
  typical_shelf_life_days integer,
  base_cost_price numeric,
  base_selling_price numeric,
  total_stock numeric,
  active_batches_count integer,
  avg_days_to_expiry numeric,
  created_by uuid,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  barcode text,
  image_url text,
  open_food_facts_data jsonb,
  last_verified timestamp without time zone,
  barcode_type character varying,
  is_verified boolean,
  verification_count integer,
  last_scanned_at timestamp without time zone,
  category_id uuid,
  store_cost_price numeric,
  store_selling_price numeric,
  store_is_active boolean,
  store_sku character varying,
  supplier_code character varying,
  category_code text,
  category_display_name text,
  category_display_name_fr text,
  calculated_total_stock numeric,
  calculated_active_batches_count bigint,
  total_count bigint,
  store_quantity numeric,
  untracked_qty numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM inventory.get_products_paginated(
    p_store_id,
    p_category_code,
    p_brand,
    NULL::text,  -- p_search not exposed in public wrapper
    p_sort_field,
    p_sort_direction,
    p_page_size,
    p_page_offset
  );
END;
$$;

ALTER FUNCTION public.get_products_paginated(
  uuid, text, text, text, text, integer, integer
) OWNER TO postgres;

COMMENT ON FUNCTION public.get_products_paginated(
  uuid, text, text, text, text, integer, integer
) IS 'Public wrapper for inventory.get_products_paginated. Supports store_quantity and untracked_qty sort fields.';

GRANT EXECUTE ON FUNCTION public.get_products_paginated(uuid, text, text, text, text, integer, integer) TO authenticated;
