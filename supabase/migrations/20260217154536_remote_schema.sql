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

alter table "inventory"."batches" drop constraint "batches_source_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

drop index if exists "scoring"."idx_product_scores_recommendations";


  create table "inventory"."product_integration_links" (
    "link_id" uuid not null,
    "product_id" uuid not null,
    "integration_type" character varying(50) not null,
    "external_id" character varying(255) not null,
    "external_parent_id" character varying(255),
    "external_sku" character varying(255),
    "external_name" character varying(500),
    "is_authoritative" boolean,
    "claim_source" character varying(50),
    "name_mismatch_logged" boolean,
    "metadata" json,
    "synced_at" timestamp without time zone,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "inventory"."product_integration_links" enable row level security;

alter table "integrations"."square_connections" add column "initial_sync_error" text;

alter table "integrations"."square_connections" add column "initial_sync_status" character varying(50) default 'pending'::character varying;

alter table "inventory"."store_products" add column "quantity" numeric(12,4) default 0;

alter table "inventory"."store_products" add column "quantity_updated_at" timestamp without time zone;

CREATE UNIQUE INDEX product_integration_links_pkey ON inventory.product_integration_links USING btree (link_id);

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "inventory"."product_integration_links" add constraint "product_integration_links_pkey" PRIMARY KEY using index "product_integration_links_pkey";

alter table "integrations"."square_connections" add constraint "square_connections_initial_sync_status_check" CHECK (((initial_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "integrations"."square_connections" validate constraint "square_connections_initial_sync_status_check";

alter table "inventory"."product_integration_links" add constraint "product_integration_links_product_id_fkey" FOREIGN KEY (product_id) REFERENCES inventory.products(product_id) ON DELETE CASCADE not valid;

alter table "inventory"."product_integration_links" validate constraint "product_integration_links_product_id_fkey";

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batches" add constraint "batches_source_check" CHECK (((batch_source)::text = ANY (ARRAY['manual'::text, 'barcode'::text, 'scanned'::text, 'scan'::text, 'barcode_scan'::text, 'csv_import'::text, 'api'::text, 'pos_integration'::text, 'split'::text, 'square_sync'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_source_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_store_overviews()
 RETURNS TABLE(store_id uuid, store_name text, store_code text, business_name text, address text, city text, postal_code text, country text, timezone text, store_type text, is_active boolean, onboarding_completed boolean, owner_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, role_in_store text, permissions jsonb, product_count bigint, category_count bigint, is_square_store boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.store_id,
    s.store_name::text,
    s.store_code::text,
    s.business_name::text,
    s.address::text,
    s.city::text,
    s.postal_code::text,
    s.country::text,
    s.timezone::text,
    s.store_type::text,
    s.is_active,
    s.onboarding_completed,
    s.owner_id,
    s.created_at::timestamptz,
    s.updated_at::timestamptz,
    su.role_in_store::text,
    su.permissions,
    COALESCE(counts.product_count, 0)   AS product_count,
    COALESCE(counts.category_count, 0)  AS category_count,
    COALESCE(sq.has_square, false)      AS is_square_store
  FROM business.store_users su
  INNER JOIN business.stores s
    ON su.store_id = s.store_id
  -- Subquery: product + category counts per store
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT sp.product_id)  AS product_count,
      COUNT(DISTINCT p.category_id)  AS category_count
    FROM inventory.store_products sp
    INNER JOIN inventory.products p
      ON sp.product_id = p.product_id
    WHERE sp.store_id = s.store_id
      AND sp.is_active = true
  ) counts ON true
  -- Subquery: square connection check per store
  LEFT JOIN LATERAL (
    SELECT true AS has_square
    FROM integrations.square_connections sc
    WHERE sc.store_id = s.store_id
      AND sc.is_active = true
      AND sc.connection_status = 'active'
    LIMIT 1
  ) sq ON true
  WHERE su.user_id = current_user_id
    AND su.is_active = true
    AND s.is_active = true
  ORDER BY counts.product_count DESC, s.store_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_categories_with_tracking_settings(p_store_id uuid)
 RETURNS TABLE(category_id uuid, category_code text, display_name_en text, display_name_fr text, typical_shelf_life_days integer, is_tracked boolean, auto_create_batches boolean, default_shelf_life_days integer, product_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- CRITICAL: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
      AND user_id = v_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to store %', p_store_id;
  END IF;

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
    COALESCE(scs.is_tracked, TRUE) AS is_tracked,
    COALESCE(scs.auto_create_batches, FALSE) AS auto_create_batches,
    COALESCE(scs.default_shelf_life_days, c.typical_shelf_life_days) AS default_shelf_life_days,
    pc.product_count
  FROM inventory.categories c
  -- INNER JOIN instead of LEFT JOIN: only categories with products
  INNER JOIN (
    SELECT 
      p.category_id,
      COUNT(*)::BIGINT AS product_count
    FROM inventory.store_products sp
    JOIN inventory.products p ON p.product_id = sp.product_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
    GROUP BY p.category_id
  ) pc ON pc.category_id = c.category_id
  LEFT JOIN inventory.store_category_settings scs 
    ON scs.category_id = c.category_id 
    AND scs.store_id = p_store_id
  WHERE c.is_active = TRUE
  ORDER BY c.display_name_en ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION scoring.calculate_batch_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_days_to_expiry INTEGER;
  v_composite_score DECIMAL(3,2);
  v_urgency_level TEXT;
  v_recommendation TEXT;
  v_margin_percent DECIMAL(5,2);
  v_turnover_rate DECIMAL(5,2) DEFAULT 0.5; -- Default turnover rate
  v_category_risk DECIMAL(3,2) DEFAULT 0.5; -- Default category risk
  v_expiry_score DECIMAL(3,2);
  v_financial_score DECIMAL(3,2);
  v_quantity_score DECIMAL(3,2);
  v_potential_loss DECIMAL(10,2);
BEGIN
  -- Calculate days to expiry with proper casting
  v_days_to_expiry := EXTRACT(DAY FROM (NEW.expiry_date::date - CURRENT_DATE::date))::INTEGER;
  
  -- Calculate margin percentage
  IF NEW.selling_price > 0 THEN
    v_margin_percent := ((NEW.selling_price - NEW.cost_price) / NEW.selling_price) * 100;
  ELSE
    v_margin_percent := 0;
  END IF;

  -- Expiry score: 1.0 for expired, scaling down to 0 for 30+ days
  IF v_days_to_expiry <= 0 THEN
    v_expiry_score := 1.0;
  ELSIF v_days_to_expiry <= 1 THEN
    v_expiry_score := 0.95;
  ELSIF v_days_to_expiry <= 3 THEN
    v_expiry_score := 0.85;
  ELSIF v_days_to_expiry <= 7 THEN
    v_expiry_score := 0.70;
  ELSIF v_days_to_expiry <= 14 THEN
    v_expiry_score := 0.50;
  ELSIF v_days_to_expiry <= 30 THEN
    v_expiry_score := 0.30;
  ELSE
    v_expiry_score := GREATEST(0, 1.0 - (v_days_to_expiry / 100.0));
  END IF;

  -- Financial score: Based on potential loss value
  v_potential_loss := NEW.current_quantity * NEW.selling_price;
  -- Normalize to 0-1 scale (€500 = 1.0)
  v_financial_score := LEAST(1.0, v_potential_loss / 500.0);

  -- Quantity score: Higher quantities = higher risk
  -- Normalize to 0-1 scale (100 units = 1.0)
  v_quantity_score := LEAST(1.0, NEW.current_quantity / 100.0);

  -- Calculate weighted composite score
  v_composite_score := (
    (v_expiry_score * 0.40) +
    (v_financial_score * 0.30) +
    (v_quantity_score * 0.30)
  );

  -- Determine urgency level based on days to expiry
  IF v_days_to_expiry <= 0 THEN
    v_urgency_level := 'critical';
  ELSIF v_days_to_expiry <= 1 THEN
    v_urgency_level := 'high';
  ELSIF v_days_to_expiry <= 3 THEN
    v_urgency_level := 'medium';
  ELSE
    v_urgency_level := 'low';
  END IF;

  -- Generate recommendation based on score and urgency
  IF v_composite_score >= 0.8 THEN
    v_recommendation := 'immediate_action';
  ELSIF v_composite_score >= 0.6 THEN
    v_recommendation := 'discount_heavily';
  ELSIF v_composite_score >= 0.4 THEN
    v_recommendation := 'discount_moderate';
  ELSIF v_composite_score >= 0.2 THEN
    v_recommendation := 'monitor';
  ELSE
    v_recommendation := 'normal';
  END IF;

  -- Insert or update scoring data using the existing table structure
  INSERT INTO scoring.product_scores (
    batch_id,
    store_id,
    composite_score,
    expiry_score,
    financial_impact_score,
    quantity_risk_score,
    turnover_score,
    category_risk_score,
    recommendation,
    urgency_level,
    calculated_at,
    days_to_expiry,
    potential_loss,
    margin_percent,
    velocity_score,
    margin_score,
    ml_enhanced,
    confidence_level
  ) VALUES (
    NEW.batch_id,
    NEW.store_id,
    v_composite_score,
    v_expiry_score,
    v_financial_score,
    v_quantity_score,
    v_turnover_rate,
    v_category_risk,
    v_recommendation,
    v_urgency_level,
    NOW(),
    v_days_to_expiry,
    v_potential_loss,
    v_margin_percent,
    v_turnover_rate, -- Use as velocity score
    v_margin_percent / 100.0, -- Convert to 0-1 scale for margin score
    false, -- ml_enhanced
    0.85 -- Default confidence level
  )
  ON CONFLICT (batch_id) 
  DO UPDATE SET
    composite_score = EXCLUDED.composite_score,
    expiry_score = EXCLUDED.expiry_score,
    financial_impact_score = EXCLUDED.financial_impact_score,
    quantity_risk_score = EXCLUDED.quantity_risk_score,
    turnover_score = EXCLUDED.turnover_score,
    category_risk_score = EXCLUDED.category_risk_score,
    recommendation = EXCLUDED.recommendation,
    urgency_level = EXCLUDED.urgency_level,
    calculated_at = NOW(),
    days_to_expiry = EXCLUDED.days_to_expiry,
    potential_loss = EXCLUDED.potential_loss,
    margin_percent = EXCLUDED.margin_percent,
    velocity_score = EXCLUDED.velocity_score,
    margin_score = EXCLUDED.margin_score,
    confidence_level = EXCLUDED.confidence_level;

  RETURN NEW;
END;
$function$
;

grant delete on table "inventory"."product_integration_links" to "anon";

grant insert on table "inventory"."product_integration_links" to "anon";

grant references on table "inventory"."product_integration_links" to "anon";

grant select on table "inventory"."product_integration_links" to "anon";

grant trigger on table "inventory"."product_integration_links" to "anon";

grant truncate on table "inventory"."product_integration_links" to "anon";

grant update on table "inventory"."product_integration_links" to "anon";

grant delete on table "inventory"."product_integration_links" to "authenticated";

grant insert on table "inventory"."product_integration_links" to "authenticated";

grant references on table "inventory"."product_integration_links" to "authenticated";

grant select on table "inventory"."product_integration_links" to "authenticated";

grant trigger on table "inventory"."product_integration_links" to "authenticated";

grant truncate on table "inventory"."product_integration_links" to "authenticated";

grant update on table "inventory"."product_integration_links" to "authenticated";

grant delete on table "inventory"."product_integration_links" to "service_role";

grant insert on table "inventory"."product_integration_links" to "service_role";

grant references on table "inventory"."product_integration_links" to "service_role";

grant select on table "inventory"."product_integration_links" to "service_role";

grant trigger on table "inventory"."product_integration_links" to "service_role";

grant truncate on table "inventory"."product_integration_links" to "service_role";

grant update on table "inventory"."product_integration_links" to "service_role";


  create policy "Service role has full access to product integration links"
  on "inventory"."product_integration_links"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can create product integration links for their stores"
  on "inventory"."product_integration_links"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (inventory.store_products sp
     JOIN business.store_users su ON ((su.store_id = sp.store_id)))
  WHERE ((sp.product_id = product_integration_links.product_id) AND (su.user_id = auth.uid()) AND (su.is_active = true)))));



  create policy "Users can delete product integration links for their stores"
  on "inventory"."product_integration_links"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (inventory.store_products sp
     JOIN business.store_users su ON ((su.store_id = sp.store_id)))
  WHERE ((sp.product_id = product_integration_links.product_id) AND (su.user_id = auth.uid()) AND (su.is_active = true)))));



  create policy "Users can update product integration links for their stores"
  on "inventory"."product_integration_links"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (inventory.store_products sp
     JOIN business.store_users su ON ((su.store_id = sp.store_id)))
  WHERE ((sp.product_id = product_integration_links.product_id) AND (su.user_id = auth.uid()) AND (su.is_active = true)))));



  create policy "Users can view product integration links for their stores"
  on "inventory"."product_integration_links"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (inventory.store_products sp
     JOIN business.store_users su ON ((su.store_id = sp.store_id)))
  WHERE ((sp.product_id = product_integration_links.product_id) AND (su.user_id = auth.uid()) AND (su.is_active = true)))));



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



