drop trigger if exists "trigger_refresh_user_permissions_on_stores" on "business"."stores";

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

drop function if exists "user_mgmt"."gdpr_delete_user"(target_user_id uuid, deletion_type text, performed_by_user_id uuid);

drop function if exists "user_mgmt"."gdpr_delete_user_and_stores"(target_user_id uuid, delete_owned_stores boolean, deletion_type text, performed_by_user_id uuid);

drop function if exists "user_mgmt"."request_account_deletion"(deletion_reason text);

drop index if exists "scoring"."idx_product_scores_recommendations";

alter table "user_mgmt"."users" add column "deleted_at" timestamp without time zone;

alter table "user_mgmt"."users" add column "deletion_requested_at" timestamp without time zone;

CREATE INDEX idx_gdpr_deletion_log_deletion_completed_at ON user_mgmt.gdpr_deletion_log USING btree (deletion_completed_at);

CREATE INDEX idx_gdpr_deletion_log_user_id ON user_mgmt.gdpr_deletion_log USING btree (user_id);

CREATE INDEX idx_users_active_deleted ON user_mgmt.users USING btree (is_active, deleted_at) WHERE (is_active = true);

CREATE INDEX idx_users_pending_deletion ON user_mgmt.users USING btree (deletion_requested_at) WHERE ((deletion_requested_at IS NOT NULL) AND (deleted_at IS NULL));

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


-- Storage triggers commented out for local development (functions may not exist)
-- CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();
-- CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();
-- CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();
-- CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();
-- CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


