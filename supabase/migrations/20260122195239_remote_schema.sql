drop policy "store_users_delete_owner" on "public"."store_users";

drop policy "store_users_manage_owner" on "public"."store_users";

drop policy "store_users_update_owner" on "public"."store_users";

alter table "public"."store_products" add column "image_url" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_draft_batch(p_batch_id uuid, p_expiry_date date, p_quantity numeric DEFAULT NULL::numeric, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Simply delegate to the inventory schema function
  RETURN inventory.activate_draft_batch(
    p_batch_id,
    p_expiry_date,
    p_quantity,
    p_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_draft_batches_by_product(p_store_id uuid, p_category_codes text[] DEFAULT NULL::text[], p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT NULL::integer, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.get_draft_batches_by_product(p_store_id, p_category_codes, p_limit, p_offset, p_search);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_draft_batches_summary(p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.get_draft_batches_summary(p_store_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ignored_batches_by_product(p_store_id uuid, p_category_codes text[] DEFAULT NULL::text[], p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT NULL::integer, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.get_ignored_batches_by_product(p_store_id, p_category_codes, p_limit, p_offset, p_search);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ignored_batches_summary(p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.get_ignored_batches_summary(p_store_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_recent_delivery_products(p_store_id uuid, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.get_recent_delivery_products(p_store_id, p_limit);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ignore_draft_batch(p_batch_id uuid, p_quantity numeric DEFAULT NULL::numeric, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.ignore_draft_batch(p_batch_id, p_quantity, p_user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_delivery_create_drafts(p_store_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.log_delivery_create_drafts(p_store_id, p_user_id, p_items);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_ignored_batch(p_batch_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN inventory.restore_ignored_batch(p_batch_id, p_user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_expiry_dashboard_summary(p_store_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_expiry_days INTEGER;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
      AND su.user_id = auth.uid()
      AND su.is_active = true
  ) THEN
    RETURN json_build_object(
      'expiring_today', 0,
      'expiring_tomorrow', 0,
      'expiring_in_two_days', 0,
      'expiring_in_three_days', 0,
      'expiring_this_week', 0,
      'total_expiring', 0,
      'total_active_batches', 0,
      'total_products', 0
    );
  END IF;

  -- Get store's expiry alert threshold for total_expiring (sidebar badge match)
  SELECT COALESCE(ss.expiry_alert_days, 3)
  INTO v_expiry_days
  FROM business.store_settings ss
  WHERE ss.store_id = p_store_id;
  
  IF v_expiry_days IS NULL THEN
    v_expiry_days := 3;
  END IF;

  SELECT json_build_object(
    -- Day 0: Expiring Today
    'expiring_today', COALESCE(counts.day_0, 0)::INTEGER,
    
    -- Day 1: Expiring Tomorrow
    'expiring_tomorrow', COALESCE(counts.day_1, 0)::INTEGER,
    
    -- Day 2: Expiring in Two Days
    'expiring_in_two_days', COALESCE(counts.day_2, 0)::INTEGER,
    
    -- Day 3: Expiring in Three Days
    'expiring_in_three_days', COALESCE(counts.day_3, 0)::INTEGER,
    
    -- Expiring This Week: ACTUAL 7 DAYS (0-7)
    'expiring_this_week', COALESCE(counts.this_week, 0)::INTEGER,
    
    -- Total Expiring: matches sidebar badge (store's expiry_alert_days)
    'total_expiring', COALESCE(counts.total_expiring, 0)::INTEGER,
    
    -- Total Active Batches
    'total_active_batches', COALESCE(counts.total_batches, 0)::INTEGER,
    
    -- Total Products Tracked
    'total_products', COALESCE(counts.product_count, 0)::INTEGER
  )
  INTO v_result
  FROM (
    SELECT 
      -- Day 0
      COUNT(*) FILTER (
        WHERE days_to_expiry = 0
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as day_0,
      
      -- Day 1
      COUNT(*) FILTER (
        WHERE days_to_expiry = 1
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as day_1,
      
      -- Day 2
      COUNT(*) FILTER (
        WHERE days_to_expiry = 2
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as day_2,
      
      -- Day 3
      COUNT(*) FILTER (
        WHERE days_to_expiry = 3
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as day_3,
      
      -- This Week: ACTUAL 7 DAYS (days 0-7)
      COUNT(*) FILTER (
        WHERE days_to_expiry >= 0
          AND days_to_expiry <= 7
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as this_week,
      
      -- Total Expiring: uses store's expiry_alert_days (matches sidebar)
      COUNT(*) FILTER (
        WHERE days_to_expiry >= 0
          AND days_to_expiry <= v_expiry_days
          AND completion_status != 'completed'
          AND current_quantity > 0
      ) as total_expiring,
      
      -- Total Active Batches
      COUNT(*) FILTER (
        WHERE completion_status != 'completed'
          AND current_quantity > 0
      ) as total_batches,
      
      -- Total Products Tracked
      COUNT(DISTINCT batch_id) FILTER (
        WHERE completion_status != 'completed'
          AND current_quantity > 0
      ) as product_count
      
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
  ) counts;

  RETURN v_result;
END;
$function$
;


  create policy "store_users_delete_owner"
  on "public"."store_users"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "store_users_manage_owner"
  on "public"."store_users"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "store_users_update_owner"
  on "public"."store_users"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


drop policy "Store managers can assign roles" on "user_mgmt"."user_roles";

drop policy "Store managers can update user roles" on "user_mgmt"."user_roles";

drop policy "Store managers can create employee accounts" on "user_mgmt"."users";

drop policy "Store managers can update employee profiles" on "user_mgmt"."users";

drop policy "Store managers can view employee profiles" on "user_mgmt"."users";


  create policy "Store managers can assign roles"
  on "user_mgmt"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = user_roles.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can update user roles"
  on "user_mgmt"."user_roles"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = user_roles.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can create employee accounts"
  on "user_mgmt"."users"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));



  create policy "Store managers can update employee profiles"
  on "user_mgmt"."users"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = users.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can view employee profiles"
  on "user_mgmt"."users"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = users.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));


drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

alter table "inventory"."batches" drop constraint "batches_source_check";

alter table "inventory"."batches" drop constraint "batches_status_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

drop function if exists "inventory"."get_draft_batches_by_product"(p_store_id uuid, p_category_codes text[], p_limit integer, p_offset integer);

alter table "inventory"."batches" add constraint "batches_source_check" CHECK (((batch_source)::text = ANY (ARRAY['manual'::text, 'barcode'::text, 'scanned'::text, 'scan'::text, 'barcode_scan'::text, 'csv_import'::text, 'api'::text, 'pos_integration'::text, 'split'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_source_check";

alter table "inventory"."batches" add constraint "batches_status_check" CHECK (((status)::text = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'damaged'::text, 'sold_out'::text, 'reserved'::text, 'donated'::text, 'disposed'::text, 'ignored'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_status_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION inventory.get_draft_batches_by_product(p_store_id uuid, p_category_codes text[] DEFAULT NULL::text[], p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT NULL::integer, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_results JSONB;
  v_total_count INTEGER;
  v_effective_limit INTEGER;
  v_effective_offset INTEGER;
  v_search_pattern TEXT;
BEGIN
  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Set defaults
  v_effective_limit := COALESCE(p_limit, 50);
  v_effective_offset := COALESCE(p_offset, 0);
  
  -- Prepare search pattern (case-insensitive partial match)
  v_search_pattern := CASE 
    WHEN p_search IS NOT NULL AND TRIM(p_search) != '' 
    THEN '%' || LOWER(TRIM(p_search)) || '%'
    ELSE NULL
  END;

  -- Get total count first
  SELECT COUNT(DISTINCT p.product_id)
  INTO v_total_count
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE b.store_id = p_store_id 
    AND b.status = 'draft'
    AND (p_category_codes IS NULL OR c.category_code = ANY(p_category_codes))
    AND (v_search_pattern IS NULL OR (
      LOWER(p.name) LIKE v_search_pattern OR
      LOWER(COALESCE(p.brand, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(p.sku, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(p.barcode, '')) LIKE v_search_pattern
    ));

  -- Get products with their draft batches
  SELECT COALESCE(jsonb_agg(product_data), '[]'::JSONB)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'product_id', p.product_id,
      'product_name', p.name,
      'product_brand', p.brand,
      'category_name', COALESCE(c.display_name_en, 'Uncategorized'),
      'typical_shelf_life_days', p.typical_shelf_life_days,
      'draft_batch_count', COUNT(b.batch_id),
      'total_draft_quantity', SUM(b.current_quantity),
      'draft_batches', jsonb_agg(
        jsonb_build_object(
          'batch_id', b.batch_id,
          'batch_number', b.batch_number,
          'quantity', b.current_quantity,
          'received_date', b.received_date,
          'created_at', b.created_at
        ) ORDER BY b.created_at DESC
      ),
      'last_expiry_days', (
        SELECT (lb.expiry_date - CURRENT_DATE)::INTEGER
        FROM inventory.batches lb
        WHERE lb.product_id = p.product_id 
          AND lb.store_id = p_store_id
          AND lb.status != 'draft'
          AND lb.expiry_date IS NOT NULL
        ORDER BY lb.created_at DESC
        LIMIT 1
      ),
      'last_batch_expiry_date', (
        SELECT lb.expiry_date
        FROM inventory.batches lb
        WHERE lb.product_id = p.product_id 
          AND lb.store_id = p_store_id
          AND lb.status != 'draft'
          AND lb.expiry_date IS NOT NULL
        ORDER BY lb.created_at DESC
        LIMIT 1
      ),
      'total_count', v_total_count
    ) AS product_data
    FROM inventory.batches b
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id 
      AND b.status = 'draft'
      AND (p_category_codes IS NULL OR c.category_code = ANY(p_category_codes))
      AND (v_search_pattern IS NULL OR (
        LOWER(p.name) LIKE v_search_pattern OR
        LOWER(COALESCE(p.brand, '')) LIKE v_search_pattern OR
        LOWER(COALESCE(p.sku, '')) LIKE v_search_pattern OR
        LOWER(COALESCE(p.barcode, '')) LIKE v_search_pattern
      ))
    GROUP BY p.product_id, p.name, p.brand, c.display_name_en, p.typical_shelf_life_days
    ORDER BY SUM(b.current_quantity) DESC
    LIMIT v_effective_limit
    OFFSET v_effective_offset
  ) sub;

  RETURN v_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_ignored_batches_by_product(p_store_id uuid, p_category_codes text[] DEFAULT NULL::text[], p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT NULL::integer, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_results JSONB;
  v_total_count INTEGER;
  v_effective_limit INTEGER;
  v_effective_offset INTEGER;
  v_search_pattern TEXT;
BEGIN
  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Set defaults
  v_effective_limit := COALESCE(p_limit, 50);
  v_effective_offset := COALESCE(p_offset, 0);
  
  -- Prepare search pattern (case-insensitive partial match)
  v_search_pattern := CASE 
    WHEN p_search IS NOT NULL AND TRIM(p_search) != '' 
    THEN '%' || LOWER(TRIM(p_search)) || '%'
    ELSE NULL
  END;

  -- Get total count first
  SELECT COUNT(DISTINCT p.product_id)
  INTO v_total_count
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE b.store_id = p_store_id 
    AND b.status = 'ignored'
    AND (p_category_codes IS NULL OR c.category_code = ANY(p_category_codes))
    AND (v_search_pattern IS NULL OR (
      LOWER(p.name) LIKE v_search_pattern OR
      LOWER(COALESCE(p.brand, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(p.sku, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(p.barcode, '')) LIKE v_search_pattern
    ));

  -- Get products with their ignored batches
  SELECT COALESCE(jsonb_agg(product_data), '[]'::JSONB)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'product_id', p.product_id,
      'product_name', p.name,
      'product_brand', p.brand,
      'category_name', COALESCE(c.display_name_en, 'Uncategorized'),
      'typical_shelf_life_days', p.typical_shelf_life_days,
      'ignored_batch_count', COUNT(b.batch_id),
      'total_ignored_quantity', SUM(b.current_quantity),
      'ignored_batches', jsonb_agg(
        jsonb_build_object(
          'batch_id', b.batch_id,
          'batch_number', b.batch_number,
          'quantity', b.current_quantity,
          'received_date', b.received_date,
          'ignored_at', b.updated_at,
          'created_at', b.created_at
        ) ORDER BY b.updated_at DESC
      ),
      'total_count', v_total_count
    ) AS product_data
    FROM inventory.batches b
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id 
      AND b.status = 'ignored'
      AND (p_category_codes IS NULL OR c.category_code = ANY(p_category_codes))
      AND (v_search_pattern IS NULL OR (
        LOWER(p.name) LIKE v_search_pattern OR
        LOWER(COALESCE(p.brand, '')) LIKE v_search_pattern OR
        LOWER(COALESCE(p.sku, '')) LIKE v_search_pattern OR
        LOWER(COALESCE(p.barcode, '')) LIKE v_search_pattern
      ))
    GROUP BY p.product_id, p.name, p.brand, c.display_name_en, p.typical_shelf_life_days
    ORDER BY MAX(b.updated_at) DESC
    LIMIT v_effective_limit
    OFFSET v_effective_offset
  ) sub;

  RETURN v_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_ignored_batches_summary(p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'total_ignored_batches', 0,
      'total_units', 0,
      'products_with_ignored', 0,
      'by_category', '[]'::JSONB
    );
  END IF;

  SELECT jsonb_build_object(
    'total_ignored_batches', COALESCE(SUM(batch_count), 0),
    'total_units', COALESCE(SUM(total_quantity), 0),
    'products_with_ignored', COALESCE(COUNT(DISTINCT product_id), 0),
    'by_category', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'category_code', COALESCE(c.category_code, 'uncategorized'),
          'category_name', COALESCE(c.display_name_en, 'Uncategorized'),
          'ignored_count', cat_stats.ignored_count,
          'total_quantity', cat_stats.total_quantity
        )
      )
      FROM (
        SELECT 
          p.category_id,
          COUNT(b.batch_id) as ignored_count,
          SUM(b.current_quantity) as total_quantity
        FROM inventory.batches b
        JOIN inventory.products p ON b.product_id = p.product_id
        WHERE b.store_id = p_store_id AND b.status = 'ignored'
        GROUP BY p.category_id
      ) cat_stats
      LEFT JOIN inventory.categories c ON cat_stats.category_id = c.category_id),
      '[]'::JSONB
    )
  )
  INTO v_result
  FROM (
    SELECT 
      b.product_id,
      COUNT(b.batch_id) as batch_count,
      SUM(b.current_quantity) as total_quantity
    FROM inventory.batches b
    WHERE b.store_id = p_store_id AND b.status = 'ignored'
    GROUP BY b.product_id
  ) sub;

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_ignored_batches', 0,
    'total_units', 0,
    'products_with_ignored', 0,
    'by_category', '[]'::JSONB
  ));
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.ignore_draft_batch(p_batch_id uuid, p_quantity numeric DEFAULT NULL::numeric, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch RECORD;
  v_store_id UUID;
  v_ignore_quantity NUMERIC;
  v_remaining_quantity NUMERIC;
  v_new_batch_id UUID;
  v_new_batch_number TEXT;
  v_effective_user_id UUID;
BEGIN
  -- Get the batch and verify it exists and is a draft
  SELECT b.*, p.name as product_name, p.sku
  INTO v_batch
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  WHERE b.batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch not found'
    );
  END IF;

  IF v_batch.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch is not a draft. Current status: ' || v_batch.status
    );
  END IF;

  v_store_id := v_batch.store_id;

  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = v_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied to this store'
    );
  END IF;

  -- Determine user ID
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  -- Determine quantity to ignore (default: entire batch)
  v_ignore_quantity := COALESCE(p_quantity, v_batch.current_quantity);

  IF v_ignore_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  IF v_ignore_quantity > v_batch.current_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Requested quantity exceeds available draft quantity'
    );
  END IF;

  -- Calculate remaining quantity
  v_remaining_quantity := v_batch.current_quantity - v_ignore_quantity;

  -- If partial ignore, create a new draft batch for remaining quantity
  IF v_remaining_quantity > 0 THEN
    -- Use gen_random_uuid() instead of uuid_generate_v4() (built-in, no schema needed)
    v_new_batch_id := gen_random_uuid();
    v_new_batch_number := v_batch.batch_number || '-SPLIT-' || EXTRACT(EPOCH FROM NOW())::INTEGER;

    INSERT INTO inventory.batches (
      batch_id,
      product_id,
      store_id,
      batch_number,
      initial_quantity,
      current_quantity,
      cost_price,
      selling_price,
      received_date,
      status,
      lifecycle_status,
      created_by,
      batch_source
    ) VALUES (
      v_new_batch_id,
      v_batch.product_id,
      v_store_id,
      v_new_batch_number,
      v_remaining_quantity,
      v_remaining_quantity,
      v_batch.cost_price,
      v_batch.selling_price,
      v_batch.received_date,
      'draft',
      'active',
      v_effective_user_id,
      'split'
    );
  END IF;

  -- Update the original batch: mark as ignored
  UPDATE inventory.batches
  SET 
    status = 'ignored',
    current_quantity = v_ignore_quantity,
    initial_quantity = v_ignore_quantity,
    updated_at = NOW(),
    batch_number = REPLACE(batch_number, '-DRAFT', '') || '-IGNORED-' || TO_CHAR(NOW(), 'YYYYMMDD')
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'ignored_batch_id', p_batch_id,
    'ignored_quantity', v_ignore_quantity,
    'product_name', v_batch.product_name,
    'was_split', v_remaining_quantity > 0,
    'remaining_draft_batch_id', CASE WHEN v_remaining_quantity > 0 THEN v_new_batch_id ELSE NULL END,
    'remaining_draft_quantity', CASE WHEN v_remaining_quantity > 0 THEN v_remaining_quantity ELSE NULL END,
    'message', CASE 
      WHEN v_remaining_quantity > 0 THEN 
        'Ignored ' || v_ignore_quantity || ' units. ' || v_remaining_quantity || ' units remain in draft.'
      ELSE 
        'Successfully ignored batch with ' || v_ignore_quantity || ' units.'
    END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.restore_ignored_batch(p_batch_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch RECORD;
  v_store_id UUID;
  v_effective_user_id UUID;
BEGIN
  -- Get the batch and verify it exists and is ignored
  SELECT b.*, p.name as product_name, p.sku
  INTO v_batch
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  WHERE b.batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch not found'
    );
  END IF;

  IF v_batch.status != 'ignored' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch is not ignored. Current status: ' || v_batch.status
    );
  END IF;

  v_store_id := v_batch.store_id;

  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = v_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied to this store'
    );
  END IF;

  -- Determine user ID
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  -- Update the batch: move back to draft
  UPDATE inventory.batches
  SET 
    status = 'draft',
    updated_at = NOW(),
    -- Clean up the batch number (remove -IGNORED- suffix)
    batch_number = CASE 
      WHEN batch_number LIKE '%-IGNORED-%' 
      THEN REGEXP_REPLACE(batch_number, '-IGNORED-[0-9]+$', '-DRAFT')
      ELSE batch_number || '-DRAFT'
    END
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'restored_batch_id', p_batch_id,
    'restored_quantity', v_batch.current_quantity,
    'product_name', v_batch.product_name,
    'message', 'Successfully restored batch to pending status. ' || v_batch.current_quantity || ' units now need expiry date.'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.activate_draft_batch(p_batch_id uuid, p_expiry_date date, p_quantity numeric DEFAULT NULL::numeric, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch RECORD;
  v_store_id UUID;
  v_activate_quantity NUMERIC;
  v_remaining_quantity NUMERIC;
  v_new_batch_id UUID;
  v_new_batch_number TEXT;
  v_effective_user_id UUID;
  v_original_status TEXT;
BEGIN
  -- Get the batch and verify it exists and is a draft or ignored
  SELECT b.*, p.name as product_name, p.sku
  INTO v_batch
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  WHERE b.batch_id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch not found'
    );
  END IF;

  -- Store original status for logging/messaging
  v_original_status := v_batch.status;

  -- Allow both 'draft' and 'ignored' statuses to be activated
  IF v_batch.status NOT IN ('draft', 'ignored') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Batch must be in draft or ignored status to activate'
    );
  END IF;

  v_store_id := v_batch.store_id;

  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = v_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied to this store'
    );
  END IF;

  -- Determine user ID
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  -- Determine quantity to activate
  v_activate_quantity := COALESCE(p_quantity, v_batch.current_quantity);

  IF v_activate_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantity must be greater than 0'
    );
  END IF;

  IF v_activate_quantity > v_batch.current_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Requested quantity exceeds available quantity'
    );
  END IF;

  -- Calculate remaining quantity
  v_remaining_quantity := v_batch.current_quantity - v_activate_quantity;

  -- If partial activation, create a new draft batch for remaining quantity
  IF v_remaining_quantity > 0 THEN
    -- Use gen_random_uuid() instead of uuid_generate_v4() (built-in, no schema needed)
    v_new_batch_id := gen_random_uuid();
    v_new_batch_number := v_batch.batch_number || '-SPLIT-' || EXTRACT(EPOCH FROM NOW())::INTEGER;

    INSERT INTO inventory.batches (
      batch_id,
      product_id,
      store_id,
      batch_number,
      initial_quantity,
      current_quantity,
      cost_price,
      selling_price,
      received_date,
      status,
      lifecycle_status,
      created_by,
      batch_source
    ) VALUES (
      v_new_batch_id,
      v_batch.product_id,
      v_store_id,
      v_new_batch_number,
      v_remaining_quantity,
      v_remaining_quantity,
      v_batch.cost_price,
      v_batch.selling_price,
      v_batch.received_date,
      'draft',
      'active',
      v_effective_user_id,
      'split'
    );
  END IF;

  -- Update the original batch: activate it with the expiry date
  UPDATE inventory.batches
  SET 
    expiry_date = p_expiry_date,
    status = 'active',
    current_quantity = v_activate_quantity,
    initial_quantity = v_activate_quantity,
    updated_at = NOW(),
    batch_number = REPLACE(REPLACE(batch_number, '-DRAFT', ''), '-IGNORED', '') || '-' || TO_CHAR(p_expiry_date, 'YYYYMMDD')
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'activated_batch_id', p_batch_id,
    'activated_quantity', v_activate_quantity,
    'expiry_date', p_expiry_date,
    'was_split', v_remaining_quantity > 0,
    'was_ignored', v_original_status = 'ignored',
    'remaining_draft_batch_id', CASE WHEN v_remaining_quantity > 0 THEN v_new_batch_id ELSE NULL END,
    'remaining_draft_quantity', CASE WHEN v_remaining_quantity > 0 THEN v_remaining_quantity ELSE NULL END,
    'message', CASE 
      WHEN v_remaining_quantity > 0 THEN 
        'Activated ' || v_activate_quantity || ' units. ' || v_remaining_quantity || ' units remain in draft.'
      WHEN v_original_status = 'ignored' THEN
        'Successfully restored and activated batch with ' || v_activate_quantity || ' units.'
      ELSE 
        'Successfully activated batch with ' || v_activate_quantity || ' units.'
    END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.log_delivery_create_drafts(p_store_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_batch_id UUID;
  v_batch_number TEXT;
  v_results JSONB := '[]'::JSONB;
  v_success_count INTEGER := 0;
  v_total_count INTEGER := 0;
  v_suggested_expiry_days INTEGER;
  v_suggested_expiry_date DATE;
BEGIN
  -- Verify store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
      AND su.user_id = auth.uid() 
      AND su.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'total_items', 0,
      'drafts_created', 0,
      'items', '[]'::JSONB,
      'error', 'Access denied to this store'
    );
  END IF;

  -- Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'total_items', 0,
      'drafts_created', 0,
      'items', '[]'::JSONB,
      'error', 'No items provided'
    );
  END IF;

  v_total_count := jsonb_array_length(p_items);

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get product details
    SELECT p.*, sp.cost_price as store_cost_price, sp.selling_price as store_selling_price
    INTO v_product
    FROM inventory.products p
    LEFT JOIN inventory.store_products sp ON p.product_id = sp.product_id AND sp.store_id = p_store_id
    WHERE p.product_id = (v_item->>'product_id')::UUID;

    IF v_product IS NULL THEN
      -- Skip invalid products but continue processing
      CONTINUE;
    END IF;

    -- Generate batch number using gen_random_uuid() (built-in, no extension required)
    v_batch_id := gen_random_uuid();
    v_batch_number := UPPER(SUBSTRING(v_product.name FROM 1 FOR 6)) || '-DRAFT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MI');

    -- Calculate suggested expiry based on typical shelf life
    v_suggested_expiry_days := v_product.typical_shelf_life_days;
    IF v_suggested_expiry_days IS NOT NULL AND v_suggested_expiry_days > 0 THEN
      v_suggested_expiry_date := CURRENT_DATE + v_suggested_expiry_days;
    ELSE
      v_suggested_expiry_date := NULL;
    END IF;

    -- Create draft batch
    INSERT INTO inventory.batches (
      batch_id,
      product_id,
      store_id,
      batch_number,
      initial_quantity,
      current_quantity,
      cost_price,
      selling_price,
      received_date,
      status,
      lifecycle_status,
      created_by,
      batch_source
    ) VALUES (
      v_batch_id,
      v_product.product_id,
      p_store_id,
      v_batch_number,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'quantity')::NUMERIC,
      COALESCE(v_product.store_cost_price, v_product.base_cost_price),
      COALESCE(v_product.store_selling_price, v_product.base_selling_price),
      CURRENT_DATE,
      'draft',
      'active',
      p_user_id,
      'delivery'
    );

    v_success_count := v_success_count + 1;

    -- Add to results
    v_results := v_results || jsonb_build_object(
      'product_id', v_product.product_id,
      'product_name', v_product.name,
      'quantity', (v_item->>'quantity')::NUMERIC,
      'draft_batch_id', v_batch_id,
      'suggested_expiry_days', v_suggested_expiry_days,
      'suggested_expiry_date', v_suggested_expiry_date
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_success_count > 0,
    'total_items', v_total_count,
    'drafts_created', v_success_count,
    'items', v_results
  );
END;
$function$
;


  create policy "batch_action_entries_delete_policy"
  on "inventory"."batch_actions"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (inventory.batches b
     JOIN business.store_users su ON ((su.store_id = b.store_id)))
  WHERE ((b.batch_id = batch_actions.batch_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Users can view batch status logs"
  on "inventory"."batch_status_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "batches_delete_policy"
  on "inventory"."batches"
  as permissive
  for delete
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "batches_update_policy"
  on "inventory"."batches"
  as permissive
  for update
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = auth.uid()) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'staff'::character varying, 'employee'::character varying])::text[]))))));



  create policy "Store managers can remove products from stores"
  on "inventory"."store_products"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.store_id = store_products.store_id) AND (store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));


drop index if exists "scoring"."idx_product_scores_recommendations";

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

alter table "business"."store_users" drop constraint "chk_pin_access_level";

alter table "business"."store_users" drop constraint "store_users_role_in_store_check";

alter table "business"."stores" drop constraint "stores_size_category_check";

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";


  create policy "Store owners and managers can insert store settings"
  on "business"."store_settings"
  as permissive
  for insert
  to public
with check ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Store owners and managers can update store settings"
  on "business"."store_settings"
  as permissive
  for update
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Store owners and managers can view store settings"
  on "business"."store_settings"
  as permissive
  for select
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Users can manage settings for their stores"
  on "business"."store_settings"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.store_id = store_settings.store_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.store_id = store_settings.store_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


drop policy "Only privileged users can delete transactions" on "sales"."transactions";


  create policy "Only privileged users can delete transactions"
  on "sales"."transactions"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.store_id = transactions.store_id) AND (store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));


drop policy "Authorized users can insert sales events" on "timeseries"."sales_events";

alter table "timeseries"."external_factors" alter column "factor_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."inventory_snapshots" alter column "snapshot_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."sales_events" alter column "event_id" set default extensions.uuid_generate_v4();


  create policy "Authorized users can insert sales events"
  on "timeseries"."sales_events"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.user_id = auth.uid()) AND (store_users.store_id = sales_events.store_id) AND (store_users.is_active = true) AND (((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) OR (((store_users.permissions ->> 'can_scan_out'::text))::boolean = true))))));



