-- Migration: add_get_product_detail_rpc
--
-- Replaces the 3-query waterfall in fetchProductById with a single RPC:
--   1. store_products JOIN products JOIN categories (single row)
--   2. store_category_settings (conditional, for shelf life override)
--   3. batches (for total_stock + active_batches_count aggregation)
--
-- Performance: single round-trip instead of 3 sequential queries.
-- Security: SECURITY DEFINER with explicit auth.uid() check against business.store_users.
--
-- Note: categories.display_name_nl does not exist yet — returns NULL.
--       When the column is added, update this function to select it.

CREATE OR REPLACE FUNCTION inventory.get_product_detail(
  p_product_id uuid,
  p_store_id uuid
)
RETURNS TABLE(
  -- products
  product_id                       uuid,
  name                             varchar,
  brand                            varchar,
  category_id                      uuid,
  barcode                          text,
  typical_shelf_life_days          integer,
  base_cost_price                  numeric,
  base_selling_price               numeric,
  description                      text,
  image_url                        text,
  sku                              varchar,
  unit_type                        varchar,
  created_at                       timestamp,
  updated_at                       timestamp,
  created_by                       uuid,
  last_verified                    timestamp,
  open_food_facts_data             jsonb,
  -- store_products
  store_cost_price                 numeric,
  store_selling_price              numeric,
  store_is_active                  boolean,
  store_sku                        varchar,
  supplier_code                    varchar,
  shelf_life_override_days         integer,
  square_quantity                  numeric,
  square_quantity_updated_at       timestamp,
  -- categories
  category_code                    text,
  category_display_name            text,
  category_display_name_fr         text,
  category_display_name_nl         text,
  category_typical_shelf_life_days integer,
  -- store_category_settings
  category_default_shelf_life_days integer,
  -- batch aggregates
  total_stock                      numeric,
  active_batches_count             bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Auth check: user must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Auth check: user must have active access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
      AND su.user_id = auth.uid()
      AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: no access to store %', p_store_id;
  END IF;

  RETURN QUERY
  SELECT
    -- products
    p.product_id,
    p.name,
    p.brand,
    p.category_id,
    p.barcode,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.description,
    p.image_url,
    p.sku,
    p.unit_type,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.last_verified,
    p.open_food_facts_data,
    -- store_products
    sp.cost_price             AS store_cost_price,
    sp.selling_price          AS store_selling_price,
    sp.is_active              AS store_is_active,
    sp.store_sku,
    sp.supplier_code,
    sp.shelf_life_override_days,
    sp.quantity               AS square_quantity,
    sp.quantity_updated_at    AS square_quantity_updated_at,
    -- categories (LEFT JOIN — null when product has no category)
    c.category_code,
    c.display_name_en         AS category_display_name,
    c.display_name_fr         AS category_display_name_fr,
    NULL::text                AS category_display_name_nl,
    c.typical_shelf_life_days AS category_typical_shelf_life_days,
    -- store_category_settings (LEFT JOIN — null when no override set)
    scs.default_shelf_life_days AS category_default_shelf_life_days,
    -- batch aggregates (0 when no batches exist)
    COALESCE(ba.total_stock, 0::numeric)          AS total_stock,
    COALESCE(ba.active_batches_count, 0::bigint)  AS active_batches_count
  FROM inventory.store_products sp
  JOIN inventory.products p
    ON p.product_id = sp.product_id
  LEFT JOIN inventory.categories c
    ON c.category_id = p.category_id
  LEFT JOIN inventory.store_category_settings scs
    ON scs.store_id = sp.store_id
   AND scs.category_id = p.category_id
  LEFT JOIN LATERAL (
    SELECT
      SUM(b.current_quantity) FILTER (WHERE b.current_quantity > 0) AS total_stock,
      COUNT(*)                FILTER (WHERE b.status = 'active')    AS active_batches_count
    FROM inventory.batches b
    WHERE b.store_id  = sp.store_id
      AND b.product_id = sp.product_id
  ) ba ON true
  WHERE sp.store_id  = p_store_id
    AND sp.product_id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION inventory.get_product_detail(uuid, uuid) TO authenticated;
