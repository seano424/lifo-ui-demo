-- Migration: Add p_exclude_drafts parameter to get_batches_paginated RPC function
-- This allows filtering out draft batches (batches without expiry dates)

-- Drop the existing function first (to update signature)
DROP FUNCTION IF EXISTS inventory.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, character varying,
  character varying, text, boolean, integer, date, date, date, date,
  character varying, character varying
);

-- Recreate with new p_exclude_drafts parameter
CREATE OR REPLACE FUNCTION inventory.get_batches_paginated(
  p_store_id uuid,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 20,
  p_product_id uuid DEFAULT NULL,
  p_status character varying DEFAULT NULL,
  p_exclude_drafts boolean DEFAULT NULL,  -- NEW PARAMETER
  p_location_code character varying DEFAULT NULL,
  p_supplier character varying DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_has_stock boolean DEFAULT NULL,
  p_expiring_in_days integer DEFAULT NULL,
  p_expiry_date_from date DEFAULT NULL,
  p_expiry_date_to date DEFAULT NULL,
  p_received_date_from date DEFAULT NULL,
  p_received_date_to date DEFAULT NULL,
  p_sort_field character varying DEFAULT 'expiry_date',
  p_sort_direction character varying DEFAULT 'asc'
)
RETURNS TABLE(
  batch_id uuid,
  batch_number character varying,
  product_id uuid,
  store_id uuid,
  expiry_date date,
  manufacture_date date,
  received_date date,
  current_quantity numeric,
  initial_quantity numeric,
  reserved_quantity numeric,
  available_quantity numeric,
  cost_price numeric,
  selling_price numeric,
  supplier character varying,
  location_code character varying,
  status character varying,
  batch_source character varying,
  scanned_barcode character varying,
  scan_confidence numeric,
  verification_status character varying,
  ocr_extracted_date text,
  ocr_confidence numeric,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  created_by uuid,
  product_name character varying,
  product_sku character varying,
  product_barcode text,
  product_brand character varying,
  product_description text,
  product_unit_type character varying,
  product_typical_shelf_life_days integer,
  product_image_url text,
  product_category_id uuid,
  product_category_code text,
  product_category_name_en text,
  product_category_name_fr text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_limit INTEGER;
BEGIN
  -- Authorization check using existing function
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  v_offset := p_page * p_page_size;
  v_limit := p_page_size;

  RETURN QUERY
  WITH filtered_batches AS (
    SELECT
      b.batch_id,
      b.batch_number,
      b.product_id,
      b.store_id,
      b.expiry_date,
      b.manufacture_date,
      b.received_date,
      b.current_quantity,
      b.initial_quantity,
      b.reserved_quantity,
      b.available_quantity,
      b.cost_price,
      b.selling_price,
      b.supplier,
      b.location_code,
      b.status,
      b.batch_source,
      b.scanned_barcode,
      b.scan_confidence,
      b.verification_status,
      b.ocr_extracted_date,
      b.ocr_confidence,
      b.created_at,
      b.updated_at,
      b.created_by,
      -- Product info joined
      p.name AS product_name,
      p.sku AS product_sku,
      p.barcode AS product_barcode,
      p.brand AS product_brand,
      p.description AS product_description,
      p.unit_type AS product_unit_type,
      p.typical_shelf_life_days AS product_typical_shelf_life_days,
      p.image_url AS product_image_url,
      p.category_id AS product_category_id,
      c.category_code AS product_category_code,
      c.display_name_en AS product_category_name_en,
      c.display_name_fr AS product_category_name_fr
    FROM inventory.batches b
    INNER JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id
      AND (p_product_id IS NULL OR b.product_id = p_product_id)
      AND (p_status IS NULL OR b.status = p_status)
      -- NEW: Exclude draft batches if requested
      AND (p_exclude_drafts IS NULL OR NOT p_exclude_drafts OR b.status != 'draft')
      AND (p_location_code IS NULL OR b.location_code = p_location_code)
      AND (p_supplier IS NULL OR b.supplier ILIKE '%' || p_supplier || '%')
      -- Search filter across multiple fields
      AND (
        p_search IS NULL
        OR b.batch_number ILIKE '%' || p_search || '%'
        OR p.name ILIKE '%' || p_search || '%'
        OR p.brand ILIKE '%' || p_search || '%'
        OR p.barcode ILIKE '%' || p_search || '%'
        OR p.sku ILIKE '%' || p_search || '%'
        OR b.location_code ILIKE '%' || p_search || '%'
        OR b.supplier ILIKE '%' || p_search || '%'
      )
      AND (p_has_stock IS NULL OR (p_has_stock AND b.current_quantity > 0) OR (NOT p_has_stock))
      -- Date filters now exclude null expiry dates (draft batches)
      AND (p_expiring_in_days IS NULL OR (b.expiry_date IS NOT NULL AND b.expiry_date <= CURRENT_DATE + p_expiring_in_days))
      AND (p_expiry_date_from IS NULL OR (b.expiry_date IS NOT NULL AND b.expiry_date >= p_expiry_date_from))
      AND (p_expiry_date_to IS NULL OR (b.expiry_date IS NOT NULL AND b.expiry_date <= p_expiry_date_to))
      AND (p_received_date_from IS NULL OR b.received_date >= p_received_date_from)
      AND (p_received_date_to IS NULL OR b.received_date <= p_received_date_to)
  ),
  total AS (
    SELECT COUNT(*) AS count FROM filtered_batches
  )
  SELECT
    fb.*,
    t.count AS total_count
  FROM filtered_batches fb
  CROSS JOIN total t
  ORDER BY
    CASE WHEN p_sort_field = 'expiry_date' AND p_sort_direction = 'asc' THEN fb.expiry_date END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'expiry_date' AND p_sort_direction = 'desc' THEN fb.expiry_date END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'current_quantity' AND p_sort_direction = 'asc' THEN fb.current_quantity END ASC,
    CASE WHEN p_sort_field = 'current_quantity' AND p_sort_direction = 'desc' THEN fb.current_quantity END DESC,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_direction = 'asc' THEN fb.cost_price END ASC,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_direction = 'desc' THEN fb.cost_price END DESC,
    CASE WHEN p_sort_field = 'selling_price' AND p_sort_direction = 'asc' THEN fb.selling_price END ASC,
    CASE WHEN p_sort_field = 'selling_price' AND p_sort_direction = 'desc' THEN fb.selling_price END DESC,
    CASE WHEN p_sort_field = 'received_date' AND p_sort_direction = 'asc' THEN fb.received_date END ASC,
    CASE WHEN p_sort_field = 'received_date' AND p_sort_direction = 'desc' THEN fb.received_date END DESC,
    CASE WHEN p_sort_field = 'manufacture_date' AND p_sort_direction = 'asc' THEN fb.manufacture_date END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'manufacture_date' AND p_sort_direction = 'desc' THEN fb.manufacture_date END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'batch_number' AND p_sort_direction = 'asc' THEN fb.batch_number END ASC,
    CASE WHEN p_sort_field = 'batch_number' AND p_sort_direction = 'desc' THEN fb.batch_number END DESC,
    CASE WHEN p_sort_field = 'supplier' AND p_sort_direction = 'asc' THEN fb.supplier END ASC,
    CASE WHEN p_sort_field = 'supplier' AND p_sort_direction = 'desc' THEN fb.supplier END DESC,
    CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'asc' THEN fb.status END ASC,
    CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'desc' THEN fb.status END DESC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN fb.created_at END ASC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN fb.created_at END DESC,
    fb.expiry_date ASC NULLS LAST -- Default fallback (draft batches at the end)
  OFFSET v_offset
  LIMIT v_limit;
END;
$$;

ALTER FUNCTION inventory.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, boolean,
  character varying, character varying, text, boolean, integer,
  date, date, date, date, character varying, character varying
) OWNER TO postgres;

COMMENT ON FUNCTION inventory.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, boolean,
  character varying, character varying, text, boolean, integer,
  date, date, date, date, character varying, character varying
) IS 'Enhanced RPC for paginated batch retrieval with comprehensive search across batch number, product details, location, and supplier. Returns batches with full product and category information. Now supports filtering out draft batches via p_exclude_drafts parameter.';

-- Also update the public wrapper function
DROP FUNCTION IF EXISTS public.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, character varying,
  character varying, boolean, integer, date, date, date, date,
  character varying, character varying
);

CREATE OR REPLACE FUNCTION public.get_batches_paginated(
  p_store_id uuid,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 20,
  p_product_id uuid DEFAULT NULL,
  p_status character varying DEFAULT NULL,
  p_exclude_drafts boolean DEFAULT NULL,  -- NEW PARAMETER
  p_location_code character varying DEFAULT NULL,
  p_supplier character varying DEFAULT NULL,
  p_has_stock boolean DEFAULT NULL,
  p_expiring_in_days integer DEFAULT NULL,
  p_expiry_date_from date DEFAULT NULL,
  p_expiry_date_to date DEFAULT NULL,
  p_received_date_from date DEFAULT NULL,
  p_received_date_to date DEFAULT NULL,
  p_sort_field character varying DEFAULT 'expiry_date',
  p_sort_direction character varying DEFAULT 'asc'
)
RETURNS TABLE(
  batch_id uuid,
  batch_number character varying,
  product_id uuid,
  store_id uuid,
  expiry_date date,
  manufacture_date date,
  received_date date,
  current_quantity numeric,
  initial_quantity numeric,
  reserved_quantity numeric,
  available_quantity numeric,
  cost_price numeric,
  selling_price numeric,
  supplier character varying,
  location_code character varying,
  status character varying,
  batch_source character varying,
  scanned_barcode character varying,
  scan_confidence numeric,
  verification_status character varying,
  ocr_extracted_date text,
  ocr_confidence numeric,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  created_by uuid,
  product_name character varying,
  product_sku character varying,
  product_barcode text,
  product_brand character varying,
  product_description text,
  product_unit_type character varying,
  product_typical_shelf_life_days integer,
  product_image_url text,
  product_category_id uuid,
  product_category_code text,
  product_category_name_en text,
  product_category_name_fr text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM inventory.get_batches_paginated(
    p_store_id,
    p_page,
    p_page_size,
    p_product_id,
    p_status,
    p_exclude_drafts,  -- Pass through the new parameter
    p_location_code,
    p_supplier,
    NULL::text,  -- p_search not exposed in public wrapper
    p_has_stock,
    p_expiring_in_days,
    p_expiry_date_from,
    p_expiry_date_to,
    p_received_date_from,
    p_received_date_to,
    p_sort_field,
    p_sort_direction
  );
END;
$$;

ALTER FUNCTION public.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, boolean,
  character varying, character varying, boolean, integer,
  date, date, date, date, character varying, character varying
) OWNER TO postgres;

COMMENT ON FUNCTION public.get_batches_paginated(
  uuid, integer, integer, uuid, character varying, boolean,
  character varying, character varying, boolean, integer,
  date, date, date, date, character varying, character varying
) IS 'Public wrapper for inventory.get_batches_paginated with draft batch filtering support';
