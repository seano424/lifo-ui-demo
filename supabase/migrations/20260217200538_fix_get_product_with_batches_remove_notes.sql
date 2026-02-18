
DROP FUNCTION IF EXISTS inventory.get_product_with_batches(uuid, uuid);

CREATE OR REPLACE FUNCTION inventory.get_product_with_batches(
  p_product_id uuid,
  p_store_id   uuid
)
RETURNS TABLE(
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
  store_cost_price                 numeric,
  store_selling_price              numeric,
  store_is_active                  boolean,
  store_sku                        varchar,
  supplier_code                    varchar,
  shelf_life_override_days         integer,
  store_quantity                   numeric,
  store_quantity_updated_at        timestamp,
  category_code                    text,
  category_display_name            text,
  category_display_name_fr         text,
  category_display_name_nl         text,
  category_typical_shelf_life_days integer,
  category_default_shelf_life_days integer,
  batch_quantity                   numeric,
  active_batches_count             bigint,
  batches                          jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
      AND su.user_id  = auth.uid()
      AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: no access to store %', p_store_id;
  END IF;

  RETURN QUERY
  SELECT
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
    sp.cost_price             AS store_cost_price,
    sp.selling_price          AS store_selling_price,
    sp.is_active              AS store_is_active,
    sp.store_sku,
    sp.supplier_code,
    sp.shelf_life_override_days,
    sp.quantity               AS store_quantity,
    sp.quantity_updated_at    AS store_quantity_updated_at,
    c.category_code,
    c.display_name_en         AS category_display_name,
    c.display_name_fr         AS category_display_name_fr,
    NULL::text                AS category_display_name_nl,
    c.typical_shelf_life_days AS category_typical_shelf_life_days,
    scs.default_shelf_life_days AS category_default_shelf_life_days,
    COALESCE(ba.total_stock, 0::numeric)         AS batch_quantity,
    COALESCE(ba.active_batches_count, 0::bigint) AS active_batches_count,
    COALESCE(ba.batches_json, '[]'::jsonb)       AS batches
  FROM inventory.store_products sp
  JOIN inventory.products p
    ON p.product_id = sp.product_id
  LEFT JOIN inventory.categories c
    ON c.category_id = p.category_id
  LEFT JOIN inventory.store_category_settings scs
    ON scs.store_id    = sp.store_id
   AND scs.category_id = p.category_id
  LEFT JOIN LATERAL (
    SELECT
      SUM(b.current_quantity) FILTER (WHERE b.current_quantity > 0) AS total_stock,
      COUNT(*)                FILTER (WHERE b.status = 'active')    AS active_batches_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'batch_id',          b.batch_id,
            'product_id',        b.product_id,
            'store_id',          b.store_id,
            'batch_number',      b.batch_number,
            'status',            b.status,
            'expiry_date',       b.expiry_date,
            'manufacture_date',  b.manufacture_date,
            'received_date',     b.received_date,
            'current_quantity',  b.current_quantity,
            'reserved_quantity', b.reserved_quantity,
            'cost_price',        b.cost_price,
            'selling_price',     b.selling_price,
            'location_code',     b.location_code,
            'supplier',          b.supplier,
            'created_at',        b.created_at,
            'updated_at',        b.updated_at
          ) ORDER BY b.expiry_date ASC NULLS LAST
        ) FILTER (WHERE b.batch_id IS NOT NULL),
        '[]'::jsonb
      ) AS batches_json
    FROM inventory.batches b
    WHERE b.store_id   = sp.store_id
      AND b.product_id = sp.product_id
  ) ba ON true
  WHERE sp.store_id   = p_store_id
    AND sp.product_id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION inventory.get_product_with_batches(uuid, uuid) TO authenticated;
;
