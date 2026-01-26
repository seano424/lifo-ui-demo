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

drop function if exists "public"."get_todos_with_filters"(p_store_id uuid, p_todo_states text[], p_completion_statuses text[], p_limit integer, p_offset integer);

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

CREATE INDEX idx_batches_expiry_lookup ON inventory.batches USING btree (store_id, expiry_date, status, current_quantity) WHERE (((status)::text = 'active'::text) AND (current_quantity > (0)::numeric));

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

alter table "inventory"."batch_actions" add constraint "valid_action_specific_fields" CHECK ((((action_type = 'discount'::public.action_type) AND (discount_percentage IS NOT NULL)) OR (action_type = 'donate'::public.action_type) OR ((action_type = 'dispose'::public.action_type) AND (disposal_reason IS NOT NULL)) OR ((action_type = 'ignored'::public.action_type) AND (dismissal_reason IS NOT NULL)) OR ((action_type = 'sold'::public.action_type) AND (sale_timing IS NOT NULL)) OR (action_type = ANY (ARRAY['maintain'::public.action_type, 'donate_prepared'::public.action_type])))) not valid;

alter table "inventory"."batch_actions" validate constraint "valid_action_specific_fields";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

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
      'message', 'Batch is not a draft'
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
      'message', 'Requested quantity exceeds available draft quantity'
    );
  END IF;

  -- Calculate remaining quantity
  v_remaining_quantity := v_batch.current_quantity - v_activate_quantity;

  -- If partial activation, create a new draft batch for remaining quantity
  IF v_remaining_quantity > 0 THEN
    v_new_batch_id := uuid_generate_v4();
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
    batch_number = REPLACE(batch_number, '-DRAFT', '') || '-' || TO_CHAR(p_expiry_date, 'YYYYMMDD')
  WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'activated_batch_id', p_batch_id,
    'activated_quantity', v_activate_quantity,
    'expiry_date', p_expiry_date,
    'was_split', v_remaining_quantity > 0,
    'remaining_draft_batch_id', CASE WHEN v_remaining_quantity > 0 THEN v_new_batch_id ELSE NULL END,
    'remaining_draft_quantity', CASE WHEN v_remaining_quantity > 0 THEN v_remaining_quantity ELSE NULL END,
    'message', CASE 
      WHEN v_remaining_quantity > 0 THEN 
        'Activated ' || v_activate_quantity || ' units. ' || v_remaining_quantity || ' units remain in draft.'
      ELSE 
        'Successfully activated batch with ' || v_activate_quantity || ' units.'
    END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_draft_batches_by_product(p_store_id uuid, p_category_codes text[] DEFAULT NULL::text[], p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT NULL::integer)
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

  -- Get total count first
  SELECT COUNT(DISTINCT p.product_id)
  INTO v_total_count
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE b.store_id = p_store_id 
    AND b.status = 'draft'
    AND (p_category_codes IS NULL OR c.category_code = ANY(p_category_codes));

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

    -- Generate batch number
    v_batch_id := uuid_generate_v4();
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
            batch_actions.discount_percentage AS action_discount_percent,
            batch_actions.disposal_reason,
            batch_actions.dismissal_reason,
            batch_actions.sale_timing,
            batch_actions.sale_occurred_at,
            batch_actions.donation_recipient_id,
            batch_actions.notes AS last_action_notes
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
    aa.disposal_reason AS last_action_disposal_reason,
    aa.dismissal_reason AS last_action_dismissal_reason,
    aa.sale_timing AS last_action_sale_timing,
    aa.sale_occurred_at AS last_action_sale_occurred_at,
    aa.donation_recipient_id AS last_action_recipient_id,
    dr.name AS last_action_recipient_name,
    aa.last_action_notes,
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
            WHEN (((ps.recommendation)::text = ANY (ARRAY['discount_moderate'::text, 'discount_aggressive'::text, 'dispose'::text, 'alert'::text])) AND ((aa.last_action_time IS NULL) OR (aa.last_action_time < ps.calculated_at)) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type)) AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text]))) THEN 'pending_action'::text
            WHEN (((ps.recommendation)::text = ANY (ARRAY['maintain'::text, 'monitor'::text, 'normal'::text])) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type))) THEN 'monitor_only'::text
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
   FROM ((((((inventory.batches b
     LEFT JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN scoring.product_scores ps ON ((b.batch_id = ps.batch_id)))
     LEFT JOIN all_actions aa ON ((b.batch_id = aa.batch_id)))
     LEFT JOIN last_discount ld ON ((b.batch_id = ld.batch_id)))
     LEFT JOIN action_summary acs ON ((b.batch_id = acs.batch_id)))
     LEFT JOIN inventory.donation_recipients dr ON ((aa.donation_recipient_id = dr.recipient_id)));


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

CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_count(p_store_id uuid, p_expiry_days integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_expiry_days INTEGER;
  v_count INTEGER;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    RETURN 0;  -- Return 0 for unauthorized access (don't leak existence)
  END IF;

  -- Determine expiry threshold:
  -- 1. Use provided parameter if given
  -- 2. Otherwise, use store's configured setting
  -- 3. Fall back to default of 3 if neither exists
  IF p_expiry_days IS NOT NULL THEN
    v_expiry_days := p_expiry_days;
  ELSE
    SELECT COALESCE(ss.expiry_alert_days, 3)
    INTO v_expiry_days
    FROM business.store_settings ss
    WHERE ss.store_id = p_store_id;
    
    -- If store has no settings record, use default
    IF v_expiry_days IS NULL THEN
      v_expiry_days := 3;
    END IF;
  END IF;

  -- Count batches expiring within the threshold
  SELECT COUNT(*)::INT
  INTO v_count
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND bts.days_to_expiry >= 0
    AND bts.days_to_expiry <= v_expiry_days
    AND bts.completion_status != 'completed'
    AND bts.current_quantity > 0;

  RETURN COALESCE(v_count, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_expiry_todos_counts_summary(p_store_id uuid)
 RETURNS inventory.expiry_todos_summary
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result inventory.expiry_todos_summary;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    -- Return zeros for unauthorized access (don't leak existence)
    v_result.expiring_today := 0;
    v_result.expiring_soon := 0;
    v_result.expiring_week := 0;
    v_result.expired := 0;
    v_result.total := 0;
    RETURN v_result;
  END IF;

  SELECT 
    -- Expiring Today: 0-1 days (today and tomorrow)
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 0 AND days_to_expiry <= 1
    )::INTEGER,
    
    -- Expiring Soon: 2-3 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 2 AND days_to_expiry <= 3
    )::INTEGER,
    
    -- Expiring This Week: 4-7 days
    COUNT(*) FILTER (
      WHERE days_to_expiry >= 4 AND days_to_expiry <= 7
    )::INTEGER,
    
    -- Expired: negative days (already past expiry)
    COUNT(*) FILTER (
      WHERE days_to_expiry < 0
    )::INTEGER,
    
    -- Total: all items that need attention (expired + expiring within 7 days)
    COUNT(*) FILTER (
      WHERE days_to_expiry <= 7
    )::INTEGER
    
  INTO 
    v_result.expiring_today,
    v_result.expiring_soon,
    v_result.expiring_week,
    v_result.expired,
    v_result.total
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id
    AND completion_status != 'completed'
    AND current_quantity > 0;

  -- Ensure no NULLs
  v_result.expiring_today := COALESCE(v_result.expiring_today, 0);
  v_result.expiring_soon := COALESCE(v_result.expiring_soon, 0);
  v_result.expiring_week := COALESCE(v_result.expiring_week, 0);
  v_result.expired := COALESCE(v_result.expired, 0);
  v_result.total := COALESCE(v_result.total, 0);

  RETURN v_result;
END;
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

CREATE OR REPLACE FUNCTION inventory.get_urgent_todos_count(p_store_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = auth.uid()
  ) THEN
    RETURN 0;  -- Return 0 for unauthorized access (don't leak existence)
  END IF;

  SELECT COUNT(*)::INT
  INTO v_count
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id
    AND urgency_level IN ('critical', 'high')
    AND completion_status != 'completed';

  RETURN COALESCE(v_count, 0);
END;
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


CREATE OR REPLACE FUNCTION public.get_expiry_dashboard_summary(p_store_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id
      AND su.user_id = auth.uid()
      AND su.is_active = true
  ) THEN
    -- Return zeros for unauthorized access (don't leak existence)
    RETURN json_build_object(
      'expiring_today', 0,
      'expiring_tomorrow', 0,
      'expiring_this_week', 0,
      'total_active_batches', 0,
      'total_products', 0
    );
  END IF;

  SELECT json_build_object(
    'expiring_today', COALESCE(counts.today_count, 0)::INTEGER,
    'expiring_tomorrow', COALESCE(counts.tomorrow_count, 0)::INTEGER,
    'expiring_this_week', COALESCE(counts.week_count, 0)::INTEGER,
    'total_active_batches', COALESCE(counts.total_batches, 0)::INTEGER,
    'total_products', COALESCE(counts.product_count, 0)::INTEGER
  )
  INTO v_result
  FROM (
    SELECT 
      -- Expiring Today (day 0)
      COUNT(*) FILTER (
        WHERE expiry_date = CURRENT_DATE
          AND current_quantity > 0
          AND status = 'active'
      ) as today_count,
      
      -- Expiring Tomorrow (day 1)
      COUNT(*) FILTER (
        WHERE expiry_date = CURRENT_DATE + 1
          AND current_quantity > 0
          AND status = 'active'
      ) as tomorrow_count,
      
      -- Expiring This Week (days 2-7)
      COUNT(*) FILTER (
        WHERE expiry_date > CURRENT_DATE + 1
          AND expiry_date <= CURRENT_DATE + 7
          AND current_quantity > 0
          AND status = 'active'
      ) as week_count,
      
      -- Total Active Batches
      COUNT(*) FILTER (
        WHERE current_quantity > 0
          AND status = 'active'
      ) as total_batches,
      
      -- Total Products Tracked
      COUNT(DISTINCT product_id) FILTER (
        WHERE current_quantity > 0
          AND status = 'active'
      ) as product_count
      
    FROM inventory.batches
    WHERE store_id = p_store_id
  ) counts;

  RETURN v_result;
END;
$function$
;

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
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, last_action_disposal_reason text, last_action_dismissal_reason text, last_action_sale_timing text, last_action_sale_occurred_at timestamp with time zone, last_action_recipient_id uuid, last_action_recipient_name character varying, last_action_notes text, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone, total_count bigint, pending_count bigint, in_progress_count bigint, completed_count bigint, expiring_count bigint, expired_count bigint)
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
            -- NEW: Include reason tracking columns
            bts.last_action_disposal_reason,
            bts.last_action_dismissal_reason,
            bts.last_action_sale_timing,
            bts.last_action_sale_occurred_at,
            bts.last_action_recipient_id,
            bts.last_action_recipient_name,
            bts.last_action_notes,
            -- Continue with existing columns
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
        -- NEW: Include reason tracking columns
        wc.last_action_disposal_reason,
        wc.last_action_dismissal_reason,
        wc.last_action_sale_timing,
        wc.last_action_sale_occurred_at,
        wc.last_action_recipient_id,
        wc.last_action_recipient_name,
        wc.last_action_notes,
        -- Continue with existing columns
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

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(p_store_id uuid, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, last_action_disposal_reason text, last_action_dismissal_reason text, last_action_sale_timing text, last_action_sale_occurred_at timestamp with time zone, last_action_recipient_id uuid, last_action_recipient_name character varying, last_action_notes text, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'inventory', 'scoring', 'business'
AS $function$
DECLARE
  v_completion_status text;
  v_urgency_levels text[];
  v_action_types text[];
  v_batch_statuses text[];
  v_product_name text;
  v_days_to_expiry_max integer;
  v_days_to_expiry_min integer;
BEGIN
  -- Extract filter parameters from JSONB
  v_completion_status := p_filters->>'completion_status';
  v_product_name := p_filters->>'product_name';
  v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
  v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;

  -- Extract arrays from JSONB
  IF p_filters ? 'urgency_level' THEN
    SELECT array_agg(value::text)
    INTO v_urgency_levels
    FROM jsonb_array_elements_text(p_filters->'urgency_level');
  END IF;

  IF p_filters ? 'action_type' THEN
    SELECT array_agg(value::text)
    INTO v_action_types
    FROM jsonb_array_elements_text(p_filters->'action_type');
  END IF;

  IF p_filters ? 'batch_status' THEN
    SELECT array_agg(value::text)
    INTO v_batch_statuses
    FROM jsonb_array_elements_text(p_filters->'batch_status');
  END IF;

  -- Query the view with filters, now including new columns
  RETURN QUERY
  SELECT
    bts.batch_id,
    bts.store_id,
    bts.batch_number,
    bts.expiry_date,
    bts.current_quantity,
    bts.available_quantity,
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
    -- NEW: Include reason tracking columns
    bts.last_action_disposal_reason,
    bts.last_action_dismissal_reason,
    bts.last_action_sale_timing,
    bts.last_action_sale_occurred_at,
    bts.last_action_recipient_id,
    bts.last_action_recipient_name,
    bts.last_action_notes,
    -- Continue with existing columns
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

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(p_store_id uuid, p_todo_states text[] DEFAULT NULL::text[], p_completion_statuses text[] DEFAULT NULL::text[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, last_action_disposal_reason text, last_action_dismissal_reason text, last_action_sale_timing text, last_action_sale_occurred_at timestamp with time zone, last_action_recipient_id uuid, last_action_recipient_name character varying, last_action_notes text, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = p_store_id 
    AND su.user_id = v_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
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
    -- NEW: Include reason fields
    bts.last_action_disposal_reason,
    bts.last_action_dismissal_reason,
    bts.last_action_sale_timing,
    bts.last_action_sale_occurred_at,
    bts.last_action_recipient_id,
    bts.last_action_recipient_name,
    bts.last_action_notes,
    -- Continue with existing fields
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
    bts.view_refreshed_at,
    COUNT(*) OVER()::BIGINT as total_count
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND (p_todo_states IS NULL OR bts.todo_state = ANY(p_todo_states))
    AND (p_completion_statuses IS NULL OR bts.completion_status = ANY(p_completion_statuses))
  ORDER BY bts.priority_order ASC, bts.days_to_expiry ASC
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


