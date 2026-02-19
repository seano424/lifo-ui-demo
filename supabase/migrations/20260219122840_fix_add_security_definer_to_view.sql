-- inventory.store_inventory_stats source

CREATE OR REPLACE VIEW inventory.store_inventory_stats
WITH(security_invoker=on)
AS SELECT sp.store_id,
    sp.product_id,
    COALESCE(sum(b.current_quantity) FILTER (WHERE b.status::text = ANY (ARRAY['active'::character varying, 'draft'::character varying]::text[])), 0::numeric) AS total_stock,
    count(b.batch_id) FILTER (WHERE b.status::text = 'active'::text) AS active_batches_count,
    count(b.batch_id) FILTER (WHERE b.status::text = 'draft'::text) AS incomplete_batches_count,
    avg(
        CASE
            WHEN b.expiry_date IS NOT NULL THEN b.expiry_date - CURRENT_DATE
            ELSE NULL::integer
        END) FILTER (WHERE b.status::text = 'active'::text AND b.expiry_date IS NOT NULL) AS avg_days_to_expiry,
    min(b.expiry_date) FILTER (WHERE b.status::text = 'active'::text) AS earliest_expiry_date,
    max(b.expiry_date) FILTER (WHERE b.status::text = 'active'::text) AS latest_expiry_date,
    COALESCE(sum(b.reserved_quantity) FILTER (WHERE b.status::text = 'active'::text), 0::numeric) AS total_reserved_quantity,
    COALESCE(sum(b.current_quantity - b.reserved_quantity) FILTER (WHERE b.status::text = ANY (ARRAY['active'::character varying, 'draft'::character varying]::text[])), 0::numeric) AS available_quantity,
    COALESCE(sp.quantity, 0::numeric) AS quantity,
    sp.quantity_updated_at
   FROM inventory.store_products sp
     LEFT JOIN inventory.batches b ON b.product_id = sp.product_id AND b.store_id = sp.store_id
  GROUP BY sp.store_id, sp.product_id, sp.quantity, sp.quantity_updated_at;