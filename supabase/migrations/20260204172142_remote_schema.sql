drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

drop policy "store_users_delete_owner" on "public"."store_users";

drop policy "store_users_manage_owner" on "public"."store_users";

drop policy "store_users_update_owner" on "public"."store_users";

drop policy "Only privileged users can delete transactions" on "sales"."transactions";

drop policy "Authorized users can insert sales events" on "timeseries"."sales_events";

drop policy "Store managers can assign roles" on "user_mgmt"."user_roles";

drop policy "Store managers can update user roles" on "user_mgmt"."user_roles";

drop policy "Store managers can create employee accounts" on "user_mgmt"."users";

drop policy "Store managers can update employee profiles" on "user_mgmt"."users";

drop policy "Store managers can view employee profiles" on "user_mgmt"."users";

alter table "business"."store_users" drop constraint "chk_pin_access_level";

alter table "business"."store_users" drop constraint "store_users_role_in_store_check";

alter table "business"."stores" drop constraint "stores_size_category_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

drop function if exists "public"."get_products_for_tracking_setup"(p_store_id uuid, p_category_id uuid, p_search_term text, p_only_tracked boolean, p_page_size integer, p_offset integer);

drop index if exists "scoring"."idx_product_scores_recommendations";

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.save_batch_tracking_setup(p_store_id uuid, p_config jsonb, p_category_settings jsonb DEFAULT '[]'::jsonb, p_product_overrides jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_categories_updated INTEGER := 0;
  v_products_updated INTEGER := 0;
  v_category JSONB;
  v_product JSONB;
BEGIN
  -- Validate store_id
  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'store_id is required'
    );
  END IF;

  -- Validate config
  IF p_config IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'config is required'
    );
  END IF;

  -- 1. Update store settings with batch_tracking_config
  -- Use explicit column list to avoid issues with malformed defaults
  INSERT INTO business.store_settings (
    store_id, 
    batch_tracking_config,
    currency
  )
  VALUES (
    p_store_id, 
    p_config,
    'EUR'  -- Explicit currency to avoid malformed default
  )
  ON CONFLICT (store_id) 
  DO UPDATE SET 
    batch_tracking_config = p_config,
    updated_at = NOW();

  -- 2. Upsert category settings
  FOR v_category IN SELECT * FROM jsonb_array_elements(p_category_settings)
  LOOP
    INSERT INTO inventory.store_category_settings (
      store_id,
      category_id,
      is_tracked,
      auto_create_batches,
      default_shelf_life_days,
      updated_at
    )
    VALUES (
      p_store_id,
      (v_category->>'category_id')::UUID,
      COALESCE((v_category->>'is_tracked')::BOOLEAN, TRUE),
      COALESCE((v_category->>'auto_create_batches')::BOOLEAN, FALSE),
      (v_category->>'default_shelf_life_days')::INTEGER,
      NOW()
    )
    ON CONFLICT (store_id, category_id) 
    DO UPDATE SET 
      is_tracked = COALESCE((v_category->>'is_tracked')::BOOLEAN, TRUE),
      auto_create_batches = COALESCE((v_category->>'auto_create_batches')::BOOLEAN, FALSE),
      default_shelf_life_days = (v_category->>'default_shelf_life_days')::INTEGER,
      updated_at = NOW();
    
    v_categories_updated := v_categories_updated + 1;
  END LOOP;

  -- 3. Update product overrides
  FOR v_product IN SELECT * FROM jsonb_array_elements(p_product_overrides)
  LOOP
    UPDATE inventory.store_products
    SET 
      is_tracked_for_batches = COALESCE(
        (v_product->>'is_tracked_for_batches')::BOOLEAN, 
        is_tracked_for_batches
      ),
      shelf_life_override_days = (v_product->>'shelf_life_override_days')::INTEGER,
      auto_create_batches = (v_product->>'auto_create_batches')::BOOLEAN,
      updated_at = NOW()
    WHERE store_id = p_store_id
      AND product_id = (v_product->>'product_id')::UUID;
    
    IF FOUND THEN
      v_products_updated := v_products_updated + 1;
    END IF;
  END LOOP;

  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'setup_completed', true,
    'categories_updated', v_categories_updated,
    'products_updated', v_products_updated
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION integrations.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_categories_with_tracking_settings(p_store_id uuid)
 RETURNS TABLE(category_id uuid, category_code text, display_name_en text, display_name_fr text, typical_shelf_life_days integer, is_tracked boolean, auto_create_batches boolean, default_shelf_life_days integer, product_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate store_id
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;

  RETURN QUERY
  SELECT 
    c.category_id,
    c.category_code,
    c.display_name_en,
    c.display_name_fr,
    c.typical_shelf_life_days,
    -- Use COALESCE for settings that might not exist yet
    COALESCE(scs.is_tracked, TRUE) AS is_tracked,
    COALESCE(scs.auto_create_batches, FALSE) AS auto_create_batches,
    -- If store has override, use it; otherwise use category default
    COALESCE(scs.default_shelf_life_days, c.typical_shelf_life_days) AS default_shelf_life_days,
    -- Count products in this category for this store
    COALESCE(pc.product_count, 0) AS product_count
  FROM inventory.categories c
  LEFT JOIN inventory.store_category_settings scs 
    ON scs.category_id = c.category_id 
    AND scs.store_id = p_store_id
  LEFT JOIN (
    -- Subquery to count products per category for this store
    SELECT 
      p.category_id,
      COUNT(*)::BIGINT AS product_count
    FROM inventory.store_products sp
    JOIN inventory.products p ON p.product_id = sp.product_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
    GROUP BY p.category_id
  ) pc ON pc.category_id = c.category_id
  WHERE c.is_active = TRUE
  ORDER BY c.display_name_en ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_for_tracking_setup(p_store_id uuid, p_category_id uuid DEFAULT NULL::uuid, p_search_term text DEFAULT NULL::text, p_only_tracked boolean DEFAULT NULL::boolean, p_page_size integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(product_id uuid, name text, brand text, barcode text, image_url text, category_id uuid, category_name text, typical_shelf_life_days integer, is_tracked_for_batches boolean, shelf_life_override_days integer, auto_create_batches boolean, inherited_auto_create boolean, inherited_shelf_life_days integer, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate store_id
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;

  -- Cap page_size to prevent excessive queries
  IF p_page_size > 100 THEN
    p_page_size := 100;
  END IF;

  RETURN QUERY
  WITH filtered_products AS (
    SELECT 
      sp.product_id,
      p.name::TEXT,
      p.brand::TEXT,
      p.barcode::TEXT,
      COALESCE(sp.image_url, p.image_url)::TEXT AS image_url,
      p.category_id,
      c.display_name_en::TEXT AS category_name,
      COALESCE(c.typical_shelf_life_days, 0) AS typical_shelf_life_days,
      COALESCE(sp.is_tracked_for_batches, TRUE) AS is_tracked_for_batches,
      sp.shelf_life_override_days,
      sp.auto_create_batches,
      -- Inherited values from category settings
      COALESCE(scs.auto_create_batches, FALSE) AS inherited_auto_create,
      COALESCE(scs.default_shelf_life_days, c.typical_shelf_life_days, 0) AS inherited_shelf_life_days
    FROM inventory.store_products sp
    JOIN inventory.products p ON p.product_id = sp.product_id
    LEFT JOIN inventory.categories c ON c.category_id = p.category_id
    LEFT JOIN inventory.store_category_settings scs 
      ON scs.category_id = p.category_id 
      AND scs.store_id = p_store_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
      -- Optional category filter
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      -- Optional search filter (case-insensitive on name)
      AND (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%')
      -- Optional tracked filter
      AND (p_only_tracked IS NULL OR COALESCE(sp.is_tracked_for_batches, TRUE) = p_only_tracked)
  )
  SELECT 
    fp.product_id,
    fp.name,
    fp.brand,
    fp.barcode,
    fp.image_url,
    fp.category_id,
    fp.category_name,
    fp.typical_shelf_life_days,
    fp.is_tracked_for_batches,
    fp.shelf_life_override_days,
    fp.auto_create_batches,
    fp.inherited_auto_create,
    fp.inherited_shelf_life_days,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM filtered_products fp
  ORDER BY fp.name ASC
  LIMIT p_page_size
  OFFSET p_offset;
END;
$function$
;


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



  create policy "Only privileged users can delete transactions"
  on "sales"."transactions"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.store_id = transactions.store_id) AND (store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));



  create policy "Authorized users can insert sales events"
  on "timeseries"."sales_events"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.user_id = auth.uid()) AND (store_users.store_id = sales_events.store_id) AND (store_users.is_active = true) AND (((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) OR (((store_users.permissions ->> 'can_scan_out'::text))::boolean = true))))));



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


CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


