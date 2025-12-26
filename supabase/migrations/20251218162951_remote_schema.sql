drop trigger if exists "trigger_batches_updated_at" on "inventory"."batches";

drop trigger if exists "trigger_categories_updated_at" on "inventory"."categories";

drop trigger if exists "trigger_update_cache_updated_at" on "inventory"."product_recognition_cache";

drop trigger if exists "trigger_products_updated_at" on "inventory"."products";

drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

drop policy "sales_events_store_access" on "public"."sales_events";

drop policy "store_products_store_access" on "public"."store_products";

drop policy "store_settings_store_access" on "public"."store_settings";

drop policy "store_users_delete_owner" on "public"."store_users";

drop policy "store_users_manage_owner" on "public"."store_users";

drop policy "store_users_read_member" on "public"."store_users";

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

alter table "inventory"."batch_actions" drop constraint "batch_action_entries_quantity_affected_check";

alter table "inventory"."batch_actions" drop constraint "batch_actions_valid_action";

alter table "inventory"."batch_actions" drop constraint "valid_action_specific_fields";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

drop view if exists "inventory"."automation_preview";

drop view if exists "inventory"."batch_expiry_status";

drop view if exists "inventory"."batch_todo_states";

drop view if exists "inventory"."expiring_products";

drop function if exists "inventory"."get_action_statistics"(p_store_id uuid, p_start_date date, p_end_date date);

drop function if exists "inventory"."get_batch_action_breakdown"(p_batch_id uuid);

drop function if exists "inventory"."get_donation_recipients"(p_store_id uuid);

drop function if exists "inventory"."get_recent_actions"(p_store_id uuid, p_limit integer);

drop view if exists "inventory"."my_store_products";

drop view if exists "inventory"."products_needing_barcodes";

drop view if exists "inventory"."products_with_categories";

drop function if exists "public"."get_todos_dashboard"(p_store_id uuid);

drop function if exists "public"."get_todos_with_counts"(p_store_id uuid, p_filters jsonb, p_limit integer, p_offset integer);

drop function if exists "public"."get_todos_with_filters"(p_store_id uuid, p_filters jsonb, p_limit integer, p_offset integer);

drop view if exists "public"."inventory_view_for_scoring";

drop view if exists "scoring"."recommendation_accuracy";

drop index if exists "scoring"."idx_product_scores_recommendations";

alter table "analytics"."actions" alter column "action_id" set default extensions.uuid_generate_v4();

alter table "business"."stores" alter column "store_id" set default extensions.uuid_generate_v4();

alter table "inventory"."batch_actions" alter column "action_type" set data type public.action_type using "action_type"::text::public.action_type;

alter table "inventory"."batch_actions" alter column "recommended_action" set data type public.action_type using "recommended_action"::text::public.action_type;

alter table "inventory"."batch_status_logs" alter column "log_id" set default extensions.uuid_generate_v4();

alter table "inventory"."batches" alter column "batch_id" set default extensions.uuid_generate_v4();

alter table "inventory"."donation_recipients" alter column "recipient_type" set data type public.donation_recipient_type using "recipient_type"::text::public.donation_recipient_type;

alter table "inventory"."products" alter column "product_id" set default extensions.uuid_generate_v4();

alter table "scoring"."product_scores" alter column "score_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."external_factors" alter column "factor_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."inventory_snapshots" alter column "snapshot_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."sales_events" alter column "event_id" set default extensions.uuid_generate_v4();

alter table "user_mgmt"."roles" alter column "role_id" set default extensions.uuid_generate_v4();

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batch_actions" add constraint "batch_action_entries_quantity_affected_check" CHECK (((quantity_affected > (0)::numeric) OR ((quantity_affected = (0)::numeric) AND (action_type = 'ignored'::public.action_type)))) not valid;

alter table "inventory"."batch_actions" validate constraint "batch_action_entries_quantity_affected_check";

alter table "inventory"."batch_actions" add constraint "batch_actions_valid_action" CHECK ((((action_type IS NOT NULL) AND (action_type <> 'ignored'::public.action_type) AND (performed_by IS NOT NULL) AND (quantity_affected IS NOT NULL) AND (quantity_affected > (0)::numeric)) OR ((action_type = 'ignored'::public.action_type) AND (quantity_affected IS NOT NULL)))) not valid;

alter table "inventory"."batch_actions" validate constraint "batch_actions_valid_action";

alter table "inventory"."batch_actions" add constraint "valid_action_specific_fields" CHECK ((((action_type = 'discount'::public.action_type) AND (discount_percentage IS NOT NULL)) OR (action_type = 'donate'::public.action_type) OR ((action_type = 'dispose'::public.action_type) AND (disposal_reason IS NOT NULL)) OR (action_type = ANY (ARRAY['maintain'::public.action_type, 'ignored'::public.action_type, 'donate_prepared'::public.action_type, 'sold'::public.action_type])))) not valid;

alter table "inventory"."batch_actions" validate constraint "valid_action_specific_fields";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

set check_function_bodies = off;

create or replace view "inventory"."automation_preview" as  SELECT b.batch_id,
    p.name AS product_name,
    p.brand,
    b.expiry_date,
    b.current_quantity,
    b.status AS current_status,
        CASE
            WHEN (b.current_quantity <= (0)::numeric) THEN 'sold_out'::character varying
            WHEN (b.expiry_date < CURRENT_DATE) THEN 'expired'::character varying
            ELSE b.status
        END AS would_become_status,
    (b.current_quantity * b.selling_price) AS potential_loss_value,
    s.store_name,
    (b.expiry_date - CURRENT_DATE) AS days_past_expiry
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     JOIN business.stores s ON ((b.store_id = s.store_id)))
  WHERE (((b.status)::text = 'active'::text) AND ((b.expiry_date < CURRENT_DATE) OR (b.current_quantity <= (0)::numeric)))
  ORDER BY b.expiry_date;


create or replace view "inventory"."batch_expiry_status" as  SELECT b.batch_id,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.created_at,
    p.name AS product_name,
    p.category_id,
    c.display_name_en AS category_name,
    c.category_code,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
        CASE
            WHEN ((b.expiry_date - CURRENT_DATE) <= 1) THEN 'Critical'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 7) THEN 'Urgent'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 14) THEN 'Warning'::text
            ELSE 'Normal'::text
        END AS urgency_level,
        CASE
            WHEN (b.expiry_date < CURRENT_DATE) THEN 'Expired'::text
            WHEN (b.current_quantity = (0)::numeric) THEN 'Empty'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 7) THEN 'Expiring_Soon'::text
            ELSE 'Active'::text
        END AS status
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE (b.current_quantity > (0)::numeric)
  ORDER BY (b.expiry_date - CURRENT_DATE);


create or replace view "inventory"."batch_todo_states" as  WITH all_actions AS (
         SELECT DISTINCT ON (batch_actions.batch_id) batch_actions.batch_id,
            batch_actions.action_type AS last_action_type,
            batch_actions.performed_at AS last_action_time,
            batch_actions.quantity_affected AS last_action_quantity,
            batch_actions.discount_percentage AS action_discount_percent
           FROM inventory.batch_actions
          WHERE ((batch_actions.action_type IS NOT NULL) AND (batch_actions.performed_by IS NOT NULL) AND (batch_actions.quantity_affected > (0)::numeric))
          ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
        ), last_discount AS (
         SELECT DISTINCT ON (batch_actions.batch_id) batch_actions.batch_id,
            batch_actions.discount_percentage,
            batch_actions.performed_at AS discount_applied_at
           FROM inventory.batch_actions
          WHERE ((batch_actions.action_type = 'discount'::public.action_type) AND (batch_actions.discount_percentage IS NOT NULL))
          ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
        ), action_summary AS (
         SELECT batch_actions.batch_id,
            count(*) AS total_actions,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'discount'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_discounted,
            sum(
                CASE
                    WHEN (batch_actions.action_type = ANY (ARRAY['donate'::public.action_type, 'donate_prepared'::public.action_type])) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_donated,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'dispose'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_disposed,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'sold'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_sold,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'ignored'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_ignored,
            max(batch_actions.performed_at) AS last_action_date
           FROM inventory.batch_actions
          WHERE (batch_actions.action_type IS NOT NULL)
          GROUP BY batch_actions.batch_id
        )
 SELECT b.batch_id,
    b.store_id,
    b.batch_number,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.lifecycle_status,
    b.status AS batch_status,
    p.name AS product_name,
    p.brand AS product_brand,
    ps.recommendation AS ai_recommendation,
    ps.composite_score,
    ps.urgency_level,
    ps.calculated_at AS ai_calculated_at,
    aa.last_action_type,
    aa.last_action_time,
    aa.last_action_quantity,
    ld.discount_percentage AS last_discount_percent,
    COALESCE(acs.total_actions, (0)::bigint) AS total_actions_ever,
    COALESCE(acs.total_discounted, (0)::numeric) AS total_discounted_quantity,
    COALESCE(acs.total_donated, (0)::numeric) AS total_donated_quantity,
    COALESCE(acs.total_disposed, (0)::numeric) AS total_disposed_quantity,
    COALESCE(acs.total_sold, (0)::numeric) AS total_sold_quantity,
    COALESCE(acs.total_ignored, (0)::numeric) AS total_ignored_quantity,
    b.cost_price,
    b.selling_price,
        CASE
            WHEN (ld.discount_percentage IS NOT NULL) THEN (b.selling_price * ((1)::numeric - (ld.discount_percentage / (100)::numeric)))
            ELSE b.selling_price
        END AS current_selling_price,
    (b.selling_price - COALESCE(b.cost_price, (0)::numeric)) AS profit_margin,
        CASE
            WHEN (COALESCE(b.cost_price, (0)::numeric) > (0)::numeric) THEN (((b.selling_price - COALESCE(b.cost_price, (0)::numeric)) / b.cost_price) * (100)::numeric)
            ELSE (0)::numeric
        END AS profit_margin_percent,
    (b.current_quantity * COALESCE(b.cost_price, (0)::numeric)) AS potential_loss_value,
    (b.current_quantity * COALESCE(b.selling_price, (0)::numeric)) AS potential_revenue_value,
    (b.current_quantity *
        CASE
            WHEN (ld.discount_percentage IS NOT NULL) THEN (b.selling_price * ((1)::numeric - (ld.discount_percentage / (100)::numeric)))
            ELSE b.selling_price
        END) AS current_total_value,
    COALESCE(b.selling_price, (0)::numeric) AS unit_price,
        CASE
            WHEN (b.current_quantity = (0)::numeric) THEN 'completed'::text
            WHEN (aa.last_action_type = 'ignored'::public.action_type) THEN 'completed'::text
            WHEN (aa.last_action_type = ANY (ARRAY['discount'::public.action_type, 'donate_prepared'::public.action_type])) THEN 'in_progress'::text
            WHEN ((aa.last_action_type = ANY (ARRAY['donate'::public.action_type, 'dispose'::public.action_type, 'sold'::public.action_type])) AND (b.current_quantity > (0)::numeric)) THEN 'in_progress'::text
            WHEN (aa.last_action_type IS NOT NULL) THEN 'in_progress'::text
            ELSE 'pending'::text
        END AS completion_status,
        CASE
            WHEN ((aa.last_action_type = 'ignored'::public.action_type) AND ((ps.calculated_at IS NULL) OR (aa.last_action_time >= ps.calculated_at))) THEN 'recently_ignored'::text
            WHEN ((ps.urgency_level = ANY (ARRAY['critical'::text, 'high'::text])) AND ((aa.last_action_time IS NULL) OR (aa.last_action_time < ps.calculated_at)) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type))) THEN 'immediate_action'::text
            WHEN ((b.expiry_date >= (CURRENT_DATE - '7 days'::interval)) AND (b.expiry_date < CURRENT_DATE) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type)) AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text]))) THEN 'recently_expired'::text
            WHEN ((aa.last_action_time IS NOT NULL) AND (aa.last_action_time >= (now() - '24:00:00'::interval))) THEN
            CASE aa.last_action_type
                WHEN 'discount'::public.action_type THEN 'recently_discounted'::text
                WHEN 'donate_prepared'::public.action_type THEN 'ready_for_donation'::text
                WHEN 'donate'::public.action_type THEN 'recently_donated'::text
                WHEN 'dispose'::public.action_type THEN 'recently_disposed'::text
                WHEN 'sold'::public.action_type THEN 'recently_sold'::text
                WHEN 'ignored'::public.action_type THEN 'recently_ignored'::text
                ELSE 'recent_action'::text
            END
            WHEN ((aa.last_action_time IS NOT NULL) AND (aa.last_action_time < ps.calculated_at) AND (ps.calculated_at IS NOT NULL) AND (b.current_quantity > (0)::numeric) AND (aa.last_action_type <> 'ignored'::public.action_type)) THEN 'needs_reeval'::text
            WHEN (((ps.recommendation)::text = ANY ((ARRAY['discount_moderate'::character varying, 'discount_aggressive'::character varying, 'dispose'::character varying, 'alert'::character varying])::text[])) AND ((aa.last_action_time IS NULL) OR (aa.last_action_time < ps.calculated_at)) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type)) AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text]))) THEN 'pending_action'::text
            WHEN (((ps.recommendation)::text = ANY ((ARRAY['maintain'::character varying, 'monitor'::character varying, 'normal'::character varying])::text[])) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type))) THEN 'monitor_only'::text
            ELSE 'unknown'::text
        END AS todo_state,
        CASE
            WHEN (ps.urgency_level = 'critical'::text) THEN 1
            WHEN (ps.urgency_level = 'high'::text) THEN 2
            WHEN (ps.urgency_level = 'medium'::text) THEN 3
            ELSE 4
        END AS priority_order,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
        CASE
            WHEN (aa.last_action_time IS NOT NULL) THEN (EXTRACT(epoch FROM (now() - (aa.last_action_time)::timestamp with time zone)) / (3600)::numeric)
            ELSE NULL::numeric
        END AS hours_since_last_action,
    now() AS view_refreshed_at
   FROM (((((inventory.batches b
     LEFT JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN scoring.product_scores ps ON ((b.batch_id = ps.batch_id)))
     LEFT JOIN all_actions aa ON ((b.batch_id = aa.batch_id)))
     LEFT JOIN last_discount ld ON ((b.batch_id = ld.batch_id)))
     LEFT JOIN action_summary acs ON ((b.batch_id = acs.batch_id)));


create or replace view "inventory"."expiring_products" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
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
    c.category_code,
    c.display_name_en AS category_name,
    b.expiry_date,
    b.current_quantity,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry
   FROM ((inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
     JOIN inventory.batches b ON ((p.product_id = b.product_id)))
  WHERE ((b.expiry_date <= (CURRENT_DATE + '7 days'::interval)) AND ((b.status)::text = 'active'::text) AND (b.current_quantity > (0)::numeric));


CREATE OR REPLACE FUNCTION inventory.get_action_statistics(p_store_id uuid, p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(action_type public.action_type, total_actions bigint, total_quantity numeric, total_original_value numeric, total_recovered_value numeric, avg_recovery_rate numeric, most_common_day_of_week text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'public'
AS $function$
  SELECT 
    bae.action_type,
    COUNT(*) as total_actions,
    SUM(bae.quantity_affected) as total_quantity,
    SUM(bae.total_original_value) as total_original_value,
    SUM(bae.total_recovered_value) as total_recovered_value,
    CASE 
      WHEN SUM(bae.total_original_value) > 0 THEN 
        ROUND((SUM(bae.total_recovered_value) / SUM(bae.total_original_value)) * 100, 2)
      ELSE 0 
    END as avg_recovery_rate,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM bae.performed_at)) as most_common_day_of_week
  FROM batch_action_entries bae
  JOIN batches b ON b.batch_id = bae.batch_id
  WHERE b.store_id = p_store_id
  AND DATE(bae.performed_at) BETWEEN p_start_date AND p_end_date
  GROUP BY bae.action_type
  ORDER BY total_quantity DESC;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_batch_action_breakdown(p_batch_id uuid)
 RETURNS TABLE(batch_id uuid, batch_number character varying, product_name character varying, initial_quantity numeric, current_quantity numeric, action_type public.action_type, quantity_affected numeric, percentage_of_batch numeric, original_value numeric, recovered_value numeric, discount_percentage numeric, donation_recipient_name character varying, disposal_reason text, performed_by_name text, performed_at timestamp without time zone, verified_at timestamp without time zone, notes text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'auth', 'public'
AS $function$
  SELECT 
    b.batch_id,
    b.batch_number,
    p.name as product_name,
    b.initial_quantity,
    b.current_quantity,
    bae.action_type,
    bae.quantity_affected,
    CASE 
      WHEN b.initial_quantity > 0 THEN 
        ROUND((bae.quantity_affected / b.initial_quantity) * 100, 2)
      ELSE 0 
    END as percentage_of_batch,
    bae.total_original_value as original_value,
    bae.total_recovered_value as recovered_value,
    bae.discount_percentage,
    dr.name as donation_recipient_name,
    bae.disposal_reason,
    COALESCE(
      (SELECT email FROM auth.users WHERE id = bae.performed_by),
      'Unknown User'
    ) as performed_by_name,
    bae.performed_at,
    bae.verified_at,
    bae.notes
  FROM batches b
  JOIN products p ON p.product_id = b.product_id
  LEFT JOIN batch_action_entries bae ON bae.batch_id = b.batch_id
  LEFT JOIN donation_recipients dr ON dr.recipient_id = bae.donation_recipient_id
  WHERE b.batch_id = p_batch_id
  AND b.store_id IN (
    SELECT store_id FROM store_users 
    WHERE user_id = auth.uid()
  )
  ORDER BY bae.performed_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_donation_recipients(p_store_id uuid)
 RETURNS TABLE(recipient_id uuid, name character varying, recipient_type public.donation_recipient_type, contact_email character varying, contact_phone character varying, is_certified boolean, accepts_pickups boolean, max_distance_km integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'public'
AS $function$
  SELECT 
    dr.recipient_id,
    dr.name,
    dr.recipient_type,
    dr.contact_email,
    dr.contact_phone,
    dr.is_certified,
    dr.accepts_pickups,
    dr.max_distance_km
  FROM donation_recipients dr
  WHERE dr.store_id = p_store_id
  AND dr.is_active = true
  ORDER BY dr.name;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_recent_actions(p_store_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(entry_id uuid, batch_number character varying, product_name character varying, action_type public.action_type, quantity_affected numeric, original_value numeric, recovered_value numeric, performed_by_email text, performed_at timestamp without time zone, notes text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'auth', 'public'
AS $function$
  SELECT 
    bae.entry_id,
    b.batch_number,
    p.name as product_name,
    bae.action_type,
    bae.quantity_affected,
    bae.total_original_value as original_value,
    bae.total_recovered_value as recovered_value,
    COALESCE(u.email, 'Unknown User') as performed_by_email,
    bae.performed_at,
    bae.notes
  FROM batch_action_entries bae
  JOIN batches b ON b.batch_id = bae.batch_id
  JOIN products p ON p.product_id = b.product_id
  LEFT JOIN users u ON u.id = bae.performed_by
  WHERE b.store_id = p_store_id
  ORDER BY bae.performed_at DESC
  LIMIT p_limit;
$function$
;

create or replace view "inventory"."my_store_products" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
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
    c.display_name_en AS category_name
   FROM ((inventory.products p
     JOIN inventory.store_products sp ON ((p.product_id = sp.product_id)))
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE (sp.store_id IN ( SELECT su.store_id
           FROM business.store_users su
          WHERE (su.user_id = auth.uid())));


create or replace view "inventory"."products_needing_barcodes" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
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
    c.category_code,
    c.display_name_en AS category_name
   FROM (inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE ((p.barcode IS NULL) OR (p.barcode = ''::text) OR (p.is_verified = false));


create or replace view "inventory"."products_with_categories" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
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
    c.category_code,
    c.display_name_en AS category_display_name_en,
    c.display_name_fr AS category_display_name_fr,
    c.typical_shelf_life_days AS category_shelf_life,
    COALESCE(p.typical_shelf_life_days, c.typical_shelf_life_days) AS effective_shelf_life
   FROM (inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)));


CREATE OR REPLACE FUNCTION public.get_todos_dashboard(p_store_id uuid)
 RETURNS TABLE(batch_id uuid, batch_number character varying, product_name character varying, product_brand character varying, expiry_date date, current_quantity numeric, days_to_expiry integer, urgency_level text, ai_recommendation character varying, composite_score numeric, last_action_type public.action_type, last_action_time timestamp without time zone, last_discount_percent numeric, completion_status text, todo_state text, priority_order integer, hours_since_last_action numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'inventory', 'scoring'
AS $function$
DECLARE
  user_store_access BOOLEAN := FALSE;
BEGIN
  -- Check if user has access to this store (respects RLS)
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  -- If no access, return empty
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    bts.batch_id,
    bts.batch_number,
    bts.product_name,
    bts.product_brand,
    bts.expiry_date,
    bts.current_quantity,
    bts.days_to_expiry,
    bts.urgency_level,
    bts.ai_recommendation,
    bts.composite_score,
    bts.last_action_type,
    bts.last_action_time,
    bts.last_discount_percent,
    bts.completion_status,
    bts.todo_state,
    bts.priority_order,
    bts.hours_since_last_action
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND (
      bts.current_quantity > 0 OR  -- Active batches
      (bts.completion_status = 'completed' AND bts.last_action_time >= CURRENT_DATE)  -- Today's completed items
    )
  ORDER BY 
    bts.priority_order ASC,
    bts.days_to_expiry ASC,
    bts.composite_score DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_with_counts(p_store_id uuid, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone, total_count bigint, pending_count bigint, in_progress_count bigint, completed_count bigint, expiring_count bigint, expired_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_completion_status text;
    v_urgency_levels text[];
    v_action_types text[];
    v_batch_statuses text[];
    v_lifecycle_statuses text[];
    v_product_name text;
    v_days_to_expiry_max integer;
    v_days_to_expiry_min integer;
BEGIN
    -- Extract filter parameters from JSONB
    v_completion_status := p_filters->>'completion_status';
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;
    
    -- Extract arrays with proper null/empty handling
    IF p_filters ? 'urgency_level' 
       AND p_filters->'urgency_level' IS NOT NULL 
       AND jsonb_typeof(p_filters->'urgency_level') = 'array' 
       AND jsonb_array_length(p_filters->'urgency_level') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_urgency_levels
        FROM jsonb_array_elements_text(p_filters->'urgency_level');
    END IF;
    
    -- action_type filters by last_action_type (what action was taken)
    IF p_filters ? 'action_type' 
       AND p_filters->'action_type' IS NOT NULL 
       AND jsonb_typeof(p_filters->'action_type') = 'array'
       AND jsonb_array_length(p_filters->'action_type') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_action_types
        FROM jsonb_array_elements_text(p_filters->'action_type');
    END IF;
    
    IF p_filters ? 'batch_status' 
       AND p_filters->'batch_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'batch_status') = 'array'
       AND jsonb_array_length(p_filters->'batch_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_batch_statuses
        FROM jsonb_array_elements_text(p_filters->'batch_status');
    END IF;

    IF p_filters ? 'lifecycle_status' 
       AND p_filters->'lifecycle_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'lifecycle_status') = 'array'
       AND jsonb_array_length(p_filters->'lifecycle_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_lifecycle_statuses
        FROM jsonb_array_elements_text(p_filters->'lifecycle_status');
    END IF;

    -- Single query with window functions for counts
    RETURN QUERY
    WITH filtered_base AS (
        -- Base filtered data (no pagination yet)
        SELECT 
            bts.batch_id,
            bts.store_id,
            bts.batch_number,
            bts.expiry_date,
            bts.current_quantity,
            bts.available_quantity,
            bts.lifecycle_status,
            bts.batch_status,
            bts.product_name,
            bts.product_brand,
            bts.ai_recommendation,
            bts.composite_score,
            bts.urgency_level,
            bts.ai_calculated_at,
            bts.last_action_type,
            bts.last_action_time,
            bts.last_action_quantity,
            bts.last_discount_percent,
            bts.total_actions_ever,
            bts.total_discounted_quantity,
            bts.total_donated_quantity,
            bts.total_disposed_quantity,
            bts.total_sold_quantity,
            bts.total_ignored_quantity,
            bts.cost_price,
            bts.selling_price,
            bts.current_selling_price,
            bts.profit_margin,
            bts.profit_margin_percent,
            bts.potential_loss_value,
            bts.potential_revenue_value,
            bts.current_total_value,
            bts.unit_price,
            bts.completion_status,
            bts.todo_state,
            bts.priority_order,
            bts.days_to_expiry,
            bts.hours_since_last_action,
            bts.view_refreshed_at
        FROM inventory.batch_todo_states bts
        WHERE bts.store_id = p_store_id
          -- Completion status filter
          AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
          -- Urgency level filter
          AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
          -- Action type filter (uses last_action_type - what action was taken)
          AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
          -- Batch status filter (disposition)
          AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
          -- Lifecycle status filter (active/expired)
          AND (v_lifecycle_statuses IS NULL OR bts.lifecycle_status = ANY(v_lifecycle_statuses))
          -- Product name search
          AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
          -- Days to expiry range
          AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
          AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
    ),
    with_counts AS (
        -- Add counts using window functions (calculated once across all filtered rows)
        SELECT 
            fb.*,
            COUNT(*) OVER() as total_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'pending') OVER() as pending_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'in_progress') OVER() as in_progress_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'completed') OVER() as completed_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'active') OVER() as expiring_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'expired') OVER() as expired_count
        FROM filtered_base fb
    )
    SELECT 
        wc.batch_id,
        wc.store_id,
        wc.batch_number,
        wc.expiry_date,
        wc.current_quantity,
        wc.available_quantity,
        wc.lifecycle_status,
        wc.batch_status,
        wc.product_name,
        wc.product_brand,
        wc.ai_recommendation,
        wc.composite_score,
        wc.urgency_level,
        wc.ai_calculated_at,
        wc.last_action_type,
        wc.last_action_time,
        wc.last_action_quantity,
        wc.last_discount_percent,
        wc.total_actions_ever,
        wc.total_discounted_quantity,
        wc.total_donated_quantity,
        wc.total_disposed_quantity,
        wc.total_sold_quantity,
        wc.total_ignored_quantity,
        wc.cost_price,
        wc.selling_price,
        wc.current_selling_price,
        wc.profit_margin,
        wc.profit_margin_percent,
        wc.potential_loss_value,
        wc.potential_revenue_value,
        wc.current_total_value,
        wc.unit_price,
        wc.completion_status,
        wc.todo_state,
        wc.priority_order,
        wc.days_to_expiry,
        wc.hours_since_last_action,
        wc.view_refreshed_at,
        wc.total_count,
        wc.pending_count,
        wc.in_progress_count,
        wc.completed_count,
        wc.expiring_count,
        wc.expired_count
    FROM with_counts wc
    ORDER BY 
        wc.priority_order ASC,
        wc.days_to_expiry ASC,
        wc.expiry_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(p_store_id uuid, p_filters jsonb, p_limit integer, p_offset integer)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_completion_status text;
    v_urgency_levels text[];
    v_action_types text[];
    v_batch_statuses text[];
    v_lifecycle_statuses text[];  -- NEW
    v_product_name text;
    v_days_to_expiry_max integer;
    v_days_to_expiry_min integer;
BEGIN
    -- Extract filter parameters from JSONB
    v_completion_status := p_filters->>'completion_status';
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;
    
    -- Extract arrays from JSONB (with proper null and type checking)
    IF p_filters ? 'urgency_level' 
       AND p_filters->'urgency_level' IS NOT NULL 
       AND jsonb_typeof(p_filters->'urgency_level') = 'array' 
       AND jsonb_array_length(p_filters->'urgency_level') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_urgency_levels
        FROM jsonb_array_elements_text(p_filters->'urgency_level');
    END IF;
    
    IF p_filters ? 'action_type' 
       AND p_filters->'action_type' IS NOT NULL 
       AND jsonb_typeof(p_filters->'action_type') = 'array'
       AND jsonb_array_length(p_filters->'action_type') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_action_types
        FROM jsonb_array_elements_text(p_filters->'action_type');
    END IF;
    
    IF p_filters ? 'batch_status' 
       AND p_filters->'batch_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'batch_status') = 'array'
       AND jsonb_array_length(p_filters->'batch_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_batch_statuses
        FROM jsonb_array_elements_text(p_filters->'batch_status');
    END IF;

    -- NEW: Extract lifecycle_status filter
    IF p_filters ? 'lifecycle_status' 
       AND p_filters->'lifecycle_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'lifecycle_status') = 'array'
       AND jsonb_array_length(p_filters->'lifecycle_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_lifecycle_statuses
        FROM jsonb_array_elements_text(p_filters->'lifecycle_status');
    END IF;

    -- Query the view with filters
    RETURN QUERY
    SELECT 
        bts.batch_id,
        bts.store_id,
        bts.batch_number,
        bts.expiry_date,
        bts.current_quantity,
        bts.available_quantity,
        bts.lifecycle_status,  -- NEW
        bts.batch_status,
        bts.product_name,
        bts.product_brand,
        bts.ai_recommendation,
        bts.composite_score,
        bts.urgency_level,
        bts.ai_calculated_at,
        bts.last_action_type,
        bts.last_action_time,
        bts.last_action_quantity,
        bts.last_discount_percent,
        bts.total_actions_ever,
        bts.total_discounted_quantity,
        bts.total_donated_quantity,
        bts.total_disposed_quantity,
        bts.total_sold_quantity,
        bts.total_ignored_quantity,
        bts.cost_price,
        bts.selling_price,
        bts.current_selling_price,
        bts.profit_margin,
        bts.profit_margin_percent,
        bts.potential_loss_value,
        bts.potential_revenue_value,
        bts.current_total_value,
        bts.unit_price,
        bts.completion_status,
        bts.todo_state,
        bts.priority_order,
        bts.days_to_expiry,
        bts.hours_since_last_action,
        bts.view_refreshed_at
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
      AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
      AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
      AND (v_lifecycle_statuses IS NULL OR bts.lifecycle_status = ANY(v_lifecycle_statuses))  -- NEW
      AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
      AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
    ORDER BY 
        bts.priority_order ASC,
        bts.days_to_expiry ASC,
        bts.expiry_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;

create or replace view "public"."inventory_view_for_scoring" as  SELECT b.batch_id,
    b.product_id,
    p.sku,
    c.display_name_en AS category,
    c.category_code,
    b.current_quantity,
    b.expiry_date,
    b.selling_price,
    b.cost_price,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
    COALESCE(c.typical_shelf_life_days, p.typical_shelf_life_days, 30) AS typical_shelf_life_days,
    b.store_id
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE ((b.status)::text = 'active'::text);


create or replace view "scoring"."recommendation_accuracy" as  SELECT ps.batch_id,
    ps.store_id,
    ps.recommendation AS ai_recommended,
    ba.action_type AS user_action,
    ps.composite_score,
    ps.urgency_level,
    ps.status,
    ps.calculated_at AS ai_scored_at,
    ps.completed_at AS action_taken_at,
    ba.performed_by,
    ba.quantity_affected,
    ba.total_original_value,
    ba.total_recovered_value,
        CASE
            WHEN ((ba.action_type)::text = (ps.recommendation)::text) THEN true
            WHEN ((ba.action_type = 'discount'::public.action_type) AND ((ps.recommendation)::text = ANY (ARRAY[('discount_aggressive'::character varying)::text, ('discount_moderate'::character varying)::text, ('discount_light'::character varying)::text]))) THEN true
            ELSE false
        END AS user_followed_ai,
        CASE
            WHEN (ba.total_original_value > (0)::numeric) THEN ((ba.total_recovered_value / ba.total_original_value) * (100)::numeric)
            ELSE (0)::numeric
        END AS recovery_rate_percent
   FROM (scoring.product_scores ps
     LEFT JOIN inventory.batch_actions ba ON ((ba.batch_id = ps.batch_id)))
  WHERE (ps.status = ANY (ARRAY['completed'::text, 'dismissed'::text]))
  ORDER BY ps.completed_at DESC;



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



  create policy "sales_events_store_access"
  on "public"."sales_events"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "store_products_store_access"
  on "public"."store_products"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "store_settings_store_access"
  on "public"."store_settings"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



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



  create policy "store_users_read_member"
  on "public"."store_users"
  as permissive
  for select
  to authenticated
using ((((user_id)::text = ((auth.uid())::character varying)::text) OR public.rls_check_store_access((store_id)::uuid)));



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


CREATE TRIGGER trigger_batches_updated_at BEFORE UPDATE ON inventory.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON inventory.categories FOR EACH ROW EXECUTE FUNCTION public.update_categories_updated_at();

CREATE TRIGGER trigger_update_cache_updated_at BEFORE UPDATE ON inventory.product_recognition_cache FOR EACH ROW EXECUTE FUNCTION public.update_cache_updated_at();

CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON inventory.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

drop trigger if exists "on_auth_user_created" on "auth"."users";

drop trigger if exists "on_auth_user_created_create_preferences" on "auth"."users";

drop trigger if exists "set_french_default_trigger" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_create_preferences AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences_on_signup();

CREATE TRIGGER set_french_default_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.set_default_french_language();


