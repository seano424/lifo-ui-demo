create extension if not exists "pg_jsonschema" with schema "extensions";

drop trigger if exists "trigger_refresh_user_permissions_on_stores" on "business"."stores";

drop trigger if exists "trg_pil_updated_at" on "inventory"."product_integration_links";

drop policy "pil_all_service_role" on "inventory"."product_integration_links";

drop policy "pil_select_authenticated" on "inventory"."product_integration_links";

drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

drop policy "Only privileged users can delete transactions" on "sales"."transactions";

drop policy "Authorized users can insert sales events" on "timeseries"."sales_events";

drop policy "Store managers can assign roles" on "user_mgmt"."user_roles";

drop policy "Store managers can update user roles" on "user_mgmt"."user_roles";

drop policy "Store managers can create employee accounts" on "user_mgmt"."users";

drop policy "Store managers can update employee profiles" on "user_mgmt"."users";

drop policy "Store managers can view employee profiles" on "user_mgmt"."users";

alter table "inventory"."product_integration_links" drop constraint "pil_unique_integration_external";

alter table "inventory"."product_integration_links" drop constraint "pil_unique_product_integration";

alter table "business"."store_users" drop constraint "chk_pin_access_level";

alter table "business"."store_users" drop constraint "store_users_role_in_store_check";

alter table "business"."stores" drop constraint "stores_size_category_check";

alter table "inventory"."batches" drop constraint "batches_source_check";

alter table "inventory"."batches" drop constraint "batches_status_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

alter table "scoring"."product_scores" drop constraint "product_scores_status_check";

drop function if exists "inventory"."update_pil_updated_at"();

drop function if exists "user_mgmt"."gdpr_delete_user"(target_user_id uuid, deletion_type text, performed_by_user_id uuid);

drop function if exists "user_mgmt"."gdpr_delete_user_and_stores"(target_user_id uuid, delete_owned_stores boolean, deletion_type text, performed_by_user_id uuid);

drop function if exists "user_mgmt"."request_account_deletion"(deletion_reason text);

drop function if exists "public"."update_expired_batch_statuses"();

drop index if exists "inventory"."idx_pil_integration_external";

drop index if exists "inventory"."idx_pil_integration_sku";

drop index if exists "inventory"."idx_pil_product_id";

drop index if exists "inventory"."pil_unique_integration_external";

drop index if exists "inventory"."pil_unique_product_integration";

drop index if exists "scoring"."idx_product_scores_recommendations";


  create table "public"."sales_events" (
    "event_id" character varying(36) not null,
    "batch_id" character varying(36),
    "store_id" character varying(36),
    "sku" character varying(100),
    "quantity_sold" numeric(12,4),
    "sale_price" numeric(12,4),
    "sale_timestamp" timestamp without time zone,
    "channel" character varying(50),
    "customer_type" character varying(50)
      );


alter table "public"."sales_events" enable row level security;


  create table "public"."store_settings" (
    "store_id" character varying(36) not null,
    "scoring_weights" json,
    "donation_preference_config" json,
    "critical_threshold" numeric(3,2),
    "warning_threshold" numeric(3,2),
    "opening_hours" json,
    "peak_hours" json,
    "weather_location_lat" numeric(10,8),
    "weather_location_lon" numeric(11,8),
    "currency" character varying(3),
    "updated_at" timestamp without time zone
      );


alter table "public"."store_settings" enable row level security;


  create table "public"."store_users" (
    "store_id" character varying(36) not null,
    "user_id" character varying(36) not null,
    "role_in_store" character varying(50),
    "permissions" json,
    "assigned_at" timestamp without time zone,
    "assigned_by" character varying(36),
    "is_active" boolean
      );


alter table "public"."store_users" enable row level security;

alter table "inventory"."product_integration_links" alter column "created_at" drop default;

alter table "inventory"."product_integration_links" alter column "created_at" drop not null;

alter table "inventory"."product_integration_links" alter column "is_authoritative" drop default;

alter table "inventory"."product_integration_links" alter column "link_id" drop default;

alter table "inventory"."product_integration_links" alter column "metadata" drop default;

alter table "inventory"."product_integration_links" alter column "metadata" set data type json using "metadata"::json;

alter table "inventory"."product_integration_links" alter column "name_mismatch_logged" drop default;

alter table "inventory"."product_integration_links" alter column "updated_at" drop default;

alter table "inventory"."product_integration_links" alter column "updated_at" drop not null;

alter table "user_mgmt"."users" add column "deleted_at" timestamp without time zone;

alter table "user_mgmt"."users" add column "deletion_requested_at" timestamp without time zone;

CREATE INDEX idx_batches_expiry_lookup ON inventory.batches USING btree (store_id, expiry_date, status, current_quantity) WHERE (((status)::text = 'active'::text) AND (current_quantity > (0)::numeric));

CREATE INDEX idx_batches_lifecycle_status ON inventory.batches USING btree (lifecycle_status);

CREATE UNIQUE INDEX sales_events_pkey ON public.sales_events USING btree (event_id);

CREATE UNIQUE INDEX store_settings_pkey ON public.store_settings USING btree (store_id);

CREATE UNIQUE INDEX store_users_pkey ON public.store_users USING btree (store_id, user_id);

CREATE INDEX idx_gdpr_deletion_log_deletion_completed_at ON user_mgmt.gdpr_deletion_log USING btree (deletion_completed_at);

CREATE INDEX idx_gdpr_deletion_log_user_id ON user_mgmt.gdpr_deletion_log USING btree (user_id);

CREATE INDEX idx_users_active_deleted ON user_mgmt.users USING btree (is_active, deleted_at) WHERE (is_active = true);

CREATE INDEX idx_users_pending_deletion ON user_mgmt.users USING btree (deletion_requested_at) WHERE ((deletion_requested_at IS NOT NULL) AND (deleted_at IS NULL));

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "public"."sales_events" add constraint "sales_events_pkey" PRIMARY KEY using index "sales_events_pkey";

alter table "public"."store_settings" add constraint "store_settings_pkey" PRIMARY KEY using index "store_settings_pkey";

alter table "public"."store_users" add constraint "store_users_pkey" PRIMARY KEY using index "store_users_pkey";

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batches" add constraint "batches_source_check" CHECK (((batch_source)::text = ANY (ARRAY['manual'::text, 'barcode'::text, 'scanned'::text, 'scan'::text, 'barcode_scan'::text, 'csv_import'::text, 'api'::text, 'pos_integration'::text, 'split'::text, 'square_sync'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_source_check";

alter table "inventory"."batches" add constraint "batches_status_check" CHECK (((status)::text = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'damaged'::text, 'sold_out'::text, 'reserved'::text, 'donated'::text, 'disposed'::text, 'ignored'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_status_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

alter table "scoring"."product_scores" add constraint "product_scores_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'dismissed'::text]))) not valid;

alter table "scoring"."product_scores" validate constraint "product_scores_status_check";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION inventory.get_draft_batches_summary(p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result JSONB;
  v_totals RECORD;
  v_by_category JSONB;
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
      'error', 'Access denied to this store'
    );
  END IF;

  -- Get totals
  SELECT 
    COUNT(*)::INTEGER AS total_draft_batches,
    COALESCE(SUM(b.current_quantity), 0)::NUMERIC AS total_units,
    COUNT(DISTINCT b.product_id)::INTEGER AS products_with_drafts,
    MIN(b.created_at) AS oldest_draft_created_at
  INTO v_totals
  FROM inventory.batches b
  WHERE b.store_id = p_store_id 
    AND b.status = 'draft';

  -- Get breakdown by category
  SELECT COALESCE(jsonb_agg(cat_data ORDER BY cat_data->>'total_units' DESC), '[]'::jsonb)
  INTO v_by_category
  FROM (
    SELECT jsonb_build_object(
      'category_id', c.category_id,
      'category_code', COALESCE(c.category_code, 'uncategorized'),
      'category_name', COALESCE(c.display_name_en, 'Uncategorized'),
      'product_count', COUNT(DISTINCT b.product_id),
      'total_units', SUM(b.current_quantity)
    ) AS cat_data
    FROM inventory.batches b
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id 
      AND b.status = 'draft'
    GROUP BY c.category_id, c.category_code, c.display_name_en
  ) sub;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'total_draft_batches', v_totals.total_draft_batches,
    'total_units', v_totals.total_units,
    'products_with_drafts', v_totals.products_with_drafts,
    'oldest_draft_created_at', v_totals.oldest_draft_created_at,
    'by_category', v_by_category
  );

  RETURN v_result;
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

CREATE OR REPLACE FUNCTION inventory.get_recent_delivery_products(p_store_id uuid, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_results JSONB;
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

  -- Get recent delivery products based on batch received_date
  SELECT COALESCE(jsonb_agg(product_data), '[]'::JSONB)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'product_id', p.product_id,
      'product_name', p.name,
      'last_delivery_quantity', (
        SELECT b2.initial_quantity 
        FROM inventory.batches b2 
        WHERE b2.product_id = p.product_id 
          AND b2.store_id = p_store_id
        ORDER BY b2.received_date DESC NULLS LAST, b2.created_at DESC
        LIMIT 1
      ),
      'last_expiry_days', (
        SELECT (b3.expiry_date - b3.received_date)::INTEGER
        FROM inventory.batches b3
        WHERE b3.product_id = p.product_id 
          AND b3.store_id = p_store_id
          AND b3.expiry_date IS NOT NULL
          AND b3.received_date IS NOT NULL
        ORDER BY b3.received_date DESC NULLS LAST, b3.created_at DESC
        LIMIT 1
      ),
      'total_delivery_count', COUNT(DISTINCT b.batch_id)
    ) AS product_data
    FROM inventory.batches b
    JOIN inventory.products p ON b.product_id = p.product_id
    WHERE b.store_id = p_store_id
    GROUP BY p.product_id, p.name
    ORDER BY MAX(b.received_date) DESC NULLS LAST, MAX(b.created_at) DESC
    LIMIT p_limit
  ) sub;

  RETURN v_results;
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

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(target_user_id uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT user_mgmt.cancel_account_deletion(target_user_id);
$function$
;

CREATE OR REPLACE FUNCTION public.gdpr_delete_user(target_user_id uuid, deletion_type text DEFAULT 'user_request'::text, performed_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT user_mgmt.gdpr_delete_user(target_user_id, deletion_type, performed_by_user_id);
$function$
;

CREATE OR REPLACE FUNCTION public.gdpr_delete_user_and_stores(target_user_id uuid, delete_owned_stores boolean DEFAULT false, deletion_type text DEFAULT 'user_request'::text, performed_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT user_mgmt.gdpr_delete_user_and_stores(target_user_id, delete_owned_stores, deletion_type, performed_by_user_id);
$function$
;

CREATE OR REPLACE FUNCTION public.get_deletion_status(target_user_id uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT user_mgmt.get_deletion_status(target_user_id);
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

CREATE OR REPLACE FUNCTION public.process_expired_deletions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'This function can only be called by system processes');
    END IF;
    RETURN user_mgmt.process_expired_deletions();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_account_deletion(target_user_id uuid, deletion_type text DEFAULT 'user_request'::text)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT user_mgmt.request_account_deletion(target_user_id, deletion_type);
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

CREATE OR REPLACE FUNCTION public.rls_check_store_access(check_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'business'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = check_store_id
      AND su.is_active = true
  );
$function$
;

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

CREATE OR REPLACE FUNCTION user_mgmt.cancel_account_deletion(target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user RECORD;
BEGIN
  -- Only allow users to cancel deletion of their own account
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: You can only cancel your own account deletion');
  END IF;

  SELECT user_id, email, deletion_requested_at, deleted_at
  INTO v_user
  FROM user_mgmt.users
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF v_user.deleted_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Account already permanently deleted');
  END IF;

  IF v_user.deletion_requested_at IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No pending deletion to cancel');
  END IF;

  -- Clear the deletion request
  UPDATE user_mgmt.users
  SET deletion_requested_at = NULL,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Update the log
  UPDATE user_mgmt.gdpr_deletion_log
  SET deletion_completed_at = NOW(),
      business_impact_notes = business_impact_notes || '. CANCELLED: User reactivated their account.'
  WHERE user_id = target_user_id
    AND deletion_completed_at IS NULL;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deletion cancelled. Welcome back!'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION user_mgmt.gdpr_delete_user(p_target_user_id uuid, p_deletion_type text DEFAULT 'user_request'::text, p_performed_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_caller_id uuid;
    v_is_authorized boolean := false;
    v_batch_count int;
    v_product_count int;
    v_batch_action_count int;
    v_store_product_count int;
    v_donation_recipient_count int;
    v_store_user_count int;
    v_user_role_count int;
    v_analytics_action_count int;
    v_batch_status_log_count int;
    v_business_impact text;
    v_email text;
    v_username text;
    v_full_name text;
BEGIN
    -- ===== AUTHORIZATION =====
    v_caller_id := auth.uid();

    IF p_deletion_type = 'automated' THEN
        IF p_performed_by_user_id IS NULL THEN
            v_is_authorized := true;
        END IF;
    ELSIF p_deletion_type = 'user_request' THEN
        IF v_caller_id IS NOT NULL AND v_caller_id = p_target_user_id THEN
            v_is_authorized := true;
        END IF;
    ELSIF p_deletion_type = 'admin_action' THEN
        IF v_caller_id IS NOT NULL AND p_performed_by_user_id = v_caller_id THEN
            SELECT EXISTS(
                SELECT 1 FROM business.store_users su1
                JOIN business.store_users su2 ON su1.store_id = su2.store_id
                WHERE su1.user_id = v_caller_id
                  AND su1.role_in_store IN ('owner', 'manager')
                  AND su1.is_active = true
                  AND su2.user_id = p_target_user_id
            ) INTO v_is_authorized;
        END IF;
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', format('Invalid deletion_type: %s', p_deletion_type)
        );
    END IF;

    IF NOT v_is_authorized THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unauthorized: insufficient permissions to delete this user'
        );
    END IF;

    -- ===== GET USER INFO =====
    SELECT email, username, full_name
    INTO v_email, v_username, v_full_name
    FROM user_mgmt.users
    WHERE user_id = p_target_user_id;

    IF v_email IS NULL AND v_username IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- ===== COUNT AFFECTED RECORDS =====
    SELECT COUNT(*) INTO v_batch_count FROM inventory.batches WHERE created_by = p_target_user_id;
    SELECT COUNT(*) INTO v_product_count FROM inventory.products WHERE created_by = p_target_user_id;
    SELECT COUNT(*) INTO v_batch_action_count FROM inventory.batch_actions WHERE performed_by = p_target_user_id OR verified_by = p_target_user_id;
    SELECT COUNT(*) INTO v_store_product_count FROM inventory.store_products WHERE added_by = p_target_user_id OR updated_by = p_target_user_id;
    SELECT COUNT(*) INTO v_donation_recipient_count FROM inventory.donation_recipients WHERE created_by = p_target_user_id;
    SELECT COUNT(*) INTO v_store_user_count FROM business.store_users WHERE user_id = p_target_user_id;
    SELECT COUNT(*) INTO v_user_role_count FROM user_mgmt.user_roles WHERE user_id = p_target_user_id;
    SELECT COUNT(*) INTO v_analytics_action_count FROM analytics.actions WHERE executed_by = p_target_user_id;
    SELECT COUNT(*) INTO v_batch_status_log_count FROM inventory.batch_status_logs WHERE created_by = p_target_user_id;

    v_business_impact := format(
        'Batches: %s, Products: %s, BatchActions: %s, StoreProducts: %s, DonationRecipients: %s, StoreUsers: %s, UserRoles: %s, AnalyticsActions: %s, BatchStatusLogs: %s',
        v_batch_count, v_product_count, v_batch_action_count, v_store_product_count,
        v_donation_recipient_count, v_store_user_count, v_user_role_count,
        v_analytics_action_count, v_batch_status_log_count
    );

    -- ===== LOG DELETION =====
    INSERT INTO user_mgmt.gdpr_deletion_log (
        user_id, deletion_type, performed_by,
        business_impact_notes, user_email, user_full_name
    ) VALUES (
        p_target_user_id, p_deletion_type, p_performed_by_user_id,
        v_business_impact, v_email, v_full_name
    );

    -- ===== NULLIFY USER REFERENCES (preserve business data) =====
    UPDATE inventory.batches SET created_by = NULL WHERE created_by = p_target_user_id;
    UPDATE inventory.products SET created_by = NULL WHERE created_by = p_target_user_id;
    UPDATE inventory.batch_actions SET performed_by = NULL WHERE performed_by = p_target_user_id;
    UPDATE inventory.batch_actions SET verified_by = NULL WHERE verified_by = p_target_user_id;
    UPDATE inventory.store_products SET added_by = NULL WHERE added_by = p_target_user_id;
    UPDATE inventory.store_products SET updated_by = NULL WHERE updated_by = p_target_user_id;
    UPDATE inventory.donation_recipients SET created_by = NULL WHERE created_by = p_target_user_id;
    UPDATE inventory.batch_status_logs SET created_by = NULL WHERE created_by = p_target_user_id;
    UPDATE analytics.actions SET executed_by = NULL WHERE executed_by = p_target_user_id;
    UPDATE business.stores SET owner_id = NULL WHERE owner_id = p_target_user_id;
    UPDATE business.store_users SET assigned_by = NULL WHERE assigned_by = p_target_user_id AND user_id != p_target_user_id;
    UPDATE user_mgmt.user_roles SET assigned_by = NULL WHERE assigned_by = p_target_user_id AND user_id != p_target_user_id;

    -- ===== DELETE RELATIONAL RECORDS =====
    DELETE FROM business.store_users WHERE user_id = p_target_user_id;
    DELETE FROM user_mgmt.user_roles WHERE user_id = p_target_user_id;
    DELETE FROM user_mgmt.user_preferences WHERE user_id = p_target_user_id;
    DELETE FROM user_mgmt.email_deliveries WHERE user_id = p_target_user_id;

    -- ===== ANONYMIZE USER RECORD =====
    UPDATE user_mgmt.users
    SET
        email = 'deleted_' || left(p_target_user_id::text, 8) || '@deleted.lifo.ai',
        username = 'deleted_' || left(p_target_user_id::text, 8),
        full_name = 'Deleted User',
        password_hash = NULL,
        is_active = false,
        deleted_at = NOW(),
        deletion_requested_at = NULL,
        updated_at = NOW()
    WHERE user_id = p_target_user_id;

    -- ===== HARD DELETE AUTH USER =====
    DELETE FROM auth.users WHERE id = p_target_user_id;

    -- ===== UPDATE LOG WITH COMPLETION =====
    UPDATE user_mgmt.gdpr_deletion_log
    SET deletion_completed_at = NOW()
    WHERE user_id = p_target_user_id
      AND deletion_completed_at IS NULL;

    RETURN json_build_object(
        'success', true,
        'message', 'User account deleted and anonymized successfully',
        'details', json_build_object(
            'user_id', p_target_user_id,
            'deletion_type', p_deletion_type,
            'records_affected', v_business_impact
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error during user deletion: ' || SQLERRM,
        'details', json_build_object(
            'sqlstate', SQLSTATE,
            'user_id', p_target_user_id
        )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION user_mgmt.gdpr_delete_user_and_stores(p_target_user_id uuid, p_delete_owned_stores boolean DEFAULT false, p_deletion_type text DEFAULT 'user_request'::text, p_performed_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    result json;
    v_user_exists boolean;
    owned_stores_count integer;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_mgmt.users 
        WHERE user_id = p_target_user_id AND deleted_at IS NULL
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        RETURN json_build_object('success', false, 'message', 'User not found or already deleted');
    END IF;

    SELECT COUNT(*) INTO owned_stores_count
    FROM business.stores WHERE owner_id = p_target_user_id;

    IF p_delete_owned_stores AND owned_stores_count > 0 THEN
        PERFORM business.delete_store_and_data(s.store_id, 'Owner account deletion', p_performed_by_user_id)
        FROM business.stores s WHERE s.owner_id = p_target_user_id;
    END IF;

    SELECT user_mgmt.gdpr_delete_user(p_target_user_id, p_deletion_type, p_performed_by_user_id) INTO result;
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION user_mgmt.get_deletion_status(target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_grace_days integer := 30;
    v_deletion_requested_at timestamp;
    v_scheduled_for timestamp;
    v_deleted_at timestamp;
BEGIN
    -- Only allow users to check their own deletion status
    IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unauthorized: You can only check your own deletion status'
        );
    END IF;

    -- Get deletion timestamps (correct column: user_id)
    SELECT deletion_requested_at, deleted_at
    INTO v_deletion_requested_at, v_deleted_at
    FROM user_mgmt.users
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    -- Calculate scheduled_for if deletion is pending
    IF v_deletion_requested_at IS NOT NULL THEN
        v_scheduled_for := v_deletion_requested_at + (v_grace_days || ' days')::interval;
    END IF;

    RETURN json_build_object(
        'success', true,
        'deletion_requested_at', v_deletion_requested_at,
        'scheduled_for', v_scheduled_for,
        'is_pending', (v_deletion_requested_at IS NOT NULL AND v_deleted_at IS NULL),
        'deleted_at', v_deleted_at,
        'grace_days', v_grace_days,
        'days_remaining', CASE
            WHEN v_deletion_requested_at IS NOT NULL AND v_deleted_at IS NULL
            THEN GREATEST(0, EXTRACT(DAY FROM (v_scheduled_for - NOW()))::integer)
            ELSE NULL
        END
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION user_mgmt.process_expired_deletions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user RECORD;
    v_result json;
    v_processed integer := 0;
    v_failed integer := 0;
    v_grace_days integer := 30;
BEGIN
    FOR v_user IN
        SELECT user_id, email
        FROM user_mgmt.users
        WHERE deletion_requested_at IS NOT NULL
          AND deleted_at IS NULL
          AND deletion_requested_at + (v_grace_days || ' days')::interval < NOW()
    LOOP
        SELECT user_mgmt.gdpr_delete_user(v_user.user_id, 'automated'::text, NULL::uuid) INTO v_result;
        IF (v_result->>'success')::boolean THEN
            v_processed := v_processed + 1;
        ELSE
            v_failed := v_failed + 1;
        END IF;
    END LOOP;

    RETURN json_build_object('success', true, 'processed', v_processed, 'failed', v_failed, 'run_at', NOW());
END;
$function$
;

CREATE OR REPLACE FUNCTION user_mgmt.request_account_deletion(target_user_id uuid, deletion_type text DEFAULT 'user_request'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user RECORD;
  v_deletion_date TIMESTAMP;
  v_grace_days INTEGER := 30;
BEGIN
  -- Only allow users to request deletion of their own account
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: You can only delete your own account');
  END IF;

  -- Check user exists and isn't already pending/deleted
  SELECT user_id, email, full_name, deletion_requested_at, deleted_at
  INTO v_user
  FROM user_mgmt.users
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF v_user.deleted_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Account already deleted');
  END IF;

  IF v_user.deletion_requested_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Deletion already requested',
      'deletion_scheduled_for', (v_user.deletion_requested_at + (v_grace_days || ' days')::interval)
    );
  END IF;

  v_deletion_date := NOW() + (v_grace_days || ' days')::interval;

  -- Mark as pending deletion (user stays active and can still log in)
  UPDATE user_mgmt.users
  SET deletion_requested_at = NOW(),
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Log the request (only insert if columns exist)
  INSERT INTO user_mgmt.gdpr_deletion_log (
    user_id,
    deletion_type,
    business_impact_notes,
    performed_by
  ) VALUES (
    target_user_id,
    deletion_type,
    format('Grace period started. Scheduled for permanent deletion on %s. Email: %s, Name: %s',
           v_deletion_date::date, v_user.email, v_user.full_name),
    target_user_id
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Account scheduled for deletion in %s days', v_grace_days),
    'deletion_scheduled_for', v_deletion_date,
    'grace_days', v_grace_days
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION business.refresh_user_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- user_store_permissions is a regular VIEW (not materialized).
  -- Regular views auto-update — no manual refresh needed.
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.check_batch_expiry_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Only check if this is an INSERT or if expiry_date was updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.expiry_date != NEW.expiry_date) THEN
        -- If the batch is already expired when created/updated, mark it as expired
        IF NEW.expiry_date < CURRENT_DATE THEN
            -- Update status if it's active
            IF NEW.status = 'active' THEN
                NEW.status = 'expired';
            END IF;
            -- Always update lifecycle_status to expired (this was missing!)
            NEW.lifecycle_status = 'expired';
            NEW.updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_counts_with_filters(p_store_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'inventory', 'scoring', 'business'
AS $function$
DECLARE
    v_urgency_levels TEXT[];
    v_action_types TEXT[];
    v_batch_statuses TEXT[];
    v_lifecycle_statuses TEXT[];  -- NEW
    v_product_name TEXT;
    v_days_to_expiry_min INT;
    v_days_to_expiry_max INT;
BEGIN
    -- Extract filter values from JSONB
    v_urgency_levels := ARRAY(SELECT jsonb_array_elements_text(p_filters->'urgency_level'));
    v_action_types := ARRAY(SELECT jsonb_array_elements_text(p_filters->'action_type'));
    v_batch_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'batch_status'));
    v_lifecycle_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'lifecycle_status'));  -- NEW
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::INT;
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::INT;

    -- Use a CTE to filter once and count multiple times for better performance
    RETURN (
        WITH filtered_todos AS (
            SELECT 
                completion_status,
                batch_status,
                lifecycle_status,  -- NEW: Include lifecycle_status
                days_to_expiry
            FROM inventory.batch_todo_states
            WHERE store_id = p_store_id
              -- Apply universal filters
              AND (COALESCE(array_length(v_urgency_levels, 1), 0) = 0 OR urgency_level = ANY(v_urgency_levels))
              AND (COALESCE(array_length(v_action_types, 1), 0) = 0 OR ai_recommendation::text = ANY(v_action_types))
              AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
              -- NEW: Apply lifecycle_status filter if provided
              AND (COALESCE(array_length(v_lifecycle_statuses, 1), 0) = 0 OR lifecycle_status = ANY(v_lifecycle_statuses))
        )
        SELECT jsonb_build_object(
            'pending', 
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'pending'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'in_progress',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'in_progress'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'completed',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'completed'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'expiring',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE lifecycle_status = 'active'  -- CHANGED: was batch_status = 'active'
               AND days_to_expiry >= COALESCE(v_days_to_expiry_min, 0)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'expired',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE lifecycle_status = 'expired'  -- CHANGED: was batch_status = 'expired'
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max))
        )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expired_batch_statuses()
 RETURNS TABLE(total_updated integer, sold_out_count integer, expired_count integer, details jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'inventory', 'scoring', 'analytics'
AS $function$
DECLARE
  sold_out_updated INTEGER := 0;
  expired_updated INTEGER := 0;
  lifecycle_updated INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  -- Update batches that have no remaining quantity to sold_out
  WITH sold_out_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'sold_out',
      updated_at = NOW()
    WHERE status = 'active' 
      AND current_quantity <= 0
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO sold_out_updated FROM sold_out_updates;
  
  -- Update batches that have expired but still have quantity to expired (status column)
  WITH expired_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'active' 
      AND expiry_date < CURRENT_DATE 
      AND current_quantity > 0
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO expired_updated FROM expired_updates;

  -- NEW: Update lifecycle_status for ALL batches that are past expiry date
  -- This updates lifecycle_status regardless of disposition status
  WITH lifecycle_updates AS (
    UPDATE inventory.batches 
    SET 
      lifecycle_status = 'expired',
      updated_at = NOW()
    WHERE lifecycle_status = 'active' 
      AND expiry_date < CURRENT_DATE
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO lifecycle_updated FROM lifecycle_updates;
  
  v_total_updated := sold_out_updated + expired_updated;
  
  -- Log the batch status update
  INSERT INTO inventory.batch_status_logs (
    action_type,
    affected_count,
    executed_at,
    notes
  ) VALUES (
    'automated_status_update',
    v_total_updated,
    NOW(),
    format('Automated daily update: %s sold_out, %s expired (status), %s expired (lifecycle)', 
           sold_out_updated, expired_updated, lifecycle_updated)
  );
  
  -- Return summary
  RETURN QUERY SELECT 
    v_total_updated,
    sold_out_updated,
    expired_updated,
    jsonb_build_object(
      'timestamp', NOW(),
      'sold_out_count', sold_out_updated,
      'expired_count', expired_updated,
      'lifecycle_expired_count', lifecycle_updated,
      'total_updated', v_total_updated
    );
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

grant delete on table "public"."sales_events" to "anon";

grant insert on table "public"."sales_events" to "anon";

grant references on table "public"."sales_events" to "anon";

grant select on table "public"."sales_events" to "anon";

grant trigger on table "public"."sales_events" to "anon";

grant truncate on table "public"."sales_events" to "anon";

grant update on table "public"."sales_events" to "anon";

grant delete on table "public"."sales_events" to "authenticated";

grant insert on table "public"."sales_events" to "authenticated";

grant references on table "public"."sales_events" to "authenticated";

grant select on table "public"."sales_events" to "authenticated";

grant trigger on table "public"."sales_events" to "authenticated";

grant truncate on table "public"."sales_events" to "authenticated";

grant update on table "public"."sales_events" to "authenticated";

grant delete on table "public"."sales_events" to "service_role";

grant insert on table "public"."sales_events" to "service_role";

grant references on table "public"."sales_events" to "service_role";

grant select on table "public"."sales_events" to "service_role";

grant trigger on table "public"."sales_events" to "service_role";

grant truncate on table "public"."sales_events" to "service_role";

grant update on table "public"."sales_events" to "service_role";

grant delete on table "public"."store_settings" to "anon";

grant insert on table "public"."store_settings" to "anon";

grant references on table "public"."store_settings" to "anon";

grant select on table "public"."store_settings" to "anon";

grant trigger on table "public"."store_settings" to "anon";

grant truncate on table "public"."store_settings" to "anon";

grant update on table "public"."store_settings" to "anon";

grant delete on table "public"."store_settings" to "authenticated";

grant insert on table "public"."store_settings" to "authenticated";

grant references on table "public"."store_settings" to "authenticated";

grant select on table "public"."store_settings" to "authenticated";

grant trigger on table "public"."store_settings" to "authenticated";

grant truncate on table "public"."store_settings" to "authenticated";

grant update on table "public"."store_settings" to "authenticated";

grant delete on table "public"."store_settings" to "service_role";

grant insert on table "public"."store_settings" to "service_role";

grant references on table "public"."store_settings" to "service_role";

grant select on table "public"."store_settings" to "service_role";

grant trigger on table "public"."store_settings" to "service_role";

grant truncate on table "public"."store_settings" to "service_role";

grant update on table "public"."store_settings" to "service_role";

grant delete on table "public"."store_users" to "anon";

grant insert on table "public"."store_users" to "anon";

grant references on table "public"."store_users" to "anon";

grant select on table "public"."store_users" to "anon";

grant trigger on table "public"."store_users" to "anon";

grant truncate on table "public"."store_users" to "anon";

grant update on table "public"."store_users" to "anon";

grant delete on table "public"."store_users" to "authenticated";

grant insert on table "public"."store_users" to "authenticated";

grant references on table "public"."store_users" to "authenticated";

grant select on table "public"."store_users" to "authenticated";

grant trigger on table "public"."store_users" to "authenticated";

grant truncate on table "public"."store_users" to "authenticated";

grant update on table "public"."store_users" to "authenticated";

grant delete on table "public"."store_users" to "service_role";

grant insert on table "public"."store_users" to "service_role";

grant references on table "public"."store_users" to "service_role";

grant select on table "public"."store_users" to "service_role";

grant trigger on table "public"."store_users" to "service_role";

grant truncate on table "public"."store_users" to "service_role";

grant update on table "public"."store_users" to "service_role";


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



  create policy "sales_events_store_access"
  on "public"."sales_events"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



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


CREATE TRIGGER "store-scoring-setup" AFTER INSERT ON business.stores FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://lifo-ai-api-staging-i2o78.ondigitalocean.app/api/v1/webhooks/supabase/store-created', 'POST', '{"Content-type":"application/json","apikey":"sb_secret_YTaH6ijzniGW8dVpqT8_mw_YaxVKbLP"}', '{}', '5000');

CREATE TRIGGER "store-welcome-email" AFTER INSERT ON business.stores FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://lifo-app.com/api/webhooks/store-created-welcome', 'POST', '{"Content-type":"application/json","Authorization:":"Bearer 26d2329529014a05f2d626cf7ecd262c0b356a83656bdd6197583937a3c5a237"}', '{}', '5000');


  create policy "Service role can manage refresh tokens"
  on "auth"."refresh_tokens"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can view own refresh tokens"
  on "auth"."refresh_tokens"
  as permissive
  for select
  to public
using (((user_id)::text = (auth.uid())::text));



  create policy "Service role can manage sessions"
  on "auth"."sessions"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can view own sessions"
  on "auth"."sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Service role can manage all users"
  on "auth"."users"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can update own profile"
  on "auth"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "auth"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER ensure_user_preferences_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION user_mgmt.ensure_user_preferences();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_create_preferences AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences_on_signup();

CREATE TRIGGER set_french_default_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.set_default_french_language();


