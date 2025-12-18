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

drop view if exists "inventory"."automation_preview";

drop view if exists "inventory"."batch_expiry_status";

drop view if exists "inventory"."batch_todo_states";

drop view if exists "inventory"."expiring_products";

drop view if exists "inventory"."my_store_products";

drop view if exists "inventory"."products_needing_barcodes";

drop view if exists "inventory"."products_with_categories";

drop view if exists "public"."inventory_view_for_scoring";

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

CREATE OR REPLACE FUNCTION public.update_batch(p_batch_id uuid, p_updates jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'inventory', 'business'
AS $function$
DECLARE
  v_user_id UUID;
  v_batch RECORD;
  v_store_id UUID;
  v_user_role TEXT;
  v_is_authorized BOOLEAN;
  v_result RECORD;
BEGIN
  -- Get the user ID from auth context or parameter
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Get the batch and verify it exists
  SELECT b.*, s.store_name
  INTO v_batch
  FROM inventory.batches b
  JOIN business.stores s ON b.store_id = s.store_id
  WHERE b.batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Batch with ID "%s" not found', p_batch_id),
      'error_code', 'BATCH_NOT_FOUND'
    );
  END IF;
  
  v_store_id := v_batch.store_id;
  
  -- Check user authorization for this store
  SELECT su.role_in_store
  INTO v_user_role
  FROM business.store_users su
  WHERE su.store_id = v_store_id
    AND su.user_id = v_user_id
    AND su.is_active = true;
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have access to this store',
      'error_code', 'NO_STORE_ACCESS'
    );
  END IF;
  
  -- Check if user has permission to update batches
  -- Include both 'staff' and 'employee' for compatibility
  v_is_authorized := v_user_role IN ('owner', 'manager', 'staff', 'employee');
  
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Role "%s" is not authorized to update batches', v_user_role),
      'error_code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;
  
  -- Perform the update with allowed fields only
  UPDATE inventory.batches
  SET
    expiry_date = CASE 
      WHEN p_updates ? 'expiry_date' AND p_updates->>'expiry_date' IS NOT NULL 
      THEN (p_updates->>'expiry_date')::date 
      ELSE expiry_date 
    END,
    manufacture_date = CASE 
      WHEN p_updates ? 'manufacture_date' 
      THEN (p_updates->>'manufacture_date')::date 
      ELSE manufacture_date 
    END,
    current_quantity = CASE 
      WHEN p_updates ? 'current_quantity' 
      THEN (p_updates->>'current_quantity')::numeric 
      ELSE current_quantity 
    END,
    initial_quantity = CASE 
      WHEN p_updates ? 'initial_quantity' 
      THEN (p_updates->>'initial_quantity')::numeric 
      ELSE initial_quantity 
    END,
    cost_price = CASE 
      WHEN p_updates ? 'cost_price' 
      THEN (p_updates->>'cost_price')::numeric 
      ELSE cost_price 
    END,
    selling_price = CASE 
      WHEN p_updates ? 'selling_price' 
      THEN (p_updates->>'selling_price')::numeric 
      ELSE selling_price 
    END,
    location_code = CASE 
      WHEN p_updates ? 'location_code' 
      THEN p_updates->>'location_code' 
      ELSE location_code 
    END,
    supplier = CASE 
      WHEN p_updates ? 'supplier' 
      THEN p_updates->>'supplier' 
      ELSE supplier 
    END,
    batch_number = CASE 
      WHEN p_updates ? 'batch_number' 
      THEN p_updates->>'batch_number' 
      ELSE batch_number 
    END,
    status = CASE 
      WHEN p_updates ? 'status' 
      THEN p_updates->>'status' 
      ELSE status 
    END,
    verification_status = CASE 
      WHEN p_updates ? 'verification_status' 
      THEN p_updates->>'verification_status' 
      ELSE verification_status 
    END,
    updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING *
  INTO v_result;
  
  -- Return the updated batch
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'batch_id', v_result.batch_id,
      'batch_number', v_result.batch_number,
      'product_id', v_result.product_id,
      'store_id', v_result.store_id,
      'expiry_date', v_result.expiry_date,
      'manufacture_date', v_result.manufacture_date,
      'current_quantity', v_result.current_quantity,
      'initial_quantity', v_result.initial_quantity,
      'available_quantity', v_result.available_quantity,
      'cost_price', v_result.cost_price,
      'selling_price', v_result.selling_price,
      'location_code', v_result.location_code,
      'supplier', v_result.supplier,
      'status', v_result.status,
      'verification_status', v_result.verification_status,
      'created_at', v_result.created_at,
      'updated_at', v_result.updated_at
    )
  );

EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Validation failed: ' || SQLERRM,
      'error_code', 'VALIDATION_ERROR'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$
;

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



