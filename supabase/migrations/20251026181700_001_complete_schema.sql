

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin";


ALTER SCHEMA "admin" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "business";


ALTER SCHEMA "business" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "inventory";


ALTER SCHEMA "inventory" OWNER TO "postgres";


COMMENT ON SCHEMA "inventory" IS 'Inventory schema - migration tracking cleaned up 2025-01-15';



COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "sales";


ALTER SCHEMA "sales" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "scoring";


ALTER SCHEMA "scoring" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "timeseries";


ALTER SCHEMA "timeseries" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "user_mgmt";


ALTER SCHEMA "user_mgmt" OWNER TO "postgres";


COMMENT ON SCHEMA "user_mgmt" IS 'User management schema - backup tables cleaned up 2025-01-15';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "business"."store_type_enum" AS ENUM (
    'supermarket',
    'convenience',
    'restaurant',
    'bakery',
    'butcher',
    'organic'
);


ALTER TYPE "business"."store_type_enum" OWNER TO "postgres";


COMMENT ON TYPE "business"."store_type_enum" IS 'Store types for LIFO retail management system';



CREATE TYPE "public"."action_type" AS ENUM (
    'discount',
    'donate',
    'dispose',
    'maintain',
    'ignored',
    'donate_prepared',
    'sold'
);


ALTER TYPE "public"."action_type" OWNER TO "postgres";


CREATE TYPE "public"."actiontype" AS ENUM (
    'DISCOUNT',
    'DONATE',
    'DISPOSE',
    'MAINTAIN',
    'IGNORED'
);


ALTER TYPE "public"."actiontype" OWNER TO "postgres";


CREATE TYPE "public"."donation_recipient_type" AS ENUM (
    'food_bank',
    'soup_kitchen',
    'charity',
    'religious_org',
    'community_group',
    'animal_shelter',
    'school',
    'elderly_care',
    'homeless_shelter',
    'other'
);


ALTER TYPE "public"."donation_recipient_type" OWNER TO "postgres";


CREATE TYPE "public"."donationrecipienttype" AS ENUM (
    'FOOD_BANK',
    'SOUP_KITCHEN',
    'CHARITY',
    'RELIGIOUS_ORG',
    'COMMUNITY_GROUP',
    'ANIMAL_SHELTER',
    'SCHOOL',
    'ELDERLY_CARE',
    'HOMELESS_SHELTER',
    'OTHER'
);


ALTER TYPE "public"."donationrecipienttype" OWNER TO "postgres";


CREATE TYPE "sales"."transaction_type" AS ENUM (
    'sold_full_price',
    'sold_discounted',
    'donated',
    'disposed',
    'shrinkage'
);


ALTER TYPE "sales"."transaction_type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "business"."stores" (
    "store_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "store_name" character varying(255) NOT NULL,
    "store_code" character varying(50) NOT NULL,
    "business_name" character varying(255),
    "address" "text",
    "city" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100) DEFAULT 'France'::character varying,
    "timezone" character varying(50) DEFAULT 'Europe/Paris'::character varying,
    "store_type" "business"."store_type_enum",
    "size_category" character varying(20),
    "default_markup_percent" numeric(5,2) DEFAULT 30.00,
    "waste_reduction_target_percent" numeric(5,2) DEFAULT 25.00,
    "owner_id" "uuid",
    "is_active" boolean DEFAULT true,
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "phone" character varying(20),
    "email" character varying(255),
    "website_url" character varying(500),
    "description" "text",
    "logo_url" character varying(500),
    "cover_image_url" character varying(500),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    CONSTRAINT "stores_email_format_check" CHECK (((("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text") OR ("email" IS NULL))),
    CONSTRAINT "stores_size_category_check" CHECK ((("size_category")::"text" = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::"text"[]))),
    CONSTRAINT "stores_website_url_format_check" CHECK (((("website_url")::"text" ~* '^https?://[^\s]+$'::"text") OR ("website_url" IS NULL)))
);


ALTER TABLE "business"."stores" OWNER TO "postgres";


COMMENT ON COLUMN "business"."stores"."store_type" IS 'Type of retail store (enum: business.store_type_enum)';



CREATE OR REPLACE FUNCTION "business"."create_store_for_user"("p_store_name" "text", "p_store_code" "text", "p_store_type" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_postal_code" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT 'France'::"text", "p_business_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_size_category" "text" DEFAULT NULL::"text", "p_timezone" "text" DEFAULT 'Europe/Paris'::"text") RETURNS "business"."stores"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_new_store business.stores;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a store';
    END IF;
    
    -- Insert the new store with proper casting for enum types
    INSERT INTO business.stores (
        store_name,
        store_code,
        store_type,
        address,
        city,
        postal_code,
        country,
        business_name,
        phone,
        size_category,
        timezone,
        owner_id,
        is_active,
        onboarding_completed
    ) VALUES (
        p_store_name,
        UPPER(p_store_code),
        CASE 
            WHEN p_store_type IS NOT NULL THEN p_store_type::business.store_type_enum
            ELSE NULL
        END,
        p_address,
        p_city,
        p_postal_code,
        p_country,
        COALESCE(p_business_name, p_store_name),
        p_phone,
        p_size_category, -- This is VARCHAR with CHECK constraint, not enum
        p_timezone,
        v_user_id,
        true,
        false
    )
    RETURNING * INTO v_new_store;
    
    -- Add the owner to store_users
    INSERT INTO business.store_users (
        store_id,
        user_id,
        role_in_store,
        permissions,
        assigned_by
    ) VALUES (
        v_new_store.store_id,
        v_user_id,
        'owner',
        jsonb_build_object(
            'can_upload_inventory', true,
            'can_apply_discounts', true,
            'can_view_analytics', true
        ),
        v_user_id
    );
    
    RETURN v_new_store;
END;
$$;


ALTER FUNCTION "business"."create_store_for_user"("p_store_name" "text", "p_store_code" "text", "p_store_type" "text", "p_address" "text", "p_city" "text", "p_postal_code" "text", "p_country" "text", "p_business_name" "text", "p_phone" "text", "p_size_category" "text", "p_timezone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "business"."create_store_for_user"("p_store_name" "text", "p_store_code" "text", "p_store_type" "text", "p_address" "text", "p_city" "text", "p_postal_code" "text", "p_country" "text", "p_business_name" "text", "p_phone" "text", "p_size_category" "text", "p_timezone" "text") IS 'Creates a new store for the authenticated user and sets them as the owner with proper enum casting';



CREATE OR REPLACE FUNCTION "business"."deactivate_store_safe"("p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_store_name TEXT;
  v_employee_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if user is store owner
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND role_in_store = 'owner'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only store owners can deactivate stores';
  END IF;
  
  -- Get store name for logging
  SELECT store_name INTO v_store_name
  FROM business.stores
  WHERE store_id = p_store_id;
  
  IF v_store_name IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;
  
  -- Soft delete the store
  UPDATE business.stores
  SET is_active = false,
      updated_at = NOW()
  WHERE store_id = p_store_id;
  
  -- GDPR Compliance: Anonymize employee personal data
  -- Only update columns that exist in your current schema
  WITH employees_to_anonymize AS (
    SELECT user_id 
    FROM business.store_users
    WHERE store_id = p_store_id
    AND role_in_store = 'staff'
    AND is_active = true
  )
  UPDATE user_mgmt.users
  SET 
    email = 'deleted_' || user_id || '@anonymized.lifo.local',
    full_name = 'Deleted User',
    password_hash = NULL,  -- Clear password hash
    is_active = false,     -- Deactivate the user account
    updated_at = NOW()
  WHERE user_id IN (SELECT user_id FROM employees_to_anonymize);
  
  -- Get count of anonymized employees
  GET DIAGNOSTICS v_employee_count = ROW_COUNT;
  
  -- Deactivate all store_users relationships for this store
  UPDATE business.store_users
  SET is_active = false,
      updated_at = NOW()
  WHERE store_id = p_store_id;
  
  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'store_id', p_store_id,
    'store_name', v_store_name,
    'deactivated_at', NOW(),
    'employees_anonymized', v_employee_count,
    'message', 'Store deactivated successfully. Employee data has been anonymized in compliance with GDPR.'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to deactivate store: %', SQLERRM;
END;
$$;


ALTER FUNCTION "business"."deactivate_store_safe"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "business"."deactivate_store_safe"("p_store_id" "uuid") IS 'Safely deactivates a store and anonymizes employee personal data for GDPR compliance. Only store owners can execute this function.';



CREATE OR REPLACE FUNCTION "business"."delete_store_and_data"("target_store_id" "uuid", "deletion_reason" "text" DEFAULT 'Store closure'::"text", "performed_by_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result JSON;
    store_record RECORD;
    inventory_count INTEGER;
    users_count INTEGER;
BEGIN
    -- Get store details before deletion
    SELECT 
        store_id, 
        store_name, 
        store_code, 
        owner_id,
        is_active
    INTO store_record
    FROM business.stores 
    WHERE store_id = target_store_id;
    
    -- Check if store exists
    IF store_record.store_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Store not found'
        );
    END IF;
    
    -- Count what will be deleted
    SELECT COUNT(*) INTO inventory_count FROM inventory.batches WHERE store_id = target_store_id;
    SELECT COUNT(*) INTO users_count FROM business.store_users WHERE store_id = target_store_id;
    
    BEGIN
        -- Delete all store-related data (cascade will handle most of this)
        
        -- 1. Delete inventory data
        DELETE FROM inventory.batches WHERE store_id = target_store_id;
        DELETE FROM inventory.store_products WHERE store_id = target_store_id;
        DELETE FROM inventory.donation_recipients WHERE store_id = target_store_id;
        
        -- 2. Delete analytics data  
        DELETE FROM analytics.actions WHERE store_id = target_store_id;
        
        -- 3. Delete scoring data
        DELETE FROM scoring.product_scores WHERE store_id = target_store_id;
        
        -- 4. Delete timeseries data
        DELETE FROM timeseries.inventory_snapshots WHERE store_id = target_store_id;
        DELETE FROM timeseries.sales_events WHERE store_id = target_store_id;
        DELETE FROM timeseries.external_factors WHERE store_id = target_store_id;
        
        -- 5. Delete store settings
        DELETE FROM business.store_settings WHERE store_id = target_store_id;
        
        -- 6. Delete store user relationships (will CASCADE to remove user access)
        DELETE FROM business.store_users WHERE store_id = target_store_id;
        
        -- 7. Finally delete the store itself
        DELETE FROM business.stores WHERE store_id = target_store_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Store deleted successfully',
            'details', json_build_object(
                'store_name', store_record.store_name,
                'store_code', store_record.store_code,
                'inventory_items_deleted', inventory_count,
                'user_relationships_removed', users_count,
                'reason', deletion_reason
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Store deletion failed: ' || SQLERRM,
            'store_name', store_record.store_name
        );
    END;
END;
$$;


ALTER FUNCTION "business"."delete_store_and_data"("target_store_id" "uuid", "deletion_reason" "text", "performed_by_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "business"."delete_store_and_data"("target_store_id" "uuid", "deletion_reason" "text", "performed_by_user_id" "uuid") IS 'Deletes a store and all associated data. Use for business closure or GDPR compliance when store owner requests deletion.';



CREATE OR REPLACE FUNCTION "business"."get_store_types"() RETURNS "business"."store_type_enum"[]
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  -- Note: Need to fully qualify the enum type reference
  SELECT ARRAY['supermarket', 'convenience', 'restaurant', 'bakery', 'butcher', 'organic']::business.store_type_enum[];
$$;


ALTER FUNCTION "business"."get_store_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "business"."get_user_accessible_store_ids"("check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("store_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.store_id
  FROM business.stores s
  LEFT JOIN business.store_users su ON s.store_id = su.store_id
  WHERE (s.owner_id = check_user_id)
     OR (su.user_id = check_user_id AND su.is_active = true);
END;
$$;


ALTER FUNCTION "business"."get_user_accessible_store_ids"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "business"."get_user_stores_fast"("check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
  -- Owner stores (fastest, uses idx_stores_owner_active)
  SELECT store_id
  FROM business.stores
  WHERE owner_id = check_user_id
    AND is_active = true
  
  UNION
  
  -- Assigned stores (uses idx_store_users_user_active)
  SELECT store_id
  FROM business.store_users
  WHERE user_id = check_user_id
    AND is_active = true
$$;


ALTER FUNCTION "business"."get_user_stores_fast"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "business"."get_user_stores_fast"("check_user_id" "uuid") IS 'Optimized version using SETOF and STABLE for better query planning and inlining';



CREATE OR REPLACE FUNCTION "business"."refresh_user_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the UNIQUE index we created in the previous migration
  REFRESH MATERIALIZED VIEW CONCURRENTLY business.user_store_permissions;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "business"."refresh_user_permissions"() OWNER TO "postgres";


COMMENT ON FUNCTION "business"."refresh_user_permissions"() IS 'Automatically refreshes the user_store_permissions materialized view when store_users or stores change';



CREATE OR REPLACE FUNCTION "business"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" "text" DEFAULT NULL::"text", "input_permissions" "jsonb" DEFAULT NULL::"jsonb", "input_is_active" boolean DEFAULT NULL::boolean, "input_can_use_pin_auth" boolean DEFAULT NULL::boolean, "input_pin_access_level" "text" DEFAULT NULL::"text", "input_pin_permissions" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("store_id" "uuid", "user_id" "uuid", "role_in_store" "text", "permissions" "jsonb", "assigned_at" timestamp without time zone, "assigned_by" "uuid", "is_active" boolean, "can_use_pin_auth" boolean, "pin_access_level" "text", "pin_permissions" "jsonb", "email" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "raw_user_meta_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
BEGIN
  -- Update the store_users record
  UPDATE business.store_users su
  SET 
    role_in_store = COALESCE(input_role_in_store::VARCHAR, su.role_in_store),
    permissions = COALESCE(input_permissions, su.permissions),
    is_active = COALESCE(input_is_active, su.is_active),
    can_use_pin_auth = COALESCE(input_can_use_pin_auth, su.can_use_pin_auth),
    pin_access_level = COALESCE(input_pin_access_level::VARCHAR, su.pin_access_level),
    pin_permissions = COALESCE(input_pin_permissions, su.pin_permissions)
  WHERE su.store_id = input_store_id
    AND su.user_id = input_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in store or no permission to update';
  END IF;

  -- Return the complete updated user data with auth info
  RETURN QUERY
  SELECT 
    su.store_id,
    su.user_id,
    su.role_in_store::TEXT,
    su.permissions,
    su.assigned_at::TIMESTAMP,
    su.assigned_by,
    su.is_active,
    su.can_use_pin_auth,
    su.pin_access_level::TEXT,
    su.pin_permissions,
    u.email::TEXT,
    u.created_at,
    u.updated_at,
    u.raw_user_meta_data
  FROM business.store_users su
  JOIN auth.users u ON su.user_id = u.id
  WHERE su.store_id = input_store_id
    AND su.user_id = input_user_id;
END;
$$;


ALTER FUNCTION "business"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" "text", "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" "text", "input_pin_permissions" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "business"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "business"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "business"."user_can_manage_store_users"("target_store_id" "uuid", "target_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_effective_role TEXT;
  target_effective_role TEXT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- ✨ OPTIMIZATION: Single query to materialized view
  -- FIX: Fully qualify columns to avoid ambiguity
  SELECT usp.effective_role INTO current_effective_role
  FROM business.user_store_permissions usp
  WHERE usp.store_id = target_store_id
    AND usp.user_id = current_user_id
    AND usp.is_active = TRUE;
  
  -- If user has no role in the store, they can't manage anyone
  IF current_effective_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If no specific target user, check general management permissions
  IF target_user_id IS NULL THEN
    RETURN current_effective_role IN ('owner', 'manager');
  END IF;
  
  -- If trying to manage themselves, allow it
  IF target_user_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- ✨ OPTIMIZATION: Single query for target user's role
  -- FIX: Fully qualify columns to avoid ambiguity
  SELECT usp.effective_role INTO target_effective_role
  FROM business.user_store_permissions usp
  WHERE usp.store_id = target_store_id
    AND usp.user_id = target_user_id;
  
  -- Role hierarchy enforcement
  CASE current_effective_role
    WHEN 'owner' THEN
      RETURN TRUE;
    WHEN 'manager' THEN
      RETURN target_effective_role = 'employee';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;


ALTER FUNCTION "business"."user_can_manage_store_users"("target_store_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "business"."user_can_manage_store_users"("target_store_id" "uuid", "target_user_id" "uuid") IS 'Optimized permission check using materialized view. Fixed ambiguous column references. ~97.5% faster than previous version.';



CREATE OR REPLACE FUNCTION "business"."user_can_manage_store_users_v2"("target_store_id" "uuid", "target_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  current_user_active BOOLEAN;
BEGIN
  -- Get current user's role and active status
  SELECT 
    usp.effective_role,
    usp.is_active
  INTO 
    current_user_role,
    current_user_active
  FROM business.user_store_permissions usp
  WHERE usp.store_id = target_store_id
    AND usp.user_id = auth.uid();
  
  -- Must be authenticated and active
  IF current_user_role IS NULL OR current_user_active IS NOT TRUE THEN
    RETURN FALSE;
  END IF;
  
  -- Self-management is always allowed
  IF target_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;
  
  -- No specific target user, just check if user has management permissions
  IF target_user_id IS NULL THEN
    RETURN current_user_role IN ('owner', 'manager');
  END IF;
  
  -- Get target user's role
  SELECT usp.effective_role
  INTO target_user_role
  FROM business.user_store_permissions usp
  WHERE usp.store_id = target_store_id
    AND usp.user_id = target_user_id;
  
  -- Owner can manage everyone
  IF current_user_role = 'owner' THEN
    RETURN TRUE;
  END IF;
  
  -- Manager can only manage employees
  IF current_user_role = 'manager' AND target_user_role = 'employee' THEN
    RETURN TRUE;
  END IF;
  
  -- Default: no permission
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "business"."user_can_manage_store_users_v2"("target_store_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "business"."user_has_store_access"("store_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth'
    AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (
    SELECT 1 FROM business.stores 
    WHERE store_id = store_uuid AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has access via store_users
  IF EXISTS (
    SELECT 1 FROM business.store_users 
    WHERE store_id = store_uuid AND user_id = auth.uid() AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "business"."user_has_store_access"("store_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."auto_expire_batches"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    updated_count integer;
BEGIN
    -- Update batches that are expired by date but not marked as expired
    -- Only update if current status is 'active' to avoid overriding other statuses
    UPDATE inventory.batches 
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        expiry_date < CURRENT_DATE 
        AND status = 'active';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the operation (optional - can be useful for monitoring)
    INSERT INTO inventory.batch_status_logs (
        action_type,
        affected_count,
        executed_at,
        notes
    ) VALUES (
        'auto_expire',
        updated_count,
        NOW(),
        'Automatically expired batches past expiry date'
    );
    
    RETURN updated_count;
END;
$$;


ALTER FUNCTION "inventory"."auto_expire_batches"() OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."auto_expire_batches"() IS 'Automatically updates batches with expired dates to have status = expired. Returns count of updated records.';



CREATE OR REPLACE FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  item JSONB;
  result JSONB;
  results JSONB := '[]'::JSONB;
  store_id_check UUID;
  updated_batch RECORD;
BEGIN
  -- Validate input
  IF jsonb_array_length(items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Get store_id from first batch and verify user access
  -- NOTE: All table references are fully qualified with schema names
  SELECT b.store_id INTO store_id_check
  FROM inventory.batches b
  WHERE b.batch_id = (items->0->>'batch_id')::UUID;
  
  IF store_id_check IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = auth.uid()
      AND store_id = store_id_check
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  -- Process all items in a single transaction
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    -- Validate batch belongs to same store
    IF NOT EXISTS (
      SELECT 1 FROM inventory.batches
      WHERE batch_id = (item->>'batch_id')::UUID
        AND store_id = store_id_check
    ) THEN
      RAISE EXCEPTION 'Batch % does not belong to store', item->>'batch_id';
    END IF;

    -- Update batch quantity
    UPDATE inventory.batches
    SET 
      current_quantity = current_quantity - (item->>'quantity')::NUMERIC,
      available_quantity = COALESCE(available_quantity, current_quantity) - (item->>'quantity')::NUMERIC,
      updated_at = NOW(),
      status = CASE 
        WHEN (current_quantity - (item->>'quantity')::NUMERIC) <= 0 THEN 'depleted'
        ELSE status
      END
    WHERE batch_id = (item->>'batch_id')::UUID
    RETURNING 
      batch_id,
      current_quantity,
      status
    INTO updated_batch;
    
    -- Record the action in batch_actions table
    INSERT INTO inventory.batch_actions (
      batch_id,
      action_type,
      quantity,
      reason,
      notes,
      created_by,
      store_id
    ) VALUES (
      (item->>'batch_id')::UUID,
      COALESCE((item->>'action_type')::TEXT, 'sold'),
      (item->>'quantity')::NUMERIC,
      COALESCE((item->>'action_reason')::TEXT, 'checkout'),
      (item->>'notes')::TEXT,
      auth.uid(),
      store_id_check
    );
    
    -- Build result for this item
    result := jsonb_build_object(
      'batch_id', updated_batch.batch_id,
      'new_quantity', updated_batch.current_quantity,
      'status', updated_batch.status,
      'success', true
    );
    
    results := results || result;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', jsonb_array_length(results),
    'store_id', store_id_check,
    'timestamp', NOW(),
    'results', results
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'processed_count', 0
    );
END;
$$;


ALTER FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") IS 'Atomically updates multiple batch quantities in a single transaction. 
Used for high-performance checkout operations. Uses search_path = '''' per Supabase security best practices.
Input format: [{batch_id: UUID, quantity: number, action_type?: string, action_reason?: string, notes?: string}]
Returns: {success: boolean, processed_count: number, results: array}';



CREATE TABLE IF NOT EXISTS "inventory"."batches" (
    "batch_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "batch_number" character varying(100) NOT NULL,
    "supplier" character varying(255),
    "manufacture_date" "date",
    "expiry_date" "date" NOT NULL,
    "received_date" "date" DEFAULT CURRENT_DATE,
    "initial_quantity" numeric(12,4) NOT NULL,
    "current_quantity" numeric(12,4) NOT NULL,
    "reserved_quantity" numeric(12,4) DEFAULT 0,
    "cost_price" numeric(12,4) NOT NULL,
    "selling_price" numeric(12,4) NOT NULL,
    "location_code" character varying(50),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "available_quantity" numeric(12,4) GENERATED ALWAYS AS (("current_quantity" - "reserved_quantity")) STORED,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "store_id" "uuid" NOT NULL,
    "ocr_extracted_date" "text",
    "ocr_confidence" numeric(3,2),
    "processing_batch_id" "uuid",
    "batch_source" character varying(50) DEFAULT 'manual'::character varying,
    "scanned_barcode" character varying(50),
    "scan_confidence" numeric(3,2),
    "verification_status" character varying(20) DEFAULT 'verified'::character varying,
    CONSTRAINT "batches_confidence_range_check" CHECK ((("scan_confidence" IS NULL) OR (("scan_confidence" >= 0.0) AND ("scan_confidence" <= 1.0)))),
    CONSTRAINT "batches_cost_price_check" CHECK (("cost_price" > (0)::numeric)),
    CONSTRAINT "batches_current_quantity_check" CHECK (("current_quantity" >= (0)::numeric)),
    CONSTRAINT "batches_initial_quantity_check" CHECK (("initial_quantity" > (0)::numeric)),
    CONSTRAINT "batches_reserved_quantity_check" CHECK (("reserved_quantity" >= (0)::numeric)),
    CONSTRAINT "batches_selling_price_check" CHECK (("selling_price" > (0)::numeric)),
    CONSTRAINT "batches_source_check" CHECK ((("batch_source")::"text" = ANY (ARRAY[('manual'::character varying)::"text", ('barcode'::character varying)::"text", ('scanned'::character varying)::"text", ('scan'::character varying)::"text", ('barcode_scan'::character varying)::"text", ('csv_import'::character varying)::"text", ('api'::character varying)::"text", ('pos_integration'::character varying)::"text"]))),
    CONSTRAINT "batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'damaged'::character varying, 'sold_out'::character varying, 'reserved'::character varying, 'donated'::character varying])::"text"[]))),
    CONSTRAINT "batches_verification_check" CHECK ((("verification_status")::"text" = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::"text"[]))),
    CONSTRAINT "chk_reserved_quantity_valid" CHECK (("reserved_quantity" <= "current_quantity"))
);


ALTER TABLE "inventory"."batches" OWNER TO "postgres";


COMMENT ON COLUMN "inventory"."batches"."manufacture_date" IS 'Manufacturing date of the batch. Nullable since stores often only know expiry dates from scanning.';



COMMENT ON COLUMN "inventory"."batches"."current_quantity" IS 'Current quantity of items in this batch. Can be increased for returns, corrections, or additional receipts.';



COMMENT ON COLUMN "inventory"."batches"."batch_source" IS 'Source of batch creation: manual, barcode, scanned, scan, barcode_scan, csv_import, api, pos_integration';



CREATE OR REPLACE FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'scoring', 'public'
    AS $$
DECLARE
  v_days_to_expiry INTEGER;
  v_composite_score DECIMAL(3,2);
  v_urgency_level TEXT;
  v_recommendation TEXT;
  v_margin_percent DECIMAL(5,2);
  v_expiry_score DECIMAL(3,2);
  v_financial_score DECIMAL(3,2);
  v_quantity_score DECIMAL(3,2);
  v_potential_loss DECIMAL(10,2);
BEGIN
  -- Calculate days to expiry
  v_days_to_expiry := EXTRACT(DAY FROM (batch_row.expiry_date - CURRENT_DATE));
  
  -- Calculate margin percentage
  IF batch_row.selling_price > 0 THEN
    v_margin_percent := ((batch_row.selling_price - batch_row.cost_price) / batch_row.selling_price) * 100;
  ELSE
    v_margin_percent := 0;
  END IF;

  -- Calculate expiry score
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

  -- Financial and quantity scores
  v_potential_loss := batch_row.current_quantity * batch_row.selling_price;
  v_financial_score := LEAST(1.0, v_potential_loss / 500.0);
  v_quantity_score := LEAST(1.0, batch_row.current_quantity / 100.0);

  -- Calculate composite score
  v_composite_score := (
    (v_expiry_score * 0.40) +
    (v_financial_score * 0.30) +
    (v_quantity_score * 0.30)
  );

  -- Determine urgency level
  IF v_days_to_expiry <= 0 THEN
    v_urgency_level := 'critical';
  ELSIF v_days_to_expiry <= 1 THEN
    v_urgency_level := 'high';
  ELSIF v_days_to_expiry <= 3 THEN
    v_urgency_level := 'medium';
  ELSE
    v_urgency_level := 'low';
  END IF;

  -- Generate recommendation
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

  -- Insert or update scoring data
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
    batch_row.batch_id,
    batch_row.store_id,
    v_composite_score,
    v_expiry_score,
    v_financial_score,
    v_quantity_score,
    0.5, -- Default turnover
    0.5, -- Default category risk
    v_recommendation,
    v_urgency_level,
    NOW(),
    v_days_to_expiry,
    v_potential_loss,
    v_margin_percent,
    0.5, -- velocity score
    v_margin_percent / 100.0, -- margin score
    false, -- ml_enhanced
    0.85 -- confidence level
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
END;
$$;


ALTER FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") IS 'Manual scoring calculation for batch recalculation operations';



CREATE OR REPLACE FUNCTION "inventory"."check_batch_expiry_on_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Only check if this is an INSERT or if expiry_date was updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.expiry_date != NEW.expiry_date) THEN
        -- If the batch is already expired when created/updated, mark it as expired
        -- Using CURRENT_DATE and NOW() functions (these are built-in and don't require schema qualification)
        IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
            NEW.status = 'expired';
            NEW.updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "inventory"."check_batch_expiry_on_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."check_batch_expiry_on_change"() IS 'Trigger function that checks if a batch is expired when created or updated and sets status accordingly.';



CREATE OR REPLACE FUNCTION "inventory"."daily_batch_expiry_cleanup"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Run the auto-expire function (must fully qualify function name)
    PERFORM inventory.auto_expire_batches();
    
    -- Additional cleanup can be added here:
    -- - Notify managers of newly expired items
    -- - Update analytics tables
    -- - Archive old expired batches
END;
$$;


ALTER FUNCTION "inventory"."daily_batch_expiry_cleanup"() OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."daily_batch_expiry_cleanup"() IS 'Daily cleanup function that should be called by a scheduler to expire old batches automatically.';



CREATE OR REPLACE FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "p_end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("action_type" "public"."action_type", "total_actions" bigint, "total_quantity" numeric, "total_original_value" numeric, "total_recovered_value" numeric, "avg_recovery_rate" numeric, "most_common_day_of_week" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'business', 'public'
    AS $$
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
$$;


ALTER FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Returns action statistics for analytics dashboard';



CREATE OR REPLACE FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "location_code" character varying, "status" character varying, "created_at" timestamp without time zone, "product_name" character varying, "brand_name" character varying, "barcode" "text", "category_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = p_store_id
      AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  -- Return available batches for the specified product
  -- NOTE: All references are now fully qualified with schema names and table aliases
  RETURN QUERY
  SELECT 
    b.batch_id,
    b.batch_number,
    b.product_id,  -- From batches table
    b.store_id,    -- From batches table (not sp.store_id)
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
    b.created_at,
    p.name AS product_name,
    p.brand AS brand_name,
    p.barcode,
    c.display_name_en AS category_name
  FROM inventory.batches b
  INNER JOIN inventory.store_products sp 
    ON b.product_id = sp.product_id 
    AND b.store_id = sp.store_id  -- Both tables have store_id, so use aliases
  INNER JOIN inventory.products p 
    ON sp.product_id = p.product_id
  LEFT JOIN inventory.categories c 
    ON p.category_id = c.category_id
  WHERE b.product_id = p_product_id
    AND b.store_id = p_store_id  -- Explicitly use b.store_id
    AND b.status = 'active'
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;


ALTER FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") IS 'Securely finds available batches by product ID with store access verification.
Uses search_path = '''' per Supabase security best practices.';



CREATE OR REPLACE FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "initial_quantity" numeric, "current_quantity" numeric, "action_type" "public"."action_type", "quantity_affected" numeric, "percentage_of_batch" numeric, "original_value" numeric, "recovered_value" numeric, "discount_percentage" numeric, "donation_recipient_name" character varying, "disposal_reason" "text", "performed_by_name" "text", "performed_at" timestamp without time zone, "verified_at" timestamp without time zone, "notes" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'business', 'auth', 'public'
    AS $$
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
$$;


ALTER FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") IS 'Returns detailed breakdown of all actions performed on a specific batch with user access control';



CREATE OR REPLACE FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer DEFAULT 0, "p_page_size" integer DEFAULT 20, "p_product_id" "uuid" DEFAULT NULL::"uuid", "p_status" character varying DEFAULT NULL::character varying, "p_location_code" character varying DEFAULT NULL::character varying, "p_supplier" character varying DEFAULT NULL::character varying, "p_search" "text" DEFAULT NULL::"text", "p_has_stock" boolean DEFAULT NULL::boolean, "p_expiring_in_days" integer DEFAULT NULL::integer, "p_expiry_date_from" "date" DEFAULT NULL::"date", "p_expiry_date_to" "date" DEFAULT NULL::"date", "p_received_date_from" "date" DEFAULT NULL::"date", "p_received_date_to" "date" DEFAULT NULL::"date", "p_sort_field" character varying DEFAULT 'expiry_date'::character varying, "p_sort_direction" character varying DEFAULT 'asc'::character varying) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "manufacture_date" "date", "received_date" "date", "current_quantity" numeric, "initial_quantity" numeric, "reserved_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "supplier" character varying, "location_code" character varying, "status" character varying, "batch_source" character varying, "scanned_barcode" character varying, "scan_confidence" numeric, "verification_status" character varying, "ocr_extracted_date" "text", "ocr_confidence" numeric, "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "created_by" "uuid", "product_name" character varying, "product_sku" character varying, "product_barcode" "text", "product_brand" character varying, "product_description" "text", "product_unit_type" character varying, "product_typical_shelf_life_days" integer, "product_image_url" "text", "product_category_id" "uuid", "product_category_code" "text", "product_category_name_en" "text", "product_category_name_fr" "text", "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_offset INTEGER;
  v_limit INTEGER;
BEGIN
  -- Authorization check using existing function
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  v_offset := p_page * p_page_size;
  v_limit := p_page_size;

  RETURN QUERY
  WITH filtered_batches AS (
    SELECT 
      b.batch_id,
      b.batch_number,
      b.product_id,
      b.store_id,
      b.expiry_date,
      b.manufacture_date,
      b.received_date,
      b.current_quantity,
      b.initial_quantity,
      b.reserved_quantity,
      b.available_quantity,
      b.cost_price,
      b.selling_price,
      b.supplier,
      b.location_code,
      b.status,
      b.batch_source,
      b.scanned_barcode,
      b.scan_confidence,
      b.verification_status,
      b.ocr_extracted_date,
      b.ocr_confidence,
      b.created_at,
      b.updated_at,
      b.created_by,
      -- Product info joined
      p.name AS product_name,
      p.sku AS product_sku,
      p.barcode AS product_barcode,
      p.brand AS product_brand,
      p.description AS product_description,
      p.unit_type AS product_unit_type,
      p.typical_shelf_life_days AS product_typical_shelf_life_days,
      p.image_url AS product_image_url,
      p.category_id AS product_category_id,
      c.category_code AS product_category_code,
      c.display_name_en AS product_category_name_en,
      c.display_name_fr AS product_category_name_fr
    FROM inventory.batches b
    INNER JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id
      AND (p_product_id IS NULL OR b.product_id = p_product_id)
      AND (p_status IS NULL OR b.status = p_status)
      AND (p_location_code IS NULL OR b.location_code = p_location_code)
      AND (p_supplier IS NULL OR b.supplier ILIKE '%' || p_supplier || '%')
      -- ✨ NEW: Search filter across multiple fields
      AND (
        p_search IS NULL 
        OR b.batch_number ILIKE '%' || p_search || '%'
        OR p.name ILIKE '%' || p_search || '%'
        OR p.brand ILIKE '%' || p_search || '%'
        OR p.barcode ILIKE '%' || p_search || '%'
        OR p.sku ILIKE '%' || p_search || '%'
        OR b.location_code ILIKE '%' || p_search || '%'
        OR b.supplier ILIKE '%' || p_search || '%'
      )
      AND (p_has_stock IS NULL OR (p_has_stock AND b.current_quantity > 0) OR (NOT p_has_stock))
      AND (p_expiring_in_days IS NULL OR b.expiry_date <= CURRENT_DATE + p_expiring_in_days)
      AND (p_expiry_date_from IS NULL OR b.expiry_date >= p_expiry_date_from)
      AND (p_expiry_date_to IS NULL OR b.expiry_date <= p_expiry_date_to)
      AND (p_received_date_from IS NULL OR b.received_date >= p_received_date_from)
      AND (p_received_date_to IS NULL OR b.received_date <= p_received_date_to)
  ),
  total AS (
    SELECT COUNT(*) AS count FROM filtered_batches
  )
  SELECT 
    fb.*,
    t.count AS total_count
  FROM filtered_batches fb
  CROSS JOIN total t
  ORDER BY
    CASE WHEN p_sort_field = 'expiry_date' AND p_sort_direction = 'asc' THEN fb.expiry_date END ASC,
    CASE WHEN p_sort_field = 'expiry_date' AND p_sort_direction = 'desc' THEN fb.expiry_date END DESC,
    CASE WHEN p_sort_field = 'current_quantity' AND p_sort_direction = 'asc' THEN fb.current_quantity END ASC,
    CASE WHEN p_sort_field = 'current_quantity' AND p_sort_direction = 'desc' THEN fb.current_quantity END DESC,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_direction = 'asc' THEN fb.cost_price END ASC,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_direction = 'desc' THEN fb.cost_price END DESC,
    CASE WHEN p_sort_field = 'selling_price' AND p_sort_direction = 'asc' THEN fb.selling_price END ASC,
    CASE WHEN p_sort_field = 'selling_price' AND p_sort_direction = 'desc' THEN fb.selling_price END DESC,
    CASE WHEN p_sort_field = 'received_date' AND p_sort_direction = 'asc' THEN fb.received_date END ASC,
    CASE WHEN p_sort_field = 'received_date' AND p_sort_direction = 'desc' THEN fb.received_date END DESC,
    CASE WHEN p_sort_field = 'manufacture_date' AND p_sort_direction = 'asc' THEN fb.manufacture_date END ASC,
    CASE WHEN p_sort_field = 'manufacture_date' AND p_sort_direction = 'desc' THEN fb.manufacture_date END DESC,
    CASE WHEN p_sort_field = 'batch_number' AND p_sort_direction = 'asc' THEN fb.batch_number END ASC,
    CASE WHEN p_sort_field = 'batch_number' AND p_sort_direction = 'desc' THEN fb.batch_number END DESC,
    CASE WHEN p_sort_field = 'supplier' AND p_sort_direction = 'asc' THEN fb.supplier END ASC,
    CASE WHEN p_sort_field = 'supplier' AND p_sort_direction = 'desc' THEN fb.supplier END DESC,
    CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'asc' THEN fb.status END ASC,
    CASE WHEN p_sort_field = 'status' AND p_sort_direction = 'desc' THEN fb.status END DESC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN fb.created_at END ASC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN fb.created_at END DESC,
    fb.expiry_date ASC -- Default fallback
  OFFSET v_offset
  LIMIT v_limit;
END;
$$;


ALTER FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_search" "text", "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_search" "text", "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) IS 'Enhanced RPC for paginated batch retrieval with comprehensive search across batch number, product details, location, and supplier. Returns batches with full product and category information.';



CREATE OR REPLACE FUNCTION "inventory"."get_categories_for_dropdown"() RETURNS TABLE("category_id" "uuid", "category_code" "text", "display_name_en" "text", "display_name_fr" "text", "product_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.category_id,
    c.category_code,
    c.display_name_en,
    c.display_name_fr,
    COUNT(p.product_id) as product_count
  FROM inventory.categories c
  LEFT JOIN inventory.products p ON c.category_id = p.category_id
  WHERE c.is_active = true
    AND c.parent_category_id IS NULL  -- Only top-level categories for dropdown
  GROUP BY c.category_id, c.category_code, c.display_name_en, c.display_name_fr, c.sort_order
  ORDER BY c.sort_order;
END;
$$;


ALTER FUNCTION "inventory"."get_categories_for_dropdown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."get_category_info"("category_text" "text" DEFAULT NULL::"text", "category_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("category_id" "uuid", "category_code" "text", "display_name_en" "text", "display_name_fr" "text", "typical_shelf_life_days" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'inventory', 'public'
    AS $$
BEGIN
  -- Try by UUID first
  IF category_uuid IS NOT NULL THEN
    RETURN QUERY
    SELECT c.category_id, c.category_code, c.display_name_en, c.display_name_fr, c.typical_shelf_life_days
    FROM inventory.categories c
    WHERE c.category_id = category_uuid;
    RETURN;
  END IF;
  
  -- Try by category code
  IF category_text IS NOT NULL THEN
    RETURN QUERY
    SELECT c.category_id, c.category_code, c.display_name_en, c.display_name_fr, c.typical_shelf_life_days
    FROM inventory.categories c
    WHERE c.category_code = category_text
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Try mapping legacy category
    RETURN QUERY
    SELECT c.category_id, c.category_code, c.display_name_en, c.display_name_fr, c.typical_shelf_life_days
    FROM inventory.categories c
    WHERE c.category_id = inventory.map_legacy_category(category_text);
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "inventory"."get_category_info"("category_text" "text", "category_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") RETURNS TABLE("recipient_id" "uuid", "name" character varying, "recipient_type" "public"."donation_recipient_type", "contact_email" character varying, "contact_phone" character varying, "is_certified" boolean, "accepts_pickups" boolean, "max_distance_km" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'business', 'public'
    AS $$
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
$$;


ALTER FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") IS 'Returns active donation recipients for a store for use in action selection';



CREATE OR REPLACE FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer DEFAULT 7) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "supplier" character varying, "location_code" character varying, "status" character varying, "product_name" character varying, "product_sku" character varying, "product_barcode" "text", "product_brand" character varying, "product_category_code" "text", "product_category_name_en" "text", "product_category_name_fr" "text", "days_until_expiry" integer, "total_value" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  -- Authorization check
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  RETURN QUERY
  SELECT 
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.cost_price,
    b.selling_price,
    b.supplier,
    b.location_code,
    b.status,
    p.name AS product_name,
    p.sku AS product_sku,
    p.barcode AS product_barcode,
    p.brand AS product_brand,
    c.category_code AS product_category_code,
    c.display_name_en AS product_category_name_en,
    c.display_name_fr AS product_category_name_fr,
    (b.expiry_date - CURRENT_DATE)::INTEGER AS days_until_expiry,
    (b.current_quantity * b.cost_price) AS total_value
  FROM inventory.batches b
  INNER JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE b.store_id = p_store_id
    AND b.status = 'active'
    AND b.current_quantity > 0
    AND b.expiry_date <= CURRENT_DATE + p_days_ahead
  ORDER BY b.expiry_date ASC, b.current_quantity DESC;
END;
$$;


ALTER FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) IS 'Get batches expiring within specified days with product context. Optimized for dashboard alerts and action recommendations.';



CREATE OR REPLACE FUNCTION "inventory"."get_expiry_job_status"() RETURNS TABLE("jobid" bigint, "jobname" "text", "schedule" "text", "active" boolean, "command" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        j.command
    FROM cron.job j  -- Fully qualified table name
    WHERE j.jobname IN ('daily-batch-expiry-cleanup', 'hourly-batch-expiry-check')
    ORDER BY j.jobname;
END;
$$;


ALTER FUNCTION "inventory"."get_expiry_job_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric DEFAULT 10) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "status" character varying, "product_name" character varying, "product_sku" character varying, "product_category_code" "text", "product_category_name_en" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  -- Authorization check
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  RETURN QUERY
  SELECT 
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.status,
    p.name AS product_name,
    p.sku AS product_sku,
    c.category_code AS product_category_code,
    c.display_name_en AS product_category_name_en
  FROM inventory.batches b
  INNER JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE b.store_id = p_store_id
    AND b.status = 'active'
    AND b.current_quantity > 0
    AND b.current_quantity <= p_threshold_quantity
  ORDER BY b.current_quantity ASC, b.expiry_date ASC;
END;
$$;


ALTER FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) IS 'Get batches with stock below threshold. Optimized for inventory alerts.';



CREATE OR REPLACE FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text" DEFAULT NULL::"text", "p_brand" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text", "p_sort_field" "text" DEFAULT 'created_at'::"text", "p_sort_direction" "text" DEFAULT 'desc'::"text", "p_page_size" integer DEFAULT 20, "p_page_offset" integer DEFAULT 0) RETURNS TABLE("product_id" "uuid", "sku" character varying, "name" character varying, "description" "text", "brand" character varying, "unit_type" character varying, "typical_shelf_life_days" integer, "base_cost_price" numeric, "base_selling_price" numeric, "total_stock" numeric, "active_batches_count" integer, "avg_days_to_expiry" numeric, "created_by" "uuid", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "barcode" "text", "image_url" "text", "open_food_facts_data" "jsonb", "last_verified" timestamp without time zone, "barcode_type" character varying, "is_verified" boolean, "verification_count" integer, "last_scanned_at" timestamp without time zone, "category_id" "uuid", "store_cost_price" numeric, "store_selling_price" numeric, "store_is_active" boolean, "store_sku" character varying, "supplier_code" character varying, "category_code" "text", "category_display_name" "text", "category_display_name_fr" "text", "calculated_total_stock" numeric, "calculated_active_batches_count" bigint, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH batch_aggregations AS (
    SELECT 
      b.product_id,
      SUM(CASE WHEN b.current_quantity > 0 THEN b.current_quantity ELSE 0 END) as stock_sum,
      COUNT(*) FILTER (WHERE b.status = 'active') as active_count
    FROM inventory.batches b
    WHERE b.store_id = p_store_id
    GROUP BY b.product_id
  ),
  filtered_products AS (
    SELECT 
      p.product_id,
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
      sp.cost_price as store_cost_price,
      sp.selling_price as store_selling_price,
      sp.is_active as store_is_active,
      sp.store_sku,
      sp.supplier_code,
      c.category_code,
      c.display_name_en as category_display_name,
      c.display_name_fr as category_display_name_fr,
      COALESCE(ba.stock_sum, 0) as calculated_total_stock,
      COALESCE(ba.active_count, 0) as calculated_active_batches_count,
      COUNT(*) OVER() as total_count
    FROM inventory.store_products sp
    INNER JOIN inventory.products p ON sp.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    LEFT JOIN batch_aggregations ba ON p.product_id = ba.product_id
    WHERE 
      sp.store_id = p_store_id
      AND sp.is_active = true
      AND (p_category_code IS NULL OR c.category_code = p_category_code)
      AND (p_brand IS NULL OR p.brand = p_brand)
      -- NEW: Search filter - searches across name, brand, barcode, and SKU
      AND (
        p_search IS NULL 
        OR p.name ILIKE '%' || p_search || '%'
        OR p.brand ILIKE '%' || p_search || '%'
        OR p.barcode ILIKE '%' || p_search || '%'
        OR p.sku ILIKE '%' || p_search || '%'
      )
  )
  SELECT 
    fp.product_id,
    fp.sku,
    fp.name,
    fp.description,
    fp.brand,
    fp.unit_type,
    fp.typical_shelf_life_days,
    fp.base_cost_price,
    fp.base_selling_price,
    fp.total_stock,
    fp.active_batches_count,
    fp.avg_days_to_expiry,
    fp.created_by,
    fp.created_at,
    fp.updated_at,
    fp.barcode,
    fp.image_url,
    fp.open_food_facts_data,
    fp.last_verified,
    fp.barcode_type,
    fp.is_verified,
    fp.verification_count,
    fp.last_scanned_at,
    fp.category_id,
    fp.store_cost_price,
    fp.store_selling_price,
    fp.store_is_active,
    fp.store_sku,
    fp.supplier_code,
    fp.category_code,
    fp.category_display_name,
    fp.category_display_name_fr,
    fp.calculated_total_stock,
    fp.calculated_active_batches_count,
    fp.total_count
  FROM filtered_products fp
  ORDER BY
    CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'asc' THEN fp.name END ASC,
    CASE WHEN p_sort_field = 'name' AND p_sort_direction = 'desc' THEN fp.name END DESC,
    CASE WHEN p_sort_field = 'brand' AND p_sort_direction = 'asc' THEN fp.brand END ASC,
    CASE WHEN p_sort_field = 'brand' AND p_sort_direction = 'desc' THEN fp.brand END DESC,
    CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'asc' THEN fp.category_display_name END ASC,
    CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'desc' THEN fp.category_display_name END DESC,
    CASE WHEN p_sort_field = 'total_stock' AND p_sort_direction = 'asc' THEN fp.calculated_total_stock END ASC,
    CASE WHEN p_sort_field = 'total_stock' AND p_sort_direction = 'desc' THEN fp.calculated_total_stock END DESC,
    CASE WHEN p_sort_field = 'active_batches_count' AND p_sort_direction = 'asc' THEN fp.calculated_active_batches_count END ASC,
    CASE WHEN p_sort_field = 'active_batches_count' AND p_sort_direction = 'desc' THEN fp.calculated_active_batches_count END DESC,
    CASE WHEN p_sort_field = 'base_selling_price' AND p_sort_direction = 'asc' THEN fp.base_selling_price END ASC,
    CASE WHEN p_sort_field = 'base_selling_price' AND p_sort_direction = 'desc' THEN fp.base_selling_price END DESC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN fp.created_at END ASC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN fp.created_at END DESC
  LIMIT p_page_size
  OFFSET p_page_offset;
END;
$$;


ALTER FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_search" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_search" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) IS 'Paginated product listing with filtering and search. 
Search parameter (p_search) searches across product name, brand, barcode, and SKU using case-insensitive matching.
Updated: 2025-01-24 - Added search functionality';



CREATE OR REPLACE FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("entry_id" "uuid", "batch_number" character varying, "product_name" character varying, "action_type" "public"."action_type", "quantity_affected" numeric, "original_value" numeric, "recovered_value" numeric, "performed_by_email" "text", "performed_at" timestamp without time zone, "notes" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'business', 'auth', 'public'
    AS $$
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
$$;


ALTER FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer) IS 'Returns recent action history for a store';



CREATE OR REPLACE FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'scoring', 'business', 'public'
    AS $$
  SELECT COUNT(*)::INT
  FROM inventory.batch_todo_states
  WHERE store_id = p_store_id
    AND urgency_level IN ('critical', 'high')
    AND completion_status != 'completed';
$$;


ALTER FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") IS 'Returns count of urgent incomplete todos for a store. Uses SECURITY DEFINER to access secured materialized view with proper store authorization checks.';



CREATE OR REPLACE FUNCTION "inventory"."get_user_stores"() RETURNS TABLE("store_id" "uuid", "store_name" "text", "role_in_store" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'inventory', 'auth', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.store_id, s.store_name::TEXT, su.role_in_store::TEXT
    FROM business.stores s
    JOIN business.store_users su ON s.store_id = su.store_id
    WHERE su.user_id = auth.uid()
    AND su.is_active = TRUE
    AND s.is_active = TRUE;
END;
$$;


ALTER FUNCTION "inventory"."get_user_stores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."has_batches"("p_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM inventory.batches 
    WHERE store_id = p_store_id 
    LIMIT 1
  );
$$;


ALTER FUNCTION "inventory"."has_batches"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."has_batches"("p_store_id" "uuid") IS 'Lightweight existence check for batches. Returns true if store has any batches. Optimized for dashboard count queries.';



CREATE OR REPLACE FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    batch_exists boolean;
BEGIN
    -- Check if batch exists and is currently active
    SELECT EXISTS(
        SELECT 1 FROM inventory.batches 
        WHERE batch_id = batch_uuid AND status = 'active'
    ) INTO batch_exists;
    
    IF NOT batch_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update the batch
    UPDATE inventory.batches 
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE batch_id = batch_uuid;
    
    -- Log the manual action
    INSERT INTO inventory.batch_status_logs (
        action_type,
        affected_count,
        executed_at,
        notes,
        created_by
    ) VALUES (
        'manual_expire',
        1,
        NOW(),
        'Manually expired batch: ' || batch_uuid::text,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") IS 'Manually expire a specific batch by batch_id. Returns true if successful, false if batch not found or not active.';



CREATE OR REPLACE FUNCTION "inventory"."map_legacy_category"("legacy_category" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'inventory', 'public'
    AS $$
DECLARE
  mapped_category_id UUID;
BEGIN
  -- Direct mappings for existing categories
  SELECT category_id INTO mapped_category_id 
  FROM inventory.categories 
  WHERE category_code = CASE LOWER(TRIM(legacy_category))
    -- Fresh Produce mappings
    WHEN 'fruits & vegetables' THEN 'fresh_produce'
    WHEN 'fresh_produce' THEN 'fresh_produce' 
    WHEN 'produce' THEN 'fresh_produce'
    
    -- Meat & Fish mappings
    WHEN 'meat & fish' THEN 'fresh_meat_fish'
    WHEN 'fresh_meat_fish' THEN 'fresh_meat_fish'
    WHEN 'meat' THEN 'fresh_meat_fish'
    WHEN 'fish' THEN 'fresh_meat_fish'
    
    -- Dairy mappings
    WHEN 'dairy' THEN 'dairy_eggs'
    WHEN 'dairy_eggs' THEN 'dairy_eggs'
    
    -- Bakery mappings
    WHEN 'bakery' THEN 'bakery_fresh'
    WHEN 'bakery_fresh' THEN 'bakery_fresh'
    WHEN 'pastry' THEN 'bakery_fresh'
    WHEN 'cookie' THEN 'bakery_fresh'
    WHEN 'dessert' THEN 'bakery_fresh'
    
    -- Beverages mapping
    WHEN 'beverages' THEN 'beverages'
    WHEN 'beverage' THEN 'beverages'
    
    -- Frozen mappings
    WHEN 'frozen' THEN 'frozen_foods'
    WHEN 'frozen foods' THEN 'frozen_foods'
    
    -- Pantry mappings
    WHEN 'pantry' THEN 'pantry_staples'
    WHEN 'pantry_staples' THEN 'pantry_staples'
    WHEN 'dry_goods' THEN 'dry_goods'
    WHEN 'pasta & rice' THEN 'dry_goods'
    WHEN 'cereals & grains' THEN 'dry_goods'
    
    -- Canned goods mappings
    WHEN 'canned goods' THEN 'canned_jarred'
    WHEN 'canned_jarred' THEN 'canned_jarred'
    
    -- Snacks mappings
    WHEN 'snacks' THEN 'snacks_confectionery'
    WHEN 'confectionery' THEN 'snacks_confectionery'
    
    -- Condiments mappings
    WHEN 'spices_condiments' THEN 'spices_condiments'
    
    -- Default to household_other for unrecognized categories
    ELSE 'household_other'
  END;
  
  -- If no direct mapping found, try to find by partial match
  IF mapped_category_id IS NULL THEN
    SELECT category_id INTO mapped_category_id 
    FROM inventory.categories 
    WHERE LOWER(display_name_en) ILIKE '%' || LOWER(TRIM(legacy_category)) || '%'
    LIMIT 1;
  END IF;
  
  -- Final fallback to 'household_other'
  IF mapped_category_id IS NULL THEN
    SELECT category_id INTO mapped_category_id 
    FROM inventory.categories 
    WHERE category_code = 'household_other';
  END IF;
  
  RETURN mapped_category_id;
END;
$$;


ALTER FUNCTION "inventory"."map_legacy_category"("legacy_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
DECLARE
  v_batch RECORD;
  v_action JSONB;
  v_entry_id UUID;
  v_entries_created INTEGER := 0;
  v_total_quantity_processed NUMERIC := 0;
  v_current_user UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Validate user has access to this batch
  SELECT b.*, p.name as product_name, p.base_selling_price
  INTO v_batch
  FROM batches b
  JOIN products p ON p.product_id = b.product_id
  WHERE b.batch_id = p_batch_id
  AND b.store_id IN (
    SELECT store_id FROM business.store_users 
    WHERE user_id = v_current_user
  );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found or access denied';
  END IF;
  
  -- Validate that actions array is valid
  IF p_actions IS NULL OR jsonb_array_length(p_actions) = 0 THEN
    RAISE EXCEPTION 'Actions array cannot be empty';
  END IF;
  
  -- Calculate total quantity being processed in this request
  SELECT SUM((action->>'quantity')::NUMERIC)
  INTO v_total_quantity_processed
  FROM jsonb_array_elements(p_actions) AS action;
  
  -- Validate total quantity doesn't exceed available quantity
  IF v_total_quantity_processed > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Total quantity (%) exceeds available quantity (%)', 
      v_total_quantity_processed, v_batch.current_quantity;
  END IF;
  
  -- Process each action
  FOR v_action IN SELECT value FROM jsonb_array_elements(p_actions)
  LOOP
    -- Validate required fields
    IF v_action->>'action_type' IS NULL OR v_action->>'quantity' IS NULL THEN
      RAISE EXCEPTION 'Each action must have action_type and quantity';
    END IF;
    
    -- Validate action type
    IF (v_action->>'action_type')::action_type NOT IN ('discount', 'donate', 'dispose', 'maintain', 'ignored') THEN
      RAISE EXCEPTION 'Invalid action_type: %', v_action->>'action_type';
    END IF;
    
    -- Validate action-specific fields
    IF (v_action->>'action_type') = 'discount' AND v_action->>'discount_percentage' IS NULL THEN
      RAISE EXCEPTION 'Discount actions must include discount_percentage';
    END IF;
    
    IF (v_action->>'action_type') = 'donate' AND v_action->>'donation_recipient_id' IS NULL THEN
      RAISE EXCEPTION 'Donation actions must include donation_recipient_id';
    END IF;
    
    IF (v_action->>'action_type') = 'dispose' AND v_action->>'disposal_reason' IS NULL THEN
      RAISE EXCEPTION 'Disposal actions must include disposal_reason';
    END IF;
    
    -- Calculate financial values
    DECLARE
      v_quantity NUMERIC := (v_action->>'quantity')::NUMERIC;
      v_original_value NUMERIC := v_quantity * v_batch.selling_price;
      v_recovered_value NUMERIC := 0;
    BEGIN
      -- Calculate recovered value based on action type
      CASE (v_action->>'action_type')::action_type
        WHEN 'discount' THEN
          v_recovered_value := v_original_value * (1 - (v_action->>'discount_percentage')::NUMERIC / 100);
        WHEN 'donate' THEN
          v_recovered_value := 0; -- Donations have no monetary recovery but may have tax benefits
        WHEN 'dispose' THEN
          v_recovered_value := 0;
        WHEN 'maintain' THEN
          v_recovered_value := v_original_value; -- Full value maintained
        ELSE
          v_recovered_value := 0;
      END CASE;
      
      -- Insert the action entry
      INSERT INTO batch_action_entries (
        batch_id,
        action_type,
        quantity_affected,
        total_original_value,
        total_recovered_value,
        discount_percentage,
        donation_recipient_id,
        disposal_reason,
        performed_by,
        notes,
        batch_initial_quantity
      ) VALUES (
        p_batch_id,
        (v_action->>'action_type')::action_type,
        v_quantity,
        v_original_value,
        v_recovered_value,
        CASE WHEN v_action ? 'discount_percentage' THEN (v_action->>'discount_percentage')::NUMERIC ELSE NULL END,
        CASE WHEN v_action ? 'donation_recipient_id' THEN (v_action->>'donation_recipient_id')::UUID ELSE NULL END,
        v_action->>'disposal_reason',
        v_current_user,
        v_action->>'notes',
        v_batch.initial_quantity
      ) RETURNING entry_id INTO v_entry_id;
      
      v_entries_created := v_entries_created + 1;
    END;
  END LOOP;
  
  -- Update batch current_quantity
  UPDATE batches 
  SET 
    current_quantity = current_quantity - v_total_quantity_processed,
    updated_at = NOW()
  WHERE batch_id = p_batch_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'entries_created', v_entries_created,
    'total_quantity_processed', v_total_quantity_processed,
    'remaining_quantity', v_batch.current_quantity - v_total_quantity_processed,
    'message', format('Successfully processed %s actions affecting %s units', v_entries_created, v_total_quantity_processed)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") IS 'Records multiple actions on a single batch with validation and automatic financial calculations';



CREATE OR REPLACE FUNCTION "inventory"."resolve_category_from_off_data"("off_categories" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  category_id UUID;
  category_candidate TEXT;
BEGIN
  -- If no categories provided, return default
  IF off_categories IS NULL OR array_length(off_categories, 1) IS NULL THEN
    SELECT c.category_id INTO category_id 
    FROM inventory.categories c 
    WHERE c.category_code = 'household_other';
    RETURN category_id;
  END IF;
  
  -- Try to map Open Food Facts categories to our standardized categories
  FOREACH category_candidate IN ARRAY off_categories
  LOOP
    -- Try direct mapping of common OFF categories
    SELECT c.category_id INTO category_id
    FROM inventory.categories c
    WHERE c.category_code = CASE 
      WHEN LOWER(category_candidate) LIKE '%beverages%' THEN 'beverages'
      WHEN LOWER(category_candidate) LIKE '%dairy%' OR LOWER(category_candidate) LIKE '%milk%' OR LOWER(category_candidate) LIKE '%cheese%' THEN 'dairy_eggs'
      WHEN LOWER(category_candidate) LIKE '%meat%' OR LOWER(category_candidate) LIKE '%fish%' OR LOWER(category_candidate) LIKE '%seafood%' THEN 'fresh_meat_fish'
      WHEN LOWER(category_candidate) LIKE '%fruits%' OR LOWER(category_candidate) LIKE '%vegetables%' OR LOWER(category_candidate) LIKE '%produce%' THEN 'fresh_produce'
      WHEN LOWER(category_candidate) LIKE '%bread%' OR LOWER(category_candidate) LIKE '%bakery%' OR LOWER(category_candidate) LIKE '%pastries%' THEN 'bakery_fresh'
      WHEN LOWER(category_candidate) LIKE '%frozen%' THEN 'frozen_foods'
      WHEN LOWER(category_candidate) LIKE '%canned%' OR LOWER(category_candidate) LIKE '%preserved%' THEN 'canned_jarred'
      WHEN LOWER(category_candidate) LIKE '%snacks%' OR LOWER(category_candidate) LIKE '%chocolate%' OR LOWER(category_candidate) LIKE '%candy%' THEN 'snacks_confectionery'
      WHEN LOWER(category_candidate) LIKE '%spices%' OR LOWER(category_candidate) LIKE '%condiments%' OR LOWER(category_candidate) LIKE '%sauces%' THEN 'spices_condiments'
      WHEN LOWER(category_candidate) LIKE '%cereals%' OR LOWER(category_candidate) LIKE '%grains%' OR LOWER(category_candidate) LIKE '%pasta%' OR LOWER(category_candidate) LIKE '%rice%' THEN 'dry_goods'
      ELSE NULL
    END;
    
    -- If we found a match, return it
    IF category_id IS NOT NULL THEN
      RETURN category_id;
    END IF;
  END LOOP;
  
  -- Fallback to household_other
  SELECT c.category_id INTO category_id 
  FROM inventory.categories c 
  WHERE c.category_code = 'household_other';
  
  RETURN category_id;
END;
$$;


ALTER FUNCTION "inventory"."resolve_category_from_off_data"("off_categories" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."trigger_manual_expiry_cleanup"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    updated_count INTEGER;
    result JSON;
BEGIN
    -- Run the cleanup (must fully qualify function name)
    SELECT inventory.auto_expire_batches() INTO updated_count;
    
    -- Return result as JSON
    SELECT json_build_object(
        'success', true,
        'updated_count', updated_count,
        'executed_at', NOW(),
        'triggered_by', auth.uid()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "inventory"."trigger_manual_expiry_cleanup"() OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."trigger_manual_expiry_cleanup"() IS 'Manually triggers batch expiry cleanup and returns JSON result with count of updated batches.';



CREATE OR REPLACE FUNCTION "inventory"."trigger_todo_states_refresh"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Refresh asynchronously to avoid blocking transactions
  PERFORM pg_notify('refresh_todo_states', NEW.store_id::text);
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "inventory"."trigger_todo_states_refresh"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."user_can_access_store"("store_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'inventory', 'auth', 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = store_uuid
        AND su.user_id = auth.uid()
        AND su.is_active = TRUE
    );
END;
$$;


ALTER FUNCTION "inventory"."user_can_access_store"("store_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."user_can_manage_store"("store_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'inventory', 'auth', 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = store_uuid
        AND su.user_id = auth.uid()
        AND su.role_in_store IN ('owner', 'manager')
        AND su.is_active = TRUE
    );
END;
$$;


ALTER FUNCTION "inventory"."user_can_manage_store"("store_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") RETURNS TABLE("is_valid" boolean, "error_message" "text", "available_quantity" numeric, "requested_quantity" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'inventory', 'business', 'public'
    AS $$
DECLARE
  v_batch RECORD;
  v_total_requested NUMERIC := 0;
  v_action JSONB;
BEGIN
  -- Get batch information
  SELECT b.current_quantity, b.batch_number, p.name as product_name
  INTO v_batch
  FROM batches b
  JOIN products p ON p.product_id = b.product_id
  WHERE b.batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Batch not found'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate total requested quantity
  SELECT SUM((action->>'quantity')::NUMERIC)
  INTO v_total_requested
  FROM jsonb_array_elements(p_actions) AS action;
  
  -- Validate quantity
  IF v_total_requested > v_batch.current_quantity THEN
    RETURN QUERY SELECT 
      false, 
      format('Requested quantity (%s) exceeds available quantity (%s)', v_total_requested, v_batch.current_quantity),
      v_batch.current_quantity,
      v_total_requested;
    RETURN;
  END IF;
  
  -- Validate action types and required fields
  FOR v_action IN SELECT value FROM jsonb_array_elements(p_actions)
  LOOP
    IF v_action->>'action_type' = 'discount' AND v_action->>'discount_percentage' IS NULL THEN
      RETURN QUERY SELECT false, 'Discount actions must include discount_percentage'::TEXT, v_batch.current_quantity, v_total_requested;
      RETURN;
    END IF;
    
    IF v_action->>'action_type' = 'donate' AND v_action->>'donation_recipient_id' IS NULL THEN
      RETURN QUERY SELECT false, 'Donation actions must include donation_recipient_id'::TEXT, v_batch.current_quantity, v_total_requested;
      RETURN;
    END IF;
    
    IF v_action->>'action_type' = 'dispose' AND v_action->>'disposal_reason' IS NULL THEN
      RETURN QUERY SELECT false, 'Disposal actions must include disposal_reason'::TEXT, v_batch.current_quantity, v_total_requested;
      RETURN;
    END IF;
  END LOOP;
  
  -- If we get here, validation passed
  RETURN QUERY SELECT true, 'Validation passed'::TEXT, v_batch.current_quantity, v_total_requested;
END;
$$;


ALTER FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") IS 'Validates whether proposed actions can be performed on a batch';



CREATE OR REPLACE FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying DEFAULT 'employee'::character varying) RETURNS TABLE("success" boolean, "user_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  target_user_id UUID;
  is_store_owner BOOLEAN := FALSE;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Authentication required';
    RETURN;
  END IF;

  -- Check if current user is the store owner
  SELECT (s.owner_id = current_user_id) INTO is_store_owner
  FROM business.stores s 
  WHERE s.store_id = input_store_id;
  
  IF NOT is_store_owner THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Only store owners can add users to stores';
    RETURN;
  END IF;

  -- Find the user by email
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = input_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User with email ' || input_user_email || ' not found';
    RETURN;
  END IF;

  -- Check if user is already in the store
  IF EXISTS (
    SELECT 1 FROM business.store_users su 
    WHERE su.store_id = input_store_id AND su.user_id = target_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, target_user_id, 'User is already in this store';
    RETURN;
  END IF;

  -- Add user to store
  INSERT INTO business.store_users (
    store_id,
    user_id,
    role_in_store,
    assigned_by,
    is_active,
    can_use_pin_auth,
    pin_access_level,
    permissions
  ) VALUES (
    input_store_id,
    target_user_id,
    input_role,
    current_user_id,
    TRUE,
    TRUE, -- Enable PIN by default for employees
    'basic',
    '{"can_scan_products": true, "can_view_basic_inventory": true}'::jsonb
  );

  RETURN QUERY SELECT TRUE, target_user_id, 'Successfully added user to store with role: ' || input_role;
  
END;
$$;


ALTER FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying) IS 'Add an existing Supabase user to a store. Only store owners can use this function.';



CREATE OR REPLACE FUNCTION "public"."add_product_to_store_safely"("p_store_id" "uuid", "p_product_id" "uuid", "p_cost_price" numeric DEFAULT NULL::numeric, "p_selling_price" numeric DEFAULT NULL::numeric, "p_store_sku" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  existing_record UUID;
BEGIN
  -- Check if the product is already linked to this store
  SELECT product_id INTO existing_record
  FROM inventory.store_products 
  WHERE store_id = p_store_id AND product_id = p_product_id;
  
  -- If not exists, insert with proper user attribution
  IF existing_record IS NULL THEN
    INSERT INTO inventory.store_products (
      store_id,
      product_id,
      cost_price,
      selling_price,
      store_sku,
      added_by,
      is_active
    ) VALUES (
      p_store_id,
      p_product_id,
      p_cost_price,
      p_selling_price,
      p_store_sku,
      auth.uid(), -- This ensures RLS policy is satisfied
      true
    );
  ELSE
    -- Update existing record if prices provided
    IF p_cost_price IS NOT NULL OR p_selling_price IS NOT NULL THEN
      UPDATE inventory.store_products 
      SET 
        cost_price = COALESCE(p_cost_price, cost_price),
        selling_price = COALESCE(p_selling_price, selling_price),
        store_sku = COALESCE(p_store_sku, store_sku),
        updated_by = auth.uid(),
        updated_at = NOW()
      WHERE store_id = p_store_id AND product_id = p_product_id;
    END IF;
  END IF;
  
  RETURN p_product_id;
END;
$$;


ALTER FUNCTION "public"."add_product_to_store_safely"("p_store_id" "uuid", "p_product_id" "uuid", "p_cost_price" numeric, "p_selling_price" numeric, "p_store_sku" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_add_test_user"("input_store_id" "uuid", "input_email" "text", "input_full_name" "text", "input_role" character varying DEFAULT 'employee'::character varying) RETURNS TABLE("success" boolean, "user_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  new_user_id UUID;
  is_store_owner BOOLEAN := FALSE;
  generated_password TEXT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Authentication required';
    RETURN;
  END IF;

  -- Check if current user is the store owner
  SELECT (s.owner_id = current_user_id) INTO is_store_owner
  FROM business.stores s 
  WHERE s.store_id = input_store_id;
  
  IF NOT is_store_owner THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Only store owners can add users via admin function';
    RETURN;
  END IF;

  -- Generate a temporary password (user should reset it)
  generated_password := 'TempPass123!' || floor(random() * 1000)::text;

  -- Create the auth user using admin functions
  -- Note: This requires service role permissions, so we'll return instructions instead
  
  -- For now, just create a placeholder and return instructions
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    'Please create user manually: Email=' || input_email || ', then add them to store with role=' || input_role;
  
END;
$$;


ALTER FUNCTION "public"."admin_add_test_user"("input_store_id" "uuid", "input_email" "text", "input_full_name" "text", "input_role" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_function_security"() RETURNS TABLE("schema_name" "text", "function_name" "text", "arguments" "text", "is_security_definer" boolean, "has_search_path" boolean, "security_status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
    SELECT 
        n.nspname::text,
        p.proname::text,
        pg_get_function_identity_arguments(p.oid)::text,
        p.prosecdef,
        CASE 
            WHEN p.proconfig IS NULL THEN false
            WHEN EXISTS(SELECT 1 FROM unnest(p.proconfig) WHERE position('search_path' in unnest) > 0) THEN true
            ELSE false
        END,
        CASE 
            WHEN n.nspname = 'public' AND NOT p.prosecdef AND (
                p.proconfig IS NULL OR NOT EXISTS(
                    SELECT 1 FROM unnest(p.proconfig) 
                    WHERE position('search_path' in unnest) > 0
                )
            ) THEN 'HIGH RISK: Public function without search_path'
            WHEN p.prosecdef AND (
                p.proconfig IS NULL OR NOT EXISTS(
                    SELECT 1 FROM unnest(p.proconfig) 
                    WHERE position('search_path' in unnest) > 0
                )
            ) THEN 'MEDIUM RISK: Security definer without search_path'
            ELSE 'SECURE'
        END::text
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public', 'scoring', 'inventory', 'business')
    AND p.proname NOT LIKE 'pg_%'
    ORDER BY 
        CASE 
            WHEN n.nspname = 'public' AND NOT p.prosecdef AND (
                p.proconfig IS NULL OR NOT EXISTS(
                    SELECT 1 FROM unnest(p.proconfig) 
                    WHERE position('search_path' in unnest) > 0
                )
            ) THEN 1
            WHEN p.prosecdef AND (
                p.proconfig IS NULL OR NOT EXISTS(
                    SELECT 1 FROM unnest(p.proconfig) 
                    WHERE position('search_path' in unnest) > 0
                )
            ) THEN 2
            ELSE 3
        END,
        n.nspname, p.proname;
$$;


ALTER FUNCTION "public"."audit_function_security"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_function_security"() IS 'Security audit function - shows function search_path vulnerabilities. CRITICAL for preventing SQL injection via search_path attacks.';



CREATE OR REPLACE FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  item JSONB;
  result JSONB;
  results JSONB := '[]'::JSONB;
  updated_batch RECORD;
  batch_info RECORD;
  error_occurred BOOLEAN := FALSE;
  error_msg TEXT;
  action_type_val public.action_type;
BEGIN
  -- Validate input
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = p_store_id
      AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  -- Process all items in a single transaction
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      -- Get current batch info before update
      SELECT 
        current_quantity,
        initial_quantity,
        selling_price
      INTO batch_info
      FROM inventory.batches
      WHERE batch_id = (item->>'batch_id')::UUID
        AND store_id = p_store_id;
        
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % does not belong to store', item->>'batch_id';
      END IF;

      -- Cast action_type to the enum type
      action_type_val := COALESCE((item->>'action_type')::public.action_type, 'sold'::public.action_type);

      -- Update batch quantity
      -- Note: available_quantity is GENERATED and will auto-update
      UPDATE inventory.batches
      SET 
        current_quantity = current_quantity - (item->>'quantity')::NUMERIC,
        updated_at = NOW(),
        status = CASE 
          WHEN (current_quantity - (item->>'quantity')::NUMERIC) <= 0 THEN 'depleted'
          ELSE status
        END
      WHERE batch_id = (item->>'batch_id')::UUID
      RETURNING 
        batch_id,
        current_quantity,
        available_quantity,  -- This will be the auto-calculated value
        status
      INTO updated_batch;
      
      -- Record the action in batch_actions table with correct column names and types
      -- Handle required fields based on action type to satisfy check constraint
      INSERT INTO inventory.batch_actions (
        batch_id,
        action_type,
        quantity_affected,
        batch_initial_quantity,
        total_original_value,
        total_recovered_value,
        discount_percentage,        -- Required for 'discount' action
        donation_recipient_id,      -- Optional for 'donate' action (can be NULL for ad-hoc)
        disposal_reason,            -- Required for 'dispose' action
        notes,
        performed_by,
        store_id
      ) VALUES (
        (item->>'batch_id')::UUID,
        action_type_val,
        (item->>'quantity')::NUMERIC,
        batch_info.initial_quantity,
        (item->>'quantity')::NUMERIC * batch_info.selling_price,
        CASE 
          WHEN action_type_val = 'sold'::public.action_type
          THEN (item->>'quantity')::NUMERIC * batch_info.selling_price
          WHEN action_type_val = 'discount'::public.action_type
          THEN (item->>'quantity')::NUMERIC * batch_info.selling_price * 
               (1 - COALESCE((item->>'discount_percentage')::NUMERIC, 0) / 100)
          ELSE 0
        END,
        -- discount_percentage: Required for 'discount', NULL otherwise
        CASE 
          WHEN action_type_val = 'discount'::public.action_type
          THEN COALESCE((item->>'discount_percentage')::NUMERIC, 0)
          ELSE NULL
        END,
        -- donation_recipient_id: Optional for 'donate', can be NULL for ad-hoc recipients
        -- When NULL, recipient name should be included in notes field
        CASE 
          WHEN action_type_val = 'donate'::public.action_type
          THEN (item->>'donation_recipient_id')::UUID  -- Allow NULL - no COALESCE fallback
          ELSE NULL
        END,
        -- disposal_reason: Required for 'dispose', NULL otherwise
        CASE 
          WHEN action_type_val = 'dispose'::public.action_type
          THEN COALESCE((item->>'disposal_reason')::TEXT, 'Expired')
          ELSE NULL
        END,
        (item->>'notes')::TEXT,
        auth.uid(),
        p_store_id
      );
      
      -- Build success result for this item
      result := jsonb_build_object(
        'batch_id', updated_batch.batch_id::TEXT,
        'new_quantity', updated_batch.current_quantity,
        'available_quantity', updated_batch.available_quantity,
        'status', updated_batch.status,
        'success', true,
        'error_message', NULL
      );
      
      results := results || result;

    EXCEPTION WHEN OTHERS THEN
      -- Handle individual item errors without failing entire batch
      error_occurred := TRUE;
      error_msg := SQLERRM;
      
      result := jsonb_build_object(
        'batch_id', (item->>'batch_id')::TEXT,
        'new_quantity', NULL,
        'available_quantity', NULL,
        'status', NULL,
        'success', false,
        'error_message', error_msg
      );
      
      results := results || result;
    END;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', NOT error_occurred,
    'processed_count', jsonb_array_length(results),
    'store_id', p_store_id,
    'timestamp', NOW(),
    'results', results
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details for complete failure
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'processed_count', 0,
      'results', '[]'::JSONB
    );
END;
$$;


ALTER FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") IS 'Atomically updates multiple batch quantities in a single transaction. 
Used for high-performance checkout operations. Uses search_path = '''' per Supabase security best practices.
Note: available_quantity is a GENERATED column and updates automatically based on current_quantity - reserved_quantity.

Valid action_type values and their required fields:
- sold: No extra fields required
- discount: Requires discount_percentage (defaults to 0 if not provided)
- donate: Optional donation_recipient_id (can be NULL for ad-hoc donations - recipient name stored in notes)
- dispose: Requires disposal_reason (defaults to "Expired" if not provided)
- maintain, ignored, donate_prepared: No extra fields required

Input format: 
  - p_items: [{
      batch_id: UUID, 
      quantity: number, 
      action_type?: string,
      action_reason?: string,
      notes?: string,
      discount_percentage?: number,
      donation_recipient_id?: UUID | null,  // Can be NULL for ad-hoc recipients
      disposal_reason?: string
    }]
  - p_store_id: UUID of the store
Returns: {
  success: boolean,
  processed_count: number,
  results: [{batch_id, new_quantity, available_quantity, status, success, error_message}]
}';



CREATE OR REPLACE FUNCTION "public"."bulk_csv_import"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") RETURNS TABLE("processed_count" integer, "error_messages" "text"[], "product_ids_result" "uuid"[], "batch_ids_result" "uuid"[])
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  csv_item JSONB;
  product_id UUID;
  store_product_id UUID;
  batch_id UUID;
  processed_count INTEGER := 0;
  error_messages TEXT[] := '{}';
  product_ids_result UUID[] := '{}';
  batch_ids_result UUID[] := '{}';
BEGIN
  -- Process each CSV item in a single transaction
  FOR csv_item IN SELECT * FROM jsonb_array_elements(p_csv_data)
  LOOP
    BEGIN
      -- 1. Insert or get global product
      INSERT INTO inventory.products (
        sku, name, brand, category, unit_type,
        typical_shelf_life_days, base_cost_price, base_selling_price, created_by
      ) VALUES (
        csv_item->>'SKU',
        csv_item->>'Product_Name',
        COALESCE(csv_item->>'Brand', 'Unknown'),
        COALESCE(csv_item->>'Category', 'dry_goods'),
        COALESCE(csv_item->>'Unit_Type', 'units'),
        30,
        COALESCE((csv_item->>'Cost_Price')::DECIMAL, 0),
        COALESCE((csv_item->>'Selling_Price')::DECIMAL, 0),
        p_user_id
      )
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        updated_by = p_user_id,
        updated_at = NOW()
      RETURNING product_id INTO product_id;

      -- 2. Insert or get store product association
      INSERT INTO inventory.store_products (
        store_id, product_id, selling_price, cost_price, is_active, added_by
      ) VALUES (
        p_store_id, product_id,
        COALESCE((csv_item->>'Selling_Price')::DECIMAL, 0),
        COALESCE((csv_item->>'Cost_Price')::DECIMAL, 0),
        true, p_user_id
      )
      ON CONFLICT (store_id, product_id) DO UPDATE SET
        selling_price = EXCLUDED.selling_price,
        cost_price = EXCLUDED.cost_price,
        updated_by = p_user_id,
        updated_at = NOW()
      RETURNING store_product_id INTO store_product_id;

      -- 3. Create inventory batch
      INSERT INTO inventory.batches (
        store_id, product_id, batch_number, initial_quantity, current_quantity,
        expiry_date, manufacture_date, location_code, batch_source, status, created_by
      ) VALUES (
        p_store_id, product_id,
        CONCAT(LEFT(p_store_id::TEXT, 8), '_', csv_item->>'SKU', '_', EXTRACT(EPOCH FROM NOW())::BIGINT),
        (csv_item->>'Quantity')::INTEGER,
        (csv_item->>'Quantity')::INTEGER,
        (csv_item->>'Expiry_Date')::DATE,
        COALESCE((csv_item->>'Manufacture_Date')::DATE, (csv_item->>'Expiry_Date')::DATE - INTERVAL '30 days'),
        COALESCE(csv_item->>'Location', 'MAIN'),
        'csv_import', 'active', p_user_id
      )
      RETURNING batch_id INTO batch_id;

      processed_count := processed_count + 1;
      product_ids_result := array_append(product_ids_result, product_id);
      batch_ids_result := array_append(batch_ids_result, batch_id);

    EXCEPTION WHEN OTHERS THEN
      error_messages := array_append(error_messages, 
        CONCAT('SKU ', csv_item->>'SKU', ': ', SQLERRM));
    END;
  END LOOP;

  RETURN QUERY SELECT processed_count, error_messages, product_ids_result, batch_ids_result;
END;
$$;


ALTER FUNCTION "public"."bulk_csv_import"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_insert_csv_batches"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") RETURNS TABLE("inserted_count" integer, "batch_ids" "uuid"[], "processing_time_ms" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  inserted_ids UUID[];
BEGIN
  start_time := clock_timestamp();
  
  WITH batch_inserts AS (
    INSERT INTO inventory.batches (
      product_id, batch_number, supplier, expiry_date, 
      initial_quantity, current_quantity, cost_price, selling_price,
      location_code, status, store_id, batch_source, 
      scanned_barcode, verification_status, created_by
    )
    SELECT 
      (item->>'product_id')::UUID,
      item->>'batch_number',
      item->>'supplier',
      (item->>'expiry_date')::DATE,
      (item->>'initial_quantity')::NUMERIC,
      (item->>'current_quantity')::NUMERIC,
      (item->>'cost_price')::NUMERIC,
      (item->>'selling_price')::NUMERIC,
      item->>'location_code',
      COALESCE(item->>'status', 'active'),
      p_store_id,
      'csv_import',
      item->>'scanned_barcode',
      COALESCE(item->>'verification_status', 'verified'),
      p_created_by
    FROM jsonb_array_elements(p_data) as item
    RETURNING batch_id
  )
  SELECT array_agg(batch_id) INTO inserted_ids FROM batch_inserts;
  
  end_time := clock_timestamp();
  
  RETURN QUERY
  SELECT 
    array_length(inserted_ids, 1) as inserted_count,
    inserted_ids as batch_ids,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER as processing_time_ms;
END;
$$;


ALTER FUNCTION "public"."bulk_insert_csv_batches"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_insert_csv_batches_with_store_link"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") RETURNS TABLE("inserted_count" integer, "batch_ids" "uuid"[], "processing_time_ms" integer, "store_products_linked" integer, "products_created" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  inserted_ids UUID[];
  products_linked INTEGER := 0;
  products_created INTEGER := 0;
  batch_item RECORD;
  resolved_product_id UUID;
  resolved_category_id UUID;
  batch_data_with_products JSONB := '[]'::JSONB;
  batch_counter INTEGER := 1;
  clean_barcode TEXT;
BEGIN
  start_time := clock_timestamp();
  
  FOR batch_item IN SELECT * FROM jsonb_array_elements(p_data) LOOP
    resolved_product_id := NULL;
    resolved_category_id := NULL;
    
    -- Clean barcode: convert empty strings to NULL, keep valid barcodes
    clean_barcode := CASE 
      WHEN batch_item.value->>'barcode' IS NULL OR 
           trim(batch_item.value->>'barcode') = '' THEN NULL
      ELSE trim(batch_item.value->>'barcode')
    END;
    
    -- Try to find existing product by SKU first
    IF batch_item.value->>'sku' IS NOT NULL AND batch_item.value->>'sku' != '' THEN
      SELECT product_id INTO resolved_product_id
      FROM inventory.products 
      WHERE sku = batch_item.value->>'sku';
    END IF;
    
    -- Try to find by barcode if SKU didn't work and barcode is valid
    IF resolved_product_id IS NULL AND clean_barcode IS NOT NULL THEN
      SELECT product_id INTO resolved_product_id
      FROM inventory.products 
      WHERE barcode = clean_barcode;
    END IF;
    
    -- Try to find by name if neither SKU nor barcode worked
    IF resolved_product_id IS NULL AND batch_item.value->>'product_name' IS NOT NULL AND batch_item.value->>'product_name' != '' THEN
      SELECT product_id INTO resolved_product_id
      FROM inventory.products 
      WHERE LOWER(trim(name)) = LOWER(trim(batch_item.value->>'product_name'));
    END IF;
    
    -- Resolve category using the new standardized system
    IF batch_item.value->>'category' IS NOT NULL THEN
      resolved_category_id := inventory.map_legacy_category(batch_item.value->>'category');
    ELSE
      -- Default to household_other if no category provided
      SELECT category_id INTO resolved_category_id 
      FROM inventory.categories 
      WHERE category_code = 'household_other';
    END IF;
    
    -- Create new product if not found
    IF resolved_product_id IS NULL THEN
      INSERT INTO inventory.products (
        sku, name, brand, category_id, unit_type,
        typical_shelf_life_days, base_cost_price, base_selling_price,
        created_by, is_verified, barcode
      ) VALUES (
        COALESCE(batch_item.value->>'sku', 'AUTO-' || gen_random_uuid()::text),
        batch_item.value->>'product_name',
        batch_item.value->>'brand',
        resolved_category_id,
        COALESCE(batch_item.value->>'unit_type', 'units'),
        COALESCE(
          (batch_item.value->>'typical_shelf_life_days')::INTEGER, 
          (SELECT typical_shelf_life_days FROM inventory.categories WHERE category_id = resolved_category_id),
          30
        ),
        COALESCE((batch_item.value->>'cost_price')::NUMERIC, 0),
        COALESCE((batch_item.value->>'selling_price')::NUMERIC, 0),
        p_created_by,
        true,
        clean_barcode  -- Use cleaned barcode (NULL or valid string)
      ) RETURNING product_id INTO resolved_product_id;
      
      products_created := products_created + 1;
    END IF;
    
    -- Ensure product is linked to store
    PERFORM public.add_product_to_store_safely(
      p_store_id,
      resolved_product_id,
      (batch_item.value->>'cost_price')::NUMERIC,
      (batch_item.value->>'selling_price')::NUMERIC,
      batch_item.value->>'sku'
    );
    products_linked := products_linked + 1;
    
    -- Add the resolved product_id to batch data with auto-generated batch_number
    batch_data_with_products := batch_data_with_products || jsonb_build_object(
      'product_id', resolved_product_id,
      'batch_number', COALESCE(
        batch_item.value->>'batch_number', 
        'CSV-' || to_char(start_time, 'YYYYMMDD-HH24MI') || '-' || lpad(batch_counter::text, 3, '0')
      ),
      'supplier', batch_item.value->>'supplier',
      'expiry_date', batch_item.value->>'expiry_date',
      'manufacture_date', batch_item.value->>'manufacture_date',
      'initial_quantity', batch_item.value->>'quantity',
      'current_quantity', batch_item.value->>'quantity',
      'cost_price', batch_item.value->>'cost_price',
      'selling_price', batch_item.value->>'selling_price',
      'location_code', COALESCE(batch_item.value->>'location', 'MAIN'),
      'scanned_barcode', clean_barcode,  -- Use cleaned barcode for batches too
      'verification_status', 'verified'
    );
    
    batch_counter := batch_counter + 1;
  END LOOP;
  
  -- Insert all batches in a single operation
  WITH batch_inserts AS (
    INSERT INTO inventory.batches (
      product_id, batch_number, supplier, expiry_date, manufacture_date,
      initial_quantity, current_quantity, cost_price, selling_price,
      location_code, status, store_id, batch_source, 
      scanned_barcode, verification_status, created_by
    )
    SELECT 
      (item->>'product_id')::UUID,
      item->>'batch_number',
      item->>'supplier',
      (item->>'expiry_date')::DATE,
      (item->>'manufacture_date')::DATE,
      (item->>'initial_quantity')::NUMERIC,
      (item->>'current_quantity')::NUMERIC,
      (item->>'cost_price')::NUMERIC,
      (item->>'selling_price')::NUMERIC,
      item->>'location_code',
      'active',
      p_store_id,
      'csv_import',
      CASE 
        WHEN item->>'scanned_barcode' = '' THEN NULL 
        ELSE item->>'scanned_barcode'
      END,  -- Clean barcode in batch insert too
      COALESCE(item->>'verification_status', 'verified'),
      p_created_by
    FROM jsonb_array_elements(batch_data_with_products) as item
    RETURNING batch_id
  )
  SELECT array_agg(batch_id) INTO inserted_ids FROM batch_inserts;
  
  end_time := clock_timestamp();
  
  RETURN QUERY
  SELECT 
    array_length(inserted_ids, 1) as inserted_count,
    inserted_ids as batch_ids,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER as processing_time_ms,
    products_linked as store_products_linked,
    products_created as products_created;
END;
$$;


ALTER FUNCTION "public"."bulk_insert_csv_batches_with_store_link"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_bulk_duplicates"("p_barcodes" "text"[], "p_expiry_dates" "date"[], "p_store_id" "uuid") RETURNS TABLE("barcode" "text", "exp_date" "date", "is_duplicate" boolean, "existing_batch_id" "uuid")
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  WITH input_data AS (
    SELECT 
      unnest(p_barcodes) as barcode,
      unnest(p_expiry_dates) as exp_date,
      row_number() OVER () as input_order
  )
  SELECT 
    id.barcode,
    id.exp_date,
    (b.batch_id IS NOT NULL) as is_duplicate,
    b.batch_id as existing_batch_id
  FROM input_data id
  LEFT JOIN inventory.batches b ON (
    b.store_id = p_store_id AND
    b.scanned_barcode = id.barcode AND 
    b.expiry_date = id.exp_date AND
    b.status = 'active'
  )
  ORDER BY id.input_order;
$$;


ALTER FUNCTION "public"."check_bulk_duplicates"("p_barcodes" "text"[], "p_expiry_dates" "date"[], "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_existing_store_products"("pairs" "jsonb") RETURNS TABLE("store_id" "uuid", "product_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT sp.store_id, sp.product_id
  FROM inventory.store_products sp
  INNER JOIN (
    SELECT 
      (pair->>'store_id')::UUID as store_id,
      (pair->>'product_id')::UUID as product_id
    FROM jsonb_array_elements(pairs) as pair
  ) input ON sp.store_id = input.store_id AND sp.product_id = input.product_id;
END;
$$;


ALTER FUNCTION "public"."check_existing_store_products"("pairs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_pin_lock_status"("p_username" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT 
        (au.raw_user_meta_data->>'locked_until')::TIMESTAMP as locked_until,
        COALESCE((au.raw_user_meta_data->>'failed_pin_attempts')::INT, 0) as failed_attempts
    INTO user_record
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'username') = p_username
    AND au.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'is_locked', (user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW()),
        'locked_until', user_record.locked_until,
        'failed_attempts', user_record.failed_attempts
    );
END;
$$;


ALTER FUNCTION "public"."check_pin_lock_status"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_security_warnings"() RETURNS TABLE("warning_type" "text", "item" "text", "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  -- Check RLS status
  SELECT 
    'RLS_DISABLED'::text as warning_type,
    (schemaname || '.' || tablename)::text as item,
    CASE 
      WHEN rowsecurity THEN '✅ RLS_ENABLED'::text
      ELSE '❌ RLS_DISABLED'::text
    END as status
  FROM pg_tables 
  WHERE schemaname IN ('public', 'user_mgmt', 'business')
  
  UNION ALL
  
  -- Check function search_path
  SELECT 
    'FUNCTION_SEARCH_PATH'::text as warning_type,
    (n.nspname || '.' || p.proname)::text as item,
    CASE 
      WHEN array_to_string(proconfig, ',') LIKE '%search_path%' THEN '✅ SEARCH_PATH_SET'::text
      ELSE '⚠️ SEARCH_PATH_MISSING'::text
    END as status
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'user_mgmt', 'business')
    AND p.prokind = 'f'
    AND prosecdef = true  -- Only check SECURITY DEFINER functions
  
  ORDER BY warning_type, item;
$$;


ALTER FUNCTION "public"."check_security_warnings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_store_access"("user_id_param" "uuid", "store_id_param" "uuid") RETURNS TABLE("user_id" "uuid", "role_in_store" character varying, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.user_id,
    su.role_in_store,
    su.is_active
  FROM business.store_users su
  WHERE su.user_id = user_id_param 
    AND su.store_id = store_id_param
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."check_store_access"("user_id_param" "uuid", "store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_exists_by_email"("p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_user_info JSONB;
BEGIN
    -- Check if user exists and get basic info
    SELECT jsonb_build_object(
        'exists', true,
        'user_id', u.id,
        'email', u.email,
        'full_name', u.raw_user_meta_data->>'full_name',
        'username', u.raw_user_meta_data->>'username',
        'created_at', u.created_at
    ) INTO v_user_info
    FROM auth.users u
    WHERE u.email = p_email;
    
    IF v_user_info IS NULL THEN
        v_user_info := jsonb_build_object('exists', false);
    END IF;
    
    RETURN v_user_info;
END;
$$;


ALTER FUNCTION "public"."check_user_exists_by_email"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_user_exists_by_email"("p_email" "text") IS 'Check if a user exists by email and return basic information';



CREATE OR REPLACE FUNCTION "public"."check_username_availability"("p_username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'user_mgmt'
    AS $$
BEGIN
  -- Input validation
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) = 0 THEN
    RETURN false; -- Invalid usernames are not available
  END IF;
  
  -- Normalize username (lowercase, trimmed)
  p_username := LOWER(TRIM(p_username));
  
  -- Check minimum length (adjust as needed)
  IF LENGTH(p_username) < 3 THEN
    RETURN false;
  END IF;
  
  -- Check if username exists in auth.users.raw_user_meta_data
  IF EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE raw_user_meta_data->>'username' = p_username
  ) THEN
    RETURN false; -- Username is taken
  END IF;
  
  -- Also check user_mgmt.users table if it still contains usernames
  IF EXISTS (
    SELECT 1 
    FROM user_mgmt.users 
    WHERE username = p_username
  ) THEN
    RETURN false; -- Username is taken
  END IF;
  
  -- Username is available
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_username_availability"("p_username" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_username_availability"("p_username" "text") IS 'Checks if a username is available for use. Returns true if available, false if taken. Includes validation for minimum length and format.';



CREATE OR REPLACE FUNCTION "public"."cleanup_backup_table"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  backup_count integer;
  auth_count integer;
  result_msg text;
BEGIN
  -- Count records in backup table
  SELECT COUNT(*) INTO backup_count 
  FROM user_mgmt.users_backup_before_cleanup;
  
  -- Count records in auth.users
  SELECT COUNT(*) INTO auth_count 
  FROM auth.users;
  
  -- Verify migration was successful before dropping
  IF backup_count > 0 AND auth_count >= backup_count THEN
    -- Drop the backup table and its policy
    DROP POLICY IF EXISTS "backup_table_superuser_only" ON user_mgmt.users_backup_before_cleanup;
    DROP TABLE user_mgmt.users_backup_before_cleanup CASCADE;
    
    result_msg := format(
      '✅ SUCCESS: Backup table dropped safely. Verified %s records in backup, %s in auth.users', 
      backup_count, 
      auth_count
    );
  ELSE
    result_msg := format(
      '⚠️ WARNING: Backup table NOT dropped. Backup: %s records, Auth: %s records. Manual verification needed.', 
      backup_count, 
      auth_count
    );
  END IF;
  
  RETURN result_msg;
END;
$$;


ALTER FUNCTION "public"."cleanup_backup_table"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_duplicate_batches"() RETURNS TABLE("iteration" integer, "deleted_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_iteration INT := 0;
  v_deleted_count BIGINT;
  v_batch_ids UUID[];
BEGIN
  LOOP
    -- Get next batch of 100 duplicate IDs
    SELECT ARRAY_AGG(batch_id) INTO v_batch_ids
    FROM (
      SELECT batch_id
      FROM (
        SELECT 
          batch_id,
          ROW_NUMBER() OVER (
            PARTITION BY store_id, batch_number 
            ORDER BY created_at
          ) as rn
        FROM inventory.batches
        WHERE batch_source = 'csv_import'
      ) ranked
      WHERE rn > 1
      LIMIT 100
    ) to_delete;
    
    -- Exit if no more duplicates
    EXIT WHEN v_batch_ids IS NULL OR array_length(v_batch_ids, 1) IS NULL;
    
    -- Delete this batch
    DELETE FROM inventory.batches
    WHERE batch_id = ANY(v_batch_ids);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    v_iteration := v_iteration + 1;
    iteration := v_iteration;
    deleted_count := v_deleted_count;
    
    RETURN NEXT;
    
    -- Safety check - stop after 100 iterations (10,000 records)
    EXIT WHEN v_iteration >= 100;
  END LOOP;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."cleanup_duplicate_batches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
    current_user_id UUID;
    is_authorized BOOLEAN := false;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;

    -- Check if current user can manage users in this store (fully qualified table references)
    SELECT (
        -- Store owner
        EXISTS(SELECT 1 FROM business.stores WHERE store_id = p_store_id AND owner_id = current_user_id)
        OR
        -- Store manager
        EXISTS(SELECT 1 FROM business.store_users 
               WHERE store_id = p_store_id 
               AND user_id = current_user_id 
               AND role_in_store IN ('owner', 'manager')
               AND is_active = true)
    ) INTO is_authorized;

    IF NOT is_authorized THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Permission denied: Cannot create users in this store'
        );
    END IF;

    -- Validate inputs (REMOVED PIN LENGTH RESTRICTION)
    IF p_email IS NULL OR p_email = '' THEN
        RETURN json_build_object('success', false, 'error', 'Email is required');
    END IF;

    IF p_username IS NULL OR p_username = '' THEN
        RETURN json_build_object('success', false, 'error', 'Username is required');
    END IF;

    -- Updated PIN validation: Allow any length, just check it's not empty and only contains digits
    IF p_pin IS NULL OR p_pin = '' OR p_pin !~ '^[0-9]+$' THEN
        RETURN json_build_object('success', false, 'error', 'PIN must contain only digits and cannot be empty');
    END IF;

    -- Check for duplicate username globally
    IF EXISTS(
        SELECT 1 FROM auth.users 
        WHERE (raw_user_meta_data->>'username') = p_username
        AND deleted_at IS NULL
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Username already exists');
    END IF;

    -- ⚠️ NOTE: This function validates inputs but returns instructions for the frontend
    -- The actual user creation must be done via Admin API from the frontend
    -- because we can't call the Admin API from inside a database function
    
    RETURN json_build_object(
        'success', true,
        'needs_admin_api', true,
        'username', p_username,
        'email', p_email,
        'pin', p_pin,
        'message', 'Validation passed - ready for Admin API creation'
    );
END;
$_$;


ALTER FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") IS 'Creates employee with FLEXIBLE PIN length - accepts any length numeric PIN.';



CREATE OR REPLACE FUNCTION "public"."create_user_preferences_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO user_mgmt.user_preferences (user_id, preferences, primary_store_id)
    VALUES (NEW.id, '{}'::jsonb, NULL);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user preferences for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_preferences_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_next_duplicate_batch"("batch_size" integer DEFAULT 50) RETURNS TABLE("deleted_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_ids UUID[];
BEGIN
  -- Get IDs to delete from next N duplicate groups
  WITH duplicate_groups AS (
    SELECT 
      store_id,
      batch_number,
      ARRAY_AGG(batch_id ORDER BY created_at) as batch_ids
    FROM inventory.batches
    WHERE batch_source = 'csv_import'
    GROUP BY store_id, batch_number
    HAVING COUNT(*) > 1
    LIMIT batch_size
  ),
  ids_to_delete AS (
    SELECT UNNEST(batch_ids[2:]) as batch_id
    FROM duplicate_groups
  )
  SELECT ARRAY_AGG(batch_id) INTO v_ids
  FROM ids_to_delete;
  
  -- Delete them
  IF v_ids IS NOT NULL THEN
    DELETE FROM inventory.batches
    WHERE batch_id = ANY(v_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  ELSE
    deleted_count := 0;
  END IF;
  
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."delete_next_duplicate_batch"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disable_batch_automation"() RETURNS "text"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT cron.unschedule('batch-status-automation');
  SELECT 'Batch status automation disabled'::TEXT;
$$;


ALTER FUNCTION "public"."disable_batch_automation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enable_batch_automation"() RETURNS "text"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT cron.schedule(
    'batch-status-automation',
    '0 1 * * *',
    'SELECT update_expired_batch_statuses();'
  );
  SELECT 'Batch status automation enabled - runs daily at 1:00 AM UTC'::TEXT;
$$;


ALTER FUNCTION "public"."enable_batch_automation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_bulk_action"("p_batch_ids" "uuid"[], "p_action_type" "text", "p_action_params" "jsonb", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch_id UUID;
  v_result jsonb;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_results jsonb[] := '{}';
BEGIN
  -- Process each batch ID
  FOREACH v_batch_id IN ARRAY p_batch_ids
  LOOP
    BEGIN
      -- Execute the appropriate action based on type
      CASE p_action_type
        WHEN 'discount' THEN
          SELECT public.execute_discount_action(
            v_batch_id,
            (p_action_params->>'quantity')::numeric,
            (p_action_params->>'discount_percentage')::numeric,
            p_user_id,
            p_action_params->>'notes'
          ) INTO v_result;
        WHEN 'donate' THEN
          SELECT public.execute_donate_action(
            v_batch_id,
            (p_action_params->>'quantity')::numeric,
            (p_action_params->>'recipient_id')::uuid,
            p_user_id,
            p_action_params->>'notes'
          ) INTO v_result;
        WHEN 'dispose' THEN
          SELECT public.execute_dispose_action(
            v_batch_id,
            (p_action_params->>'quantity')::numeric,
            p_action_params->>'reason',
            p_user_id,
            p_action_params->>'notes'
          ) INTO v_result;
        WHEN 'sold' THEN
          SELECT public.execute_sold_action(
            v_batch_id,
            (p_action_params->>'quantity')::numeric,
            p_user_id,
            p_action_params->>'notes'
          ) INTO v_result;
        ELSE
          v_result := jsonb_build_object('success', false, 'error', 'Unknown action type');
      END CASE;
      
      v_results := v_results || v_result;
      
      IF (v_result->>'success')::boolean THEN
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_results := v_results || jsonb_build_object(
        'success', false, 
        'batch_id', v_batch_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'total_processed', array_length(p_batch_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$;


ALTER FUNCTION "public"."execute_bulk_action"("p_batch_ids" "uuid"[], "p_action_type" "text", "p_action_params" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  v_store_id UUID;
  v_batch_record RECORD;
  v_action_id UUID;
  v_original_price NUMERIC;
  v_discounted_price NUMERIC;
  v_original_value NUMERIC;
  v_recovered_value NUMERIC;
  v_result JSONB;
BEGIN
  -- Get batch details with lock
  SELECT 
    b.batch_id,
    b.store_id,
    b.current_quantity,
    b.selling_price,
    b.cost_price,
    b.initial_quantity
  INTO v_batch_record
  FROM inventory.batches b
  WHERE b.batch_id = p_batch_id
  FOR UPDATE;

  -- Validation
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF p_quantity_affected > v_batch_record.current_quantity THEN
    RAISE EXCEPTION 'Cannot affect % units when only % available', 
      p_quantity_affected, v_batch_record.current_quantity;
  END IF;

  IF p_discount_percentage < 0 OR p_discount_percentage > 100 THEN
    RAISE EXCEPTION 'Discount percentage must be between 0 and 100';
  END IF;

  -- Calculate prices
  v_original_price := v_batch_record.selling_price;
  v_discounted_price := v_original_price * (1 - p_discount_percentage / 100.0);
  v_original_value := p_quantity_affected * v_original_price;
  v_recovered_value := p_quantity_affected * v_discounted_price;

  -- CRITICAL FIX: Update the batch selling_price when discount is applied
  -- This ensures the materialized view shows the correct discounted price
  UPDATE inventory.batches
  SET 
    selling_price = v_discounted_price,
    updated_at = NOW()
  WHERE batch_id = p_batch_id;

  -- Record the action in batch_actions for history
  INSERT INTO inventory.batch_actions (
    batch_id,
    store_id,
    action_type,
    discount_percentage,
    quantity_affected,
    performed_by,
    notes,
    total_original_value,
    total_recovered_value,
    batch_initial_quantity
  ) VALUES (
    p_batch_id,
    v_batch_record.store_id,
    'discount',
    p_discount_percentage,
    p_quantity_affected,
    p_user_id,
    p_notes,
    v_original_value,
    v_recovered_value,
    v_batch_record.initial_quantity
  )
  RETURNING entry_id INTO v_action_id;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'action_id', v_action_id,
    'batch_id', p_batch_id,
    'original_price', v_original_price,
    'discounted_price', v_discounted_price,
    'quantity_affected', p_quantity_affected,
    'remaining_quantity', v_batch_record.current_quantity,
    'original_value', v_original_value,
    'recovered_value', v_recovered_value
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text") IS 'Applies a discount to a batch and updates the selling_price in the batches table. 
Price history is preserved in batch_actions table.';



CREATE OR REPLACE FUNCTION "public"."execute_dismiss_action"("p_batch_id" "uuid", "p_dismissal_reason" "text", "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
BEGIN
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, quantity_affected,
    total_original_value, total_recovered_value,
    dismissal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'ignored'::public.action_type, 0,
    0, 0,
    p_dismissal_reason, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'message', 'Recommendation dismissed'
  );
END;
$$;


ALTER FUNCTION "public"."execute_dismiss_action"("p_batch_id" "uuid", "p_dismissal_reason" "text", "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_dispose_action"("p_batch_id" "uuid", "p_quantity_disposed" numeric, "p_disposal_reason" "text", "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_loss_value DECIMAL;
BEGIN
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  
  IF p_quantity_disposed > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;
  
  v_loss_value := p_quantity_disposed * COALESCE(v_batch.cost_price, v_batch.selling_price);
  
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, quantity_affected,
    total_original_value, total_recovered_value,
    disposal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'dispose'::public.action_type, p_quantity_disposed,
    v_loss_value, 0,
    p_disposal_reason, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;
  
  -- Update batch: reduce quantity, mark as expired if all disposed
  UPDATE inventory.batches 
  SET current_quantity = current_quantity - p_quantity_disposed,
      status = CASE 
        WHEN current_quantity - p_quantity_disposed <= 0 THEN 'expired'
        ELSE status 
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_disposed,
    'total_loss_value', v_loss_value
  );
END;
$$;


ALTER FUNCTION "public"."execute_dispose_action"("p_batch_id" "uuid", "p_quantity_disposed" numeric, "p_disposal_reason" "text", "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_donate_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_donation_recipient_id" "uuid", "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_total_value DECIMAL;
BEGIN
  SELECT * INTO v_batch FROM inventory.batches WHERE batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  
  IF p_quantity_affected > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;
  
  v_total_value := p_quantity_affected * COALESCE(v_batch.cost_price, v_batch.selling_price);
  
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, quantity_affected,
    total_original_value, total_recovered_value,
    donation_recipient_id, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type, p_quantity_affected,
    v_total_value, 0,
    p_donation_recipient_id, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;
  
  -- Update batch: reduce quantity, set to donated if all donated
  UPDATE inventory.batches 
  SET current_quantity = current_quantity - p_quantity_affected,
      status = CASE 
        WHEN current_quantity - p_quantity_affected <= 0 THEN 'donated'
        ELSE status 
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_affected,
    'total_value_donated', v_total_value
  );
END;
$$;


ALTER FUNCTION "public"."execute_donate_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_donation_recipient_id" "uuid", "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_donate_prepared_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch_record RECORD;
  v_action_id UUID;
  v_result JSON;
BEGIN
  -- Validate batch exists and get details
  SELECT 
    batch_id,
    current_quantity,
    selling_price,
    store_id
  INTO v_batch_record
  FROM inventory.batches 
  WHERE batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Batch not found'
    );
  END IF;
  
  -- Validate quantity
  IF p_quantity_affected <= 0 OR p_quantity_affected > v_batch_record.current_quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid quantity: must be between 1 and ' || v_batch_record.current_quantity
    );
  END IF;
  
  -- Generate action ID
  v_action_id := gen_random_uuid();
  
  -- Insert the action record
  INSERT INTO inventory.batch_actions (
    entry_id,
    batch_id,
    action_type,
    quantity_affected,
    performed_at,
    performed_by,
    notes,
    total_original_value,
    total_recovered_value,
    batch_initial_quantity
  ) VALUES (
    v_action_id,
    p_batch_id,
    'donate_prepared'::action_type,
    p_quantity_affected,
    NOW(),
    p_user_id,
    p_notes,
    p_quantity_affected * v_batch_record.selling_price,
    0, -- No revenue recovered for donation prep
    v_batch_record.current_quantity
  );
  
  -- Note: We don't reduce current_quantity yet since item is just prepared, not donated
  
  -- Build success response
  v_result := json_build_object(
    'success', true,
    'action_id', v_action_id,
    'remaining_quantity', v_batch_record.current_quantity,
    'total_value_prepared', p_quantity_affected * v_batch_record.selling_price,
    'message', 'Items prepared for donation'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to prepare items for donation: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."execute_donate_prepared_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_ignore_action"("p_batch_id" "uuid", "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_store_id UUID;
  v_batch_quantity NUMERIC;
  v_action_id UUID;
  v_result JSON;
BEGIN
  -- Get batch info and validate
  SELECT store_id, current_quantity
  INTO v_store_id, v_batch_quantity
  FROM inventory.batches
  WHERE batch_id = p_batch_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Batch not found or inactive'
    );
  END IF;

  -- Insert the ignore action
  INSERT INTO inventory.batch_actions (
    batch_id,
    action_type,
    quantity_affected,
    total_original_value,
    total_recovered_value,
    performed_by,
    performed_at,
    notes,
    batch_initial_quantity,
    store_id
  ) VALUES (
    p_batch_id,
    'ignored',
    0, -- Ignore doesn't affect quantity
    0, -- No financial impact
    0, -- No recovery
    p_user_id,
    NOW(),
    p_notes,
    v_batch_quantity,
    v_store_id
  ) RETURNING entry_id INTO v_action_id;

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'action_id', v_action_id,
    'message', 'Item successfully ignored',
    'remaining_quantity', v_batch_quantity -- Quantity unchanged
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to ignore item: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."execute_ignore_action"("p_batch_id" "uuid", "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sold_action"("p_batch_id" "uuid", "p_quantity_sold" numeric, "p_user_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_revenue_recovered DECIMAL;
BEGIN
  -- Get current batch state
  SELECT * INTO v_batch 
  FROM inventory.batches 
  WHERE batch_id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  
  -- Validate quantity
  IF p_quantity_sold > v_batch.current_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity');
  END IF;
  
  v_revenue_recovered := p_quantity_sold * v_batch.selling_price;
  
  -- Record the action - USE FULLY QUALIFIED public.action_type
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, quantity_affected,
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type, p_quantity_sold,
    v_revenue_recovered, v_revenue_recovered,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;
  
  -- Update inventory
  UPDATE inventory.batches 
  SET current_quantity = current_quantity - p_quantity_sold,
      status = CASE 
        WHEN current_quantity - p_quantity_sold <= 0 THEN 'sold_out'
        ELSE status 
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
  
  -- Mark as resolved in scoring (if scoring table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores 
    SET recommendation = CASE
          WHEN v_batch.current_quantity - p_quantity_sold <= 0 THEN 'sold_full_price'
          ELSE 'partial_sold'
        END,
        urgency_level = 'low',
        calculated_at = NOW()
    WHERE batch_id = p_batch_id;
  END IF;
  
  -- Track for analytics (if analytics table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'sold',
      v_batch.selling_price, v_batch.selling_price, p_user_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity - p_quantity_sold,
    'revenue_recovered', v_revenue_recovered
  );
END;
$$;


ALTER FUNCTION "public"."execute_sold_action"("p_batch_id" "uuid", "p_quantity_sold" numeric, "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fast_csv_import_skip_duplicates"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  duplicate_detection_start TIMESTAMP := clock_timestamp();
  database_operations_start TIMESTAMP;
  processed_count INTEGER := 0;
  skipped_count INTEGER := 0;
  errors TEXT[] := '{}';
  duplicates_skipped JSONB[] := '{}';
  duplicate_detection_ms INTEGER;
  database_operations_ms INTEGER;
BEGIN
  -- Validate store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users 
    WHERE store_id = p_store_id 
    AND user_id = p_user_id 
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied to store',
      'processed', 0,
      'skipped', 0
    );
  END IF;

  database_operations_start := clock_timestamp();
  
  WITH csv_items AS (
    SELECT 
      (item->>'SKU')::TEXT as sku,
      (item->>'Product_Name')::TEXT as product_name,
      (item->>'Category')::TEXT as category,
      (item->>'Quantity')::INTEGER as quantity,
      (item->>'Expiry_Date')::DATE as expiry_date,
      (item->>'Brand')::TEXT as brand,
      (item->>'Cost_Price')::NUMERIC as cost_price,
      (item->>'Selling_Price')::NUMERIC as selling_price,
      (item->>'Location')::TEXT as location_code,
      (item->>'Unit_Type')::TEXT as unit_type,
      item as original_item
    FROM jsonb_array_elements(p_csv_data) as item
  ),
  
  existing_product_check AS (
    SELECT ci.sku, p.product_id
    FROM csv_items ci
    LEFT JOIN inventory.products p ON p.sku = ci.sku
  ),
  
  duplicate_batches AS (
    SELECT DISTINCT
      ci.sku,
      ci.expiry_date,
      ci.product_name
    FROM csv_items ci
    JOIN inventory.products p ON p.sku = ci.sku
    WHERE EXISTS (
      SELECT 1 FROM inventory.batches b
      WHERE b.store_id = p_store_id
        AND b.product_id = p.product_id
        AND b.expiry_date = ci.expiry_date
        AND b.status = 'active'
        AND b.current_quantity > 0
    )
  ),
  
  non_duplicate_items AS (
    SELECT ci.*
    FROM csv_items ci
    LEFT JOIN duplicate_batches db ON db.sku = ci.sku AND db.expiry_date = ci.expiry_date
    WHERE db.sku IS NULL
  ),
  
  new_products AS (
    INSERT INTO inventory.products (
      sku, name, brand, category, unit_type,
      typical_shelf_life_days, base_cost_price, base_selling_price, created_by
    )
    SELECT DISTINCT
      ndi.sku,
      ndi.product_name,
      COALESCE(ndi.brand, 'Unknown'),
      COALESCE(ndi.category, 'dry_goods'),
      COALESCE(ndi.unit_type, 'units'),
      CASE 
        WHEN ndi.category = 'dairy' THEN 14
        WHEN ndi.category = 'bakery' THEN 3
        WHEN ndi.category = 'produce' THEN 7
        ELSE 30
      END,
      COALESCE(ndi.cost_price, 0),
      COALESCE(ndi.selling_price, 0),
      p_user_id
    FROM non_duplicate_items ndi
    LEFT JOIN existing_product_check epc ON epc.sku = ndi.sku
    WHERE epc.product_id IS NULL
    ON CONFLICT (sku) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING sku, product_id
  ),
  
  all_products AS (
    SELECT sku, product_id FROM existing_product_check WHERE product_id IS NOT NULL
    UNION ALL
    SELECT sku, product_id FROM new_products
  ),
  
  store_products_upsert AS (
    INSERT INTO inventory.store_products (
      store_id, product_id, selling_price, cost_price, is_active, added_by
    )
    SELECT DISTINCT
      p_store_id,
      ap.product_id,
      COALESCE(ndi.selling_price, 0),
      COALESCE(ndi.cost_price, 0),
      true,
      p_user_id
    FROM non_duplicate_items ndi
    JOIN all_products ap ON ap.sku = ndi.sku
    ON CONFLICT (store_id, product_id) DO UPDATE SET
      selling_price = EXCLUDED.selling_price,
      cost_price = EXCLUDED.cost_price,
      updated_at = NOW()
    RETURNING store_id, product_id
  ),
  
  new_batches AS (
    INSERT INTO inventory.batches (
      store_id, product_id, batch_number,
      initial_quantity, current_quantity, cost_price, selling_price,
      expiry_date, location_code, batch_source, status, created_by
    )
    SELECT 
      p_store_id,
      ap.product_id,
      'CSV-' || extract(epoch from now())::TEXT || '-' || gen_random_uuid()::TEXT,
      ndi.quantity,
      ndi.quantity,
      COALESCE(ndi.cost_price, 0),
      COALESCE(ndi.selling_price, 0),
      ndi.expiry_date,
      COALESCE(ndi.location_code, 'MAIN'),
      'csv_import',
      'active',
      p_user_id
    FROM non_duplicate_items ndi
    JOIN all_products ap ON ap.sku = ndi.sku
    RETURNING batch_id, product_id
  )
  
  SELECT COUNT(*) INTO processed_count FROM new_batches;
  
  SELECT 
    COUNT(*),
    array_agg(
      jsonb_build_object(
        'sku', sku,
        'product_name', product_name,
        'expiry_date', expiry_date,
        'reason', 'Duplicate batch with same expiry date'
      )
    )
  INTO skipped_count, duplicates_skipped
  FROM duplicate_batches;

  duplicate_detection_ms := EXTRACT(milliseconds FROM database_operations_start - duplicate_detection_start)::INTEGER;
  database_operations_ms := EXTRACT(milliseconds FROM clock_timestamp() - database_operations_start)::INTEGER;

  RETURN jsonb_build_object(
    'success', true,
    'processed', processed_count,
    'skipped', COALESCE(skipped_count, 0),
    'total_items', jsonb_array_length(p_csv_data),
    'errors', errors,
    'duplicates_skipped', COALESCE(duplicates_skipped, '{}'),
    'duplicate_detection_ms', duplicate_detection_ms,
    'database_operations_ms', database_operations_ms,
    'method', 'ultra_fast_skip_duplicates'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'processed', 0,
    'skipped', 0,
    'total_items', jsonb_array_length(p_csv_data)
  );
END;
$$;


ALTER FUNCTION "public"."fast_csv_import_skip_duplicates"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "location_code" character varying, "status" character varying, "created_at" timestamp without time zone, "product_name" character varying, "brand_name" character varying, "product_barcode" "text", "category_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = store_id_param
      AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to store';
  END IF;

  -- Return available batches for the product matching this barcode
  -- NOTE: All references are now fully qualified with schema names
  RETURN QUERY
  SELECT 
    b.batch_id,
    b.batch_number,
    b.product_id,
    b.store_id,  -- From batches table
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.cost_price,
    b.selling_price,
    b.location_code,
    b.status,
    b.created_at,
    p.name AS product_name,
    p.brand AS brand_name,
    p.barcode AS product_barcode,
    c.display_name_en AS category_name
  FROM inventory.batches b
  INNER JOIN inventory.products p ON b.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE p.barcode = barcode_param
    AND b.store_id = store_id_param  -- Explicitly use b.store_id
    AND b.status = 'active'
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;


ALTER FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") IS 'Securely finds available batches by barcode with store access verification. 
Uses search_path = '''' per Supabase security best practices.';



CREATE OR REPLACE FUNCTION "public"."find_duplicate_batches_bulk"("p_store_id" "uuid", "p_sku_expiry_pairs" "text") RETURNS TABLE("sku" "text", "expiry_date" "date", "batch_id" "uuid", "batch_number" "text", "current_quantity" numeric)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT 
    p.sku,
    b.expiry_date,
    b.batch_id,
    b.batch_number,
    b.current_quantity
  FROM inventory.batches b
  JOIN inventory.products p ON b.product_id = p.product_id
  WHERE b.store_id = p_store_id
    AND b.status = 'active'
    AND CONCAT('(''', p.sku, ''', ''', b.expiry_date, ''')') = ANY(
      string_to_array(p_sku_expiry_pairs, ', ')
    );
$$;


ALTER FUNCTION "public"."find_duplicate_batches_bulk"("p_store_id" "uuid", "p_sku_expiry_pairs" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_duplicate_batch_numbers"() RETURNS TABLE("batches_updated" integer, "batch_numbers_fixed" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated_count INTEGER := 0;
  batch_number_count INTEGER := 0;
BEGIN
  -- Update duplicates by keeping first batch_id and regenerating rest
  WITH duplicate_batch_numbers AS (
    SELECT 
      batch_number,
      store_id
    FROM inventory.batches
    GROUP BY batch_number, store_id
    HAVING COUNT(*) > 1
  ),
  ranked_batches AS (
    SELECT 
      b.batch_id,
      ROW_NUMBER() OVER (PARTITION BY b.batch_number, b.store_id ORDER BY b.created_at, b.batch_id) as row_num
    FROM inventory.batches b
    INNER JOIN duplicate_batch_numbers dbn 
      ON b.batch_number = dbn.batch_number 
      AND b.store_id = dbn.store_id
  ),
  updated_batches AS (
    UPDATE inventory.batches
    SET 
      batch_number = 'BATCH-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 13)),
      updated_at = NOW()
    WHERE batch_id IN (
      SELECT batch_id 
      FROM ranked_batches 
      WHERE row_num > 1
    )
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO updated_count FROM updated_batches;
  
  -- Count unique batch_number groups that were fixed
  SELECT COUNT(DISTINCT batch_number) INTO batch_number_count
  FROM duplicate_batch_numbers;
  
  RETURN QUERY SELECT updated_count, batch_number_count;
END;
$$;


ALTER FUNCTION "public"."fix_duplicate_batch_numbers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_action_history_enhanced"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_action_type" "text" DEFAULT NULL::"text") RETURNS TABLE("entry_id" "uuid", "batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "action_type" "text", "quantity_affected" numeric, "discount_percentage" numeric, "performed_at" timestamp without time zone, "performed_by_email" "text", "recipient_name" "text", "notes" "text", "original_value" numeric, "recovered_value" numeric, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  WITH action_history AS (
    SELECT 
      ba.entry_id,
      ba.batch_id,
      b.batch_number,
      p.name as product_name,
      ba.action_type::TEXT,
      ba.quantity_affected,
      ba.discount_percentage,
      ba.performed_at,
      COALESCE(au.email, 'Unknown')::TEXT as performed_by_email,
      COALESCE(dr.name, '')::TEXT as recipient_name,
      COALESCE(ba.notes, '')::TEXT as notes_text,
      ba.total_original_value as original_value,
      ba.total_recovered_value as recovered_value,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_actions ba  -- Now using the unified table
    JOIN inventory.batches b ON ba.batch_id = b.batch_id
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN auth.users au ON ba.performed_by = au.id
    LEFT JOIN inventory.donation_recipients dr ON ba.donation_recipient_id = dr.recipient_id
    WHERE ba.store_id = p_store_id
      AND (p_action_type IS NULL OR ba.action_type::TEXT = p_action_type)
    ORDER BY ba.performed_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT 
    ah.entry_id,
    ah.batch_id,
    ah.batch_number,
    ah.product_name,
    ah.action_type,
    ah.quantity_affected,
    ah.discount_percentage,
    ah.performed_at,
    ah.performed_by_email,
    ah.recipient_name,
    ah.notes_text,
    ah.original_value,
    ah.recovered_value,
    ah.total_count
  FROM action_history ah;
END;
$$;


ALTER FUNCTION "public"."get_action_history_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_actionable_batches"("input_store_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  result JSON;
BEGIN
  WITH actionable_batches AS (
    SELECT 
      b.batch_id,
      p.name as product_name,
      COALESCE(c.display_name_en, 'Unknown') as category,
      b.expiry_date,
      b.current_quantity,
      b.selling_price,
      (b.expiry_date - CURRENT_DATE) as days_until_expiry,
      CASE 
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days' THEN 'discount'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '5 days' THEN 'watch'
        ELSE 'normal'
      END as urgency_level,
      CASE 
        WHEN LOWER(COALESCE(c.display_name_en, '')) IN ('dairy', 'milk', 'cheese', 'yogurt') 
          AND b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days'
        THEN 'discount_20_percent'
        WHEN LOWER(COALESCE(c.display_name_en, '')) IN ('bakery', 'bread', 'pastry')
          AND b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '2 days'
        THEN 'donate'
        WHEN b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
        THEN 'urgent_action'
        ELSE 'monitor'
      END as recommended_action,
      bae.ai_score,
      bae.recommended_action as ai_recommended_action
    FROM inventory.batches b
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    LEFT JOIN inventory.batch_action_entries bae ON b.batch_id = bae.batch_id
    WHERE b.store_id = input_store_id
      AND b.current_quantity > 0 
      AND b.status = 'active'
      AND b.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY b.expiry_date ASC, c.display_name_en, p.name
  )
  SELECT json_build_object(
    'store_id', input_store_id,
    'actionable_batches', json_agg(
      json_build_object(
        'batch_id', ab.batch_id,
        'product_name', ab.product_name,
        'category', ab.category,
        'expiry_date', ab.expiry_date,
        'current_quantity', ab.current_quantity,
        'selling_price', ab.selling_price,
        'days_until_expiry', ab.days_until_expiry,
        'urgency_level', ab.urgency_level,
        'recommended_action', ab.recommended_action,
        'ai_score', ab.ai_score,
        'ai_recommended_action', ab.ai_recommended_action
      ) ORDER BY ab.expiry_date ASC
    ) FILTER (WHERE ab.batch_id IS NOT NULL),
    'summary', json_build_object(
      'total_actionable_batches', COUNT(ab.batch_id),
      'urgent_count', COUNT(CASE WHEN ab.urgency_level = 'urgent' THEN 1 END),
      'discount_count', COUNT(CASE WHEN ab.recommended_action = 'discount_20_percent' THEN 1 END),
      'donation_count', COUNT(CASE WHEN ab.recommended_action = 'donate' THEN 1 END)
    )
  ) INTO result
  FROM actionable_batches ab;
  
  RETURN COALESCE(result, '{"actionable_batches": [], "summary": {"total_actionable_batches": 0}}'::json);
END;
$$;


ALTER FUNCTION "public"."get_actionable_batches"("input_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_actionable_batches"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "product_name" character varying, "expiry_date" "date", "urgency" character varying, "recommendation" "text", "reason" "text", "location_code" character varying, "current_quantity" numeric, "potential_loss" numeric, "composite_score" numeric, "discount_percent" integer, "action_taken" "text", "action_date" timestamp without time zone, "action_user" "text", "batch_number" character varying, "product_brand" character varying, "sku" character varying, "unit_price" numeric, "urgency_level" character varying, "days_to_expiry" integer, "todo_state" character varying, "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  WITH actionable_inventory AS (
    SELECT 
      b.batch_id,
      COALESCE(p.name, 'Unknown Product')::VARCHAR(255) as product_name,
      b.expiry_date,
      -- Map urgency_level to urgency (frontend expects this field name)
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'critical'
        WHEN b.expiry_date = CURRENT_DATE THEN 'critical'
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 'high'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
        WHEN b.expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 'low'
        ELSE 'low'
      END::VARCHAR(20) as urgency,
      -- Map ai_recommendation to recommendation
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'Apply 50% discount or donate immediately'
        WHEN b.expiry_date = CURRENT_DATE THEN 'Apply 40% discount today'
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 'Apply 30% discount tomorrow'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days' THEN 'Apply 20% discount soon'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '4 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 'Monitor and consider 10% discount'
        ELSE 'Monitor regularly'
      END::TEXT as recommendation,
      -- Map ai_reasoning to reason
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'Item has expired and needs immediate action'
        WHEN b.expiry_date = CURRENT_DATE THEN 'Item expires today - urgent action needed'
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 'Item expires tomorrow - high priority'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 'Item expires within a week'
        ELSE 'Item has sufficient shelf life remaining'
      END::TEXT as reason,
      COALESCE(b.location_code, 'DEFAULT')::VARCHAR(50) as location_code,
      b.current_quantity,
      -- Calculate potential loss
      (b.current_quantity * COALESCE(b.selling_price, 0::NUMERIC)) as potential_loss,
      -- Calculate a simple composite score based on days to expiry
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 1.0
        WHEN b.expiry_date = CURRENT_DATE THEN 0.9
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 0.8
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days' THEN 0.7
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '4 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 0.5
        ELSE 0.2
      END::NUMERIC as composite_score,
      -- Calculate suggested discount percentage
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 50  -- Expired items
        WHEN b.expiry_date = CURRENT_DATE THEN 40   -- Expires today
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 30 -- Expires tomorrow
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days' THEN 20
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '4 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 10
        ELSE 0
      END as discount_percent,
      -- Default null values for action fields (will be populated when actions are taken)
      NULL::TEXT as action_taken,
      NULL::TIMESTAMP as action_date,
      NULL::TEXT as action_user,
      -- Additional fields for reference
      b.batch_number,
      COALESCE(p.brand, '')::VARCHAR(100) as product_brand,
      COALESCE(p.sku, '')::VARCHAR(100) as sku,
      COALESCE(b.selling_price, 0::NUMERIC) as unit_price,
      -- Keep original urgency_level for reference
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'critical'
        WHEN b.expiry_date = CURRENT_DATE THEN 'critical'
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 'high'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
        WHEN b.expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 'low'
        ELSE 'low'
      END::VARCHAR(20) as urgency_level,
      -- Calculate days to expiry
      (b.expiry_date - CURRENT_DATE)::INTEGER as days_to_expiry,
      -- Determine todo state
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN b.expiry_date = CURRENT_DATE THEN 'urgent_action'
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 'urgent_action'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days' THEN 'needs_attention'
        WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '4 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 'monitor'
        ELSE 'ok'
      END::VARCHAR(20) as todo_state,
      -- Get total count for pagination
      COUNT(*) OVER() as total_count
    FROM inventory.batches b
    LEFT JOIN inventory.products p ON b.product_id = p.product_id
    WHERE b.store_id = p_store_id 
      AND b.current_quantity > 0
      AND b.expiry_date >= CURRENT_DATE - INTERVAL '3 days' -- Include recently expired
    ORDER BY 
      -- Sort by urgency first, then by expiry date
      CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 1
        WHEN b.expiry_date = CURRENT_DATE THEN 2
        WHEN b.expiry_date = CURRENT_DATE + INTERVAL '1 day' THEN 3
        ELSE 4
      END,
      b.expiry_date ASC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT 
    ai.batch_id,
    ai.product_name,
    ai.expiry_date,
    ai.urgency,            -- Frontend expects "urgency"
    ai.recommendation,     -- Frontend expects "recommendation"  
    ai.reason,            -- Frontend expects "reason"
    ai.location_code,
    ai.current_quantity,
    ai.potential_loss,
    ai.composite_score,
    ai.discount_percent,
    ai.action_taken,
    ai.action_date,
    ai.action_user,
    -- Additional fields
    ai.batch_number,
    ai.product_brand,
    ai.sku,
    ai.unit_price,
    ai.urgency_level,
    ai.days_to_expiry,
    ai.todo_state,
    ai.total_count
  FROM actionable_inventory ai;
END;
$$;


ALTER FUNCTION "public"."get_actionable_batches"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_active_with_states"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "todo_state" "text", "ai_recommendation" character varying, "composite_score" numeric, "days_to_expiry" integer, "hours_since_last_action" numeric, "total_actions_ever" integer, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_active AS (
    SELECT 
      bts.batch_id,
      bts.batch_number,
      bts.product_name,
      bts.product_brand,
      bts.expiry_date,
      bts.current_quantity,
      bts.todo_state,
      bts.ai_recommendation,
      bts.composite_score,
      bts.days_to_expiry,
      bts.hours_since_last_action,
      bts.total_actions_ever::INTEGER,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND bts.batch_status = 'active'
      AND bts.current_quantity > 0
    ORDER BY 
      CASE bts.todo_state
        WHEN 'pending_action' THEN 1
        WHEN 'recently_discounted' THEN 2
        WHEN 'recently_donated' THEN 3
        WHEN 'recently_expired' THEN 4
        ELSE 5
      END,
      bts.priority_order,
      bts.composite_score DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT * FROM all_active;
END;
$$;


ALTER FUNCTION "public"."get_all_active_with_states"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_automation_status"() RETURNS TABLE("job_id" bigint, "job_name" "text", "schedule" "text", "command" "text", "active" boolean)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT 
    jobid,
    jobname::TEXT,
    schedule::TEXT,
    command::TEXT,
    active
  FROM cron.job 
  WHERE jobname = 'batch-status-automation';
$$;


ALTER FUNCTION "public"."get_automation_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_action_type" "text" DEFAULT NULL::"text", "p_date_from" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_date_to" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("action_id" "uuid", "batch_id" "uuid", "store_id" "uuid", "recommended_action" "text", "actual_action" "text", "ai_score" numeric, "action_date" timestamp without time zone, "quantity_affected" numeric, "notes" "text", "original_value" numeric, "recovered_value" numeric, "performed_by" "uuid", "created_at" timestamp without time zone, "donation_recipient_id" "uuid", "product_name" "text", "batch_number" "text", "sku" "text", "expiry_date" "date", "location_code" "text", "recipient_name" "text", "recipient_type" "text", "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.entry_id as action_id,           -- entry_id is now the primary key
    ba.batch_id,
    ba.store_id,
    ba.recommended_action::TEXT,
    ba.action_type::TEXT as actual_action,  -- action_type maps to actual_action
    ba.ai_score,
    ba.performed_at as action_date,     -- performed_at maps to action_date
    ba.quantity_affected,
    ba.notes,
    ba.total_original_value as original_value,  -- total_original_value maps to original_value
    ba.total_recovered_value as recovered_value, -- total_recovered_value maps to recovered_value
    ba.performed_by,
    ba.created_at,
    ba.donation_recipient_id,
    
    -- Product details from joined tables
    p.name::TEXT as product_name,
    b.batch_number::TEXT,
    p.sku::TEXT,
    b.expiry_date,
    b.location_code::TEXT,
    
    -- Recipient details
    dr.name::TEXT as recipient_name,
    dr.recipient_type::TEXT,
    
    -- Total count for pagination
    COUNT(*) OVER()::BIGINT as total_count
    
  FROM inventory.batch_actions ba  -- Now using the renamed table
  LEFT JOIN inventory.batches b ON ba.batch_id = b.batch_id
  LEFT JOIN inventory.store_products sp ON b.store_id = sp.store_id AND b.product_id = sp.product_id  
  LEFT JOIN inventory.products p ON sp.product_id = p.product_id
  LEFT JOIN inventory.donation_recipients dr ON ba.donation_recipient_id = dr.recipient_id
  
  WHERE ba.store_id = p_store_id
    AND (p_action_type IS NULL OR ba.action_type::TEXT = p_action_type)
    AND (p_date_from IS NULL OR ba.performed_at >= p_date_from)
    AND (p_date_to IS NULL OR ba.performed_at <= p_date_to)
    
  ORDER BY ba.performed_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text", "p_date_from" timestamp without time zone, "p_date_to" timestamp without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text", "p_date_from" timestamp without time zone, "p_date_to" timestamp without time zone) IS 'Fetch batch actions with joined product, batch, and recipient details. Replaces complex client-side joins with efficient server-side processing.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_store_id UUID;
  current_user_id UUID;
  result_json JSONB;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If no user, return null
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First get the store_id for the batch to check access
  SELECT bts.store_id INTO target_store_id
  FROM inventory.batch_todo_states bts
  WHERE bts.batch_id = target_batch_id;
  
  -- Check if user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = target_store_id 
    AND su.user_id = current_user_id
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the batch todo details
  SELECT to_jsonb(bts) INTO result_json
  FROM inventory.batch_todo_states bts
  WHERE bts.batch_id = target_batch_id;
  
  RETURN result_json;
END;
$$;


ALTER FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") IS 'Securely retrieves todo data for a single batch by batch_id as JSONB. Includes store access validation to ensure users can only access batches from stores they have permission to view.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid" DEFAULT NULL::"uuid", "limit_rows" integer DEFAULT 100) RETURNS TABLE("batch_id" "uuid", "store_id" "uuid", "batch_number" character varying, "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "batch_status" character varying, "product_name" "text", "product_brand" "text", "ai_recommendation" "text", "composite_score" numeric, "urgency_level" "text", "ai_calculated_at" timestamp without time zone, "last_action_type" "text", "last_action_time" timestamp without time zone, "last_action_quantity" numeric, "last_discount_percent" numeric, "total_actions_ever" bigint, "total_discounted_quantity" numeric, "total_donated_quantity" numeric, "total_disposed_quantity" numeric, "total_sold_quantity" numeric, "total_ignored_quantity" numeric, "completion_status" "text", "todo_state" "text", "priority_order" integer, "days_to_expiry" integer, "hours_since_last_action" numeric, "view_refreshed_at" timestamp without time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring', 'business'
    AS $$
  -- First check store access permissions using existing RLS
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
    bts.total_actions_ever,
    bts.total_discounted_quantity,
    bts.total_donated_quantity,
    bts.total_disposed_quantity,
    bts.total_sold_quantity,
    bts.total_ignored_quantity,
    bts.completion_status,
    bts.todo_state,
    bts.priority_order,
    bts.days_to_expiry,
    bts.hours_since_last_action,
    bts.view_refreshed_at
  FROM inventory.batch_todo_states bts
  -- Join with stores table to ensure RLS is applied
  INNER JOIN business.stores s ON s.store_id = bts.store_id
  WHERE (target_store_id IS NULL OR bts.store_id = target_store_id)
  ORDER BY bts.priority_order, bts.expiry_date
  LIMIT limit_rows;
$$;


ALTER FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_rows" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_rows" integer) IS 'SECURITY: This function is SECURITY DEFINER and acts as a security gate.
It enforces store access through the JOIN with business.stores (which has RLS).
Only modify this function with extreme caution.
Last updated: 2025-01 - Security hardening for materialized view access.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer DEFAULT 100, "offset_count" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "store_id" "uuid", "batch_number" character varying, "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "batch_status" character varying, "product_name" character varying, "product_brand" character varying, "ai_recommendation" character varying, "composite_score" numeric, "urgency_level" "text", "ai_calculated_at" timestamp without time zone, "last_action_type" "text", "last_action_time" timestamp without time zone, "last_action_quantity" numeric, "last_discount_percent" numeric, "total_actions_ever" bigint, "total_discounted_quantity" numeric, "total_donated_quantity" numeric, "total_disposed_quantity" numeric, "total_sold_quantity" numeric, "total_ignored_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "current_selling_price" numeric, "profit_margin" numeric, "profit_margin_percent" numeric, "potential_loss_value" numeric, "potential_revenue_value" numeric, "current_total_value" numeric, "unit_price" numeric, "completion_status" "text", "todo_state" "text", "priority_order" integer, "days_to_expiry" integer, "hours_since_last_action" numeric, "view_refreshed_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring', 'business'
    AS $$
BEGIN
  -- Check if user has access to the specified store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = target_store_id
    AND su.user_id = auth.uid()
    AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not have access to store %', target_store_id;
  END IF;

  -- Return filtered results from the materialized view
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
  WHERE bts.store_id = target_store_id
  ORDER BY bts.priority_order ASC, bts.expiry_date ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer, "offset_count" integer) IS 'SECURITY: SECURITY DEFINER function. Enforces store access via business.stores RLS.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid" DEFAULT NULL::"uuid", "p_todo_state" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "store_id" "uuid", "batch_number" character varying, "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "batch_status" character varying, "product_name" character varying, "product_brand" character varying, "ai_recommendation" character varying, "composite_score" numeric, "urgency_level" "text", "ai_calculated_at" timestamp without time zone, "last_action_type" "text", "last_action_time" timestamp without time zone, "todo_state" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring', 'business'
    AS $$
BEGIN
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
        bts.urgency_level::text,
        bts.ai_calculated_at,
        bts.last_action_type::text,
        bts.last_action_time,
        bts.todo_state::text
    FROM inventory.batch_todo_states bts
    WHERE (p_store_id IS NULL OR bts.store_id = p_store_id)
      AND (p_todo_state IS NULL OR bts.todo_state = p_todo_state)
    ORDER BY bts.composite_score DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid", "p_todo_state" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid", "p_todo_state" "text", "p_limit" integer, "p_offset" integer) IS 'SECURITY: SECURITY DEFINER function. Enforces store access via business.stores RLS.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") RETURNS TABLE("total_batches" bigint, "pending_action_count" bigint, "immediate_action_count" bigint, "in_progress_count" bigint, "completed_count" bigint, "total_potential_loss" numeric, "critical_urgency_count" bigint, "high_urgency_count" bigint, "last_refreshed" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Check store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = target_store_id 
    AND su.user_id = auth.uid()
  ) THEN
    -- Return empty result instead of error for RLS compliance
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_batches,
    COUNT(CASE WHEN bts.todo_state = 'pending_action' THEN 1 END)::bigint as pending_action_count,
    COUNT(CASE WHEN bts.urgency_level = 'critical' THEN 1 END)::bigint as immediate_action_count,
    COUNT(CASE WHEN bts.todo_state = 'in_progress' THEN 1 END)::bigint as in_progress_count,
    COUNT(CASE WHEN bts.todo_state = 'completed' THEN 1 END)::bigint as completed_count,
    COALESCE(SUM(bts.current_quantity * COALESCE((SELECT sp.selling_price FROM inventory.store_products sp WHERE sp.batch_id = bts.batch_id LIMIT 1), 0)), 0) as total_potential_loss,
    COUNT(CASE WHEN bts.urgency_level = 'critical' THEN 1 END)::bigint as critical_urgency_count,
    COUNT(CASE WHEN bts.urgency_level = 'high' THEN 1 END)::bigint as high_urgency_count,
    MAX(bts.ai_calculated_at) as last_refreshed
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = target_store_id;
END;
$$;


ALTER FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") IS 'Provides summary statistics for batch todos in a store, including counts by state and urgency level.';



CREATE OR REPLACE FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 100, "offset_count" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "expiry_date" "date", "current_quantity" numeric, "todo_state" "text", "urgency_level" "text", "ai_recommendation" character varying, "last_action_type" "text", "days_to_expiry" integer, "current_selling_price" numeric, "potential_loss_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Check store access
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = target_store_id
    AND su.user_id = auth.uid()
    AND su.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not have access to store %', target_store_id;
  END IF;

  -- Return filtered results
  RETURN QUERY
  SELECT 
    bts.batch_id,
    bts.batch_number,
    bts.product_name,
    bts.expiry_date,
    bts.current_quantity,
    bts.todo_state,
    bts.urgency_level,
    bts.ai_recommendation,
    bts.last_action_type,
    bts.days_to_expiry,
    bts.current_selling_price,
    bts.potential_loss_value
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = target_store_id
    AND (filter_todo_state IS NULL OR bts.todo_state = filter_todo_state)
  ORDER BY bts.priority_order ASC, bts.expiry_date ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text", "limit_count" integer, "offset_count" integer) IS 'Retrieves batch todos filtered by todo state (e.g., pending_action, immediate_action) with store access validation.';



CREATE OR REPLACE FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer DEFAULT 0, "p_page_size" integer DEFAULT 20, "p_filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("batch_id" "uuid", "batch_number" "text", "product_id" "uuid", "product_name" "text", "product_brand" "text", "sku" "text", "barcode" "text", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "status" "text", "verification_status" "text", "location_code" "text", "batch_source" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
DECLARE
  v_offset integer;
  v_status_filter text;
BEGIN
  -- Calculate offset
  v_offset := p_page * p_page_size;
  
  -- Extract filters
  v_status_filter := COALESCE(p_filters->>'status', 'active');
  
  -- Return paginated batches with product details
  RETURN QUERY
  WITH filtered_batches AS (
    SELECT 
      b.batch_id,
      b.batch_number,
      b.product_id,
      p.name as product_name,
      p.brand as product_brand,
      p.sku,
      p.barcode,
      b.expiry_date,
      b.current_quantity,
      b.available_quantity,
      b.cost_price,
      b.selling_price,
      b.status::text,
      b.verification_status::text,
      b.location_code,
      b.batch_source::text,
      b.created_at,
      b.updated_at,
      COUNT(*) OVER() as total_count
    FROM inventory.batches b
    LEFT JOIN inventory.products p ON b.product_id = p.product_id
    WHERE b.store_id = p_store_id
      AND (v_status_filter IS NULL OR b.status::text = v_status_filter)
    ORDER BY b.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT * FROM filtered_batches;
END;
$$;


ALTER FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_filters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_filters" "jsonb") IS 'Optimized batches page fetch with product details. Expected: <100ms vs 750ms';



CREATE OR REPLACE FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer DEFAULT 0, "p_page_size" integer DEFAULT 20, "p_product_id" "uuid" DEFAULT NULL::"uuid", "p_status" character varying DEFAULT NULL::character varying, "p_location_code" character varying DEFAULT NULL::character varying, "p_supplier" character varying DEFAULT NULL::character varying, "p_has_stock" boolean DEFAULT NULL::boolean, "p_expiring_in_days" integer DEFAULT NULL::integer, "p_expiry_date_from" "date" DEFAULT NULL::"date", "p_expiry_date_to" "date" DEFAULT NULL::"date", "p_received_date_from" "date" DEFAULT NULL::"date", "p_received_date_to" "date" DEFAULT NULL::"date", "p_sort_field" character varying DEFAULT 'expiry_date'::character varying, "p_sort_direction" character varying DEFAULT 'asc'::character varying) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "manufacture_date" "date", "received_date" "date", "current_quantity" numeric, "initial_quantity" numeric, "reserved_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "supplier" character varying, "location_code" character varying, "status" character varying, "batch_source" character varying, "scanned_barcode" character varying, "scan_confidence" numeric, "verification_status" character varying, "ocr_extracted_date" "text", "ocr_confidence" numeric, "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "created_by" "uuid", "product_name" character varying, "product_sku" character varying, "product_barcode" "text", "product_brand" character varying, "product_description" "text", "product_unit_type" character varying, "product_typical_shelf_life_days" integer, "product_image_url" "text", "product_category_id" "uuid", "product_category_code" "text", "product_category_name_en" "text", "product_category_name_fr" "text", "total_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT * FROM inventory.get_batches_paginated(
    p_store_id, p_page, p_page_size, p_product_id, p_status, 
    p_location_code, p_supplier, p_has_stock, p_expiring_in_days,
    p_expiry_date_from, p_expiry_date_to, p_received_date_from,
    p_received_date_to, p_sort_field, p_sort_direction
  );
$$;


ALTER FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) IS 'Public wrapper for inventory.get_batches_paginated';



CREATE OR REPLACE FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer DEFAULT 30) RETURNS TABLE("batch_source" "text", "upload_count" bigint, "total_batches" bigint, "avg_batches_per_upload" numeric, "latest_upload" timestamp without time zone)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT 
    batch_source,
    COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as upload_count,
    COUNT(*) as total_batches,
    ROUND(COUNT(*)::NUMERIC / COUNT(DISTINCT DATE_TRUNC('minute', created_at)), 2) as avg_batches_per_upload,
    MAX(created_at) as latest_upload
  FROM inventory.batches
  WHERE store_id = p_store_id
    AND created_at > NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY batch_source
  ORDER BY upload_count DESC;
$$;


ALTER FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer) IS 'Monitor CSV upload performance and patterns';



CREATE OR REPLACE FUNCTION "public"."get_current_kpis"("p_store_id" "uuid") RETURNS TABLE("kpi_name" "text", "kpi_value" numeric, "timestamp_value" timestamp without time zone)
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
  -- Current Inventory Value
  SELECT 
    'Total Inventory Value'::TEXT,
    ROUND(COALESCE(SUM(b.current_quantity * b.selling_price), 0), 2),
    NOW()
  FROM inventory.batches b
  WHERE b.store_id = p_store_id AND b.status = 'active'
  
  UNION ALL
  
  -- Sales Revenue (Today)
  SELECT 
    'Sales Revenue'::TEXT,
    ROUND(COALESCE(SUM(s.quantity_sold * s.sale_price), 0), 2),
    NOW()
  FROM timeseries.sales_events s
  WHERE s.store_id = p_store_id 
    AND DATE(s.sale_timestamp) = CURRENT_DATE
  
  UNION ALL
  
  -- Donations (Today) - Updated to use batch_action_entries
  SELECT 
    'Donations'::TEXT,
    ROUND(COALESCE(SUM(bae.total_original_value), 0), 2),
    NOW()
  FROM inventory.batch_action_entries bae
  WHERE bae.store_id = p_store_id 
    AND bae.action_type = 'donate' 
    AND DATE(bae.performed_at) = CURRENT_DATE
  
  UNION ALL
  
  -- Waste Cost (Today) - Updated to use batch_action_entries
  SELECT 
    'Waste Cost'::TEXT,
    ROUND(COALESCE(SUM(bae.total_original_value), 0), 2),
    NOW()
  FROM inventory.batch_action_entries bae
  WHERE bae.store_id = p_store_id 
    AND bae.action_type = 'dispose' 
    AND DATE(bae.performed_at) = CURRENT_DATE;
$$;


ALTER FUNCTION "public"."get_current_kpis"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_preferences"() RETURNS TABLE("user_id" "uuid", "primary_store_id" "uuid", "preferences" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'user_mgmt', 'public'
    AS $$
  SELECT * FROM user_mgmt.get_current_user_preferences();
$$;


ALTER FUNCTION "public"."get_current_user_preferences"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_preferences"() IS 'Public wrapper for user_mgmt.get_current_user_preferences';



CREATE OR REPLACE FUNCTION "public"."get_current_user_with_pin_auth"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_username" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    store_record RECORD;
    auth_user_id UUID;
BEGIN
    -- Try to get authenticated user from Supabase session first
    auth_user_id := auth.uid();
    
    -- If we have traditional auth, use that
    IF auth_user_id IS NOT NULL THEN
        -- Get user with store info using traditional auth
        SELECT 
            au.id,
            au.email,
            au.created_at,
            au.raw_user_meta_data,
            COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, au.email) as full_name,
            COALESCE((au.raw_user_meta_data->>'username')::TEXT, '') as username
        INTO user_record
        FROM auth.users au
        WHERE au.id = auth_user_id
        AND au.deleted_at IS NULL;
        
        IF FOUND THEN
            -- Get user's primary store (fully qualified table references)
            SELECT s.store_id, s.store_name, su.role_in_store
            INTO store_record
            FROM business.store_users su
            JOIN business.stores s ON su.store_id = s.store_id
            WHERE su.user_id = user_record.id 
            AND su.is_active = true
            ORDER BY su.assigned_at ASC
            LIMIT 1;
            
            RETURN json_build_object(
                'success', true,
                'auth_method', 'supabase',
                'user', json_build_object(
                    'id', user_record.id,
                    'email', user_record.email,
                    'username', user_record.username,
                    'full_name', user_record.full_name,
                    'store_id', COALESCE(store_record.store_id, NULL),
                    'store_name', COALESCE(store_record.store_name, NULL),
                    'role_in_store', COALESCE(store_record.role_in_store, NULL)
                )
            );
        END IF;
    END IF;
    
    -- If no traditional auth, check for PIN auth using provided parameters
    IF p_user_id IS NOT NULL THEN
        -- Validate user ID and get user info
        SELECT 
            au.id,
            au.email,
            au.raw_user_meta_data,
            COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, au.email) as full_name,
            COALESCE((au.raw_user_meta_data->>'username')::TEXT, '') as username,
            COALESCE((au.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active
        INTO user_record
        FROM auth.users au
        WHERE au.id = p_user_id
        AND au.deleted_at IS NULL;
        
        IF NOT FOUND OR NOT user_record.is_active THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid or inactive user'
            );
        END IF;
        
        -- Get user's primary store (fully qualified table references)
        SELECT s.store_id, s.store_name, su.role_in_store
        INTO store_record
        FROM business.store_users su
        JOIN business.stores s ON su.store_id = s.store_id
        WHERE su.user_id = user_record.id 
        AND su.is_active = true
        ORDER BY su.assigned_at ASC
        LIMIT 1;
        
        RETURN json_build_object(
            'success', true,
            'auth_method', 'pin',
            'user', json_build_object(
                'id', user_record.id,
                'email', user_record.email,
                'username', user_record.username,
                'full_name', user_record.full_name,
                'store_id', COALESCE(store_record.store_id, NULL),
                'store_name', COALESCE(store_record.store_name, NULL),
                'role_in_store', COALESCE(store_record.role_in_store, NULL)
            )
        );
    END IF;
    
    -- No authentication found
    RETURN json_build_object(
        'success', false,
        'error', 'No authentication found'
    );
END;
$$;


ALTER FUNCTION "public"."get_current_user_with_pin_auth"("p_user_id" "uuid", "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") RETURNS TABLE("total_active_batches" integer, "needs_attention_count" integer, "critical_count" integer, "high_count" integer, "medium_count" integer, "low_count" integer, "ok_count" integer, "needs_attention_percentage" numeric, "expired_items_count" integer, "expired_items_value" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  -- Single-pass aggregation over indexed materialized view
  -- Uses idx_batch_todo_states_store_urgency for optimal performance
  WITH batch_aggregates AS (
    SELECT 
      COUNT(*) FILTER (
        WHERE completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as total_active,
      COUNT(*) FILTER (
        WHERE todo_state = 'immediate_action'
          AND completion_status IN ('pending', 'in_progress')
      ) as immediate_count,
      COUNT(*) FILTER (
        WHERE urgency_level = 'critical'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as critical,
      COUNT(*) FILTER (
        WHERE urgency_level = 'high'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as high,
      COUNT(*) FILTER (
        WHERE urgency_level = 'medium'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as medium,
      COUNT(*) FILTER (
        WHERE urgency_level = 'low'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as low,
      COUNT(*) FILTER (
        WHERE expiry_date < CURRENT_DATE
          AND expiry_date >= CURRENT_DATE - INTERVAL '7 days'
          AND current_quantity > 0
      ) as expired_count,
      COALESCE(
        SUM(current_quantity * selling_price) FILTER (
          WHERE expiry_date < CURRENT_DATE
            AND expiry_date >= CURRENT_DATE - INTERVAL '7 days'
            AND current_quantity > 0
        ), 
        0
      ) as expired_value
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
  )
  SELECT 
    ba.total_active::INTEGER,
    ba.immediate_count::INTEGER,
    ba.critical::INTEGER,
    ba.high::INTEGER,
    ba.medium::INTEGER,
    ba.low::INTEGER,
    GREATEST(0, ba.total_active - ba.immediate_count)::INTEGER as ok,
    CASE 
      WHEN ba.total_active > 0 THEN 
        ROUND((ba.immediate_count::DECIMAL / ba.total_active * 100), 1)
      ELSE 0 
    END as needs_attention_pct,
    ba.expired_count::INTEGER,
    ba.expired_value::DECIMAL
  FROM batch_aggregates ba;
$$;


ALTER FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") IS 'Ultra-optimized dashboard summary. SQL language (not plpgsql) for better inlining. STABLE for query planner optimization. No RLS checks. Expected: <10ms';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") RETURNS json
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT json_build_object(
    'total_active_batches', COALESCE(ba.total_active, 0)::INTEGER,
    'needs_attention_count', COALESCE(ba.immediate_count, 0)::INTEGER,
    'critical_count', COALESCE(ba.critical, 0)::INTEGER,
    'high_count', COALESCE(ba.high, 0)::INTEGER,
    'medium_count', COALESCE(ba.medium, 0)::INTEGER,
    'low_count', COALESCE(ba.low, 0)::INTEGER,
    'ok_count', GREATEST(0, COALESCE(ba.total_active, 0) - COALESCE(ba.immediate_count, 0))::INTEGER,
    'needs_attention_percentage', CASE 
      WHEN COALESCE(ba.total_active, 0) > 0 THEN 
        ROUND((COALESCE(ba.immediate_count, 0)::DECIMAL / ba.total_active * 100), 1)
      ELSE 0 
    END,
    'expired_items_count', COALESCE(ba.expired_count, 0)::INTEGER,
    'expired_items_value', COALESCE(ba.expired_value, 0)::DECIMAL
  )
  FROM (
    SELECT 
      COUNT(*) FILTER (
        WHERE completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as total_active,
      COUNT(*) FILTER (
        WHERE todo_state = 'immediate_action'
          AND completion_status IN ('pending', 'in_progress')
      ) as immediate_count,
      COUNT(*) FILTER (
        WHERE urgency_level = 'critical'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as critical,
      COUNT(*) FILTER (
        WHERE urgency_level = 'high'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as high,
      COUNT(*) FILTER (
        WHERE urgency_level = 'medium'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as medium,
      COUNT(*) FILTER (
        WHERE urgency_level = 'low'
          AND completion_status IN ('pending', 'in_progress')
          AND todo_state != 'recently_ignored'
      ) as low,
      COUNT(*) FILTER (
        WHERE expiry_date < CURRENT_DATE
          AND expiry_date >= CURRENT_DATE - INTERVAL '7 days'
          AND current_quantity > 0
      ) as expired_count,
      COALESCE(
        SUM(current_quantity * selling_price) FILTER (
          WHERE expiry_date < CURRENT_DATE
            AND expiry_date >= CURRENT_DATE - INTERVAL '7 days'
            AND current_quantity > 0
        ), 
        0
      ) as expired_value
    FROM inventory.batch_todo_states
    WHERE store_id = p_store_id
  ) ba;
$$;


ALTER FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") IS 'Ultra-optimized dashboard summary returning JSON directly. Faster PostgREST parsing. Expected client-side: <200ms vs 1136ms';



CREATE OR REPLACE FUNCTION "public"."get_donated_items"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_days_back" integer DEFAULT 7) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "quantity_donated" numeric, "donation_recipient_name" character varying, "donated_at" timestamp without time zone, "notes" "text", "total_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  WITH donated_items AS (
    SELECT 
      b.batch_id,
      b.batch_number,
      p.name as product_name,
      p.brand as product_brand,
      b.expiry_date,
      bae.quantity_affected as quantity_donated,
      dr.name as donation_recipient_name,
      bae.performed_at as donated_at,
      bae.notes,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_action_entries bae
    JOIN inventory.batches b ON bae.batch_id = b.batch_id
    JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.donation_recipients dr ON bae.donation_recipient_id = dr.recipient_id
    WHERE bae.store_id = p_store_id
      AND bae.action_type = 'donate'
      AND bae.performed_at >= NOW() - (p_days_back || ' days')::INTERVAL
    ORDER BY bae.performed_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT * FROM donated_items;
END;
$$;


ALTER FUNCTION "public"."get_donated_items"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enum_values"("enum_name" "text", "schema_name" "text" DEFAULT 'public'::"text") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result text[];
BEGIN
  -- Note: All table references now need full schema qualification
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO result
  FROM pg_catalog.pg_type t 
  JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
  JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid  
  WHERE t.typname = enum_name 
    AND n.nspname = schema_name;
  
  RETURN COALESCE(result, ARRAY[]::text[]);
END;
$$;


ALTER FUNCTION "public"."get_enum_values"("enum_name" "text", "schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer DEFAULT 7) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "store_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "supplier" character varying, "location_code" character varying, "status" character varying, "product_name" character varying, "product_sku" character varying, "product_barcode" "text", "product_brand" character varying, "product_category_code" "text", "product_category_name_en" "text", "product_category_name_fr" "text", "days_until_expiry" integer, "total_value" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT * FROM inventory.get_expiring_batches(p_store_id, p_days_ahead);
$$;


ALTER FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) IS 'Public wrapper for inventory.get_expiring_batches';



CREATE OR REPLACE FUNCTION "public"."get_items_needing_reeval"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "ai_recommendation" character varying, "composite_score" numeric, "last_action_type" "text", "last_action_time" timestamp without time zone, "ai_calculated_at" timestamp without time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
BEGIN
  -- Check store access
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH reeval_items AS (
    SELECT 
      bts.batch_id,
      bts.batch_number,
      bts.product_name,
      bts.product_brand,
      bts.expiry_date,
      bts.current_quantity,
      bts.ai_recommendation,
      bts.composite_score,
      bts.last_action_type::text,
      bts.last_action_time,
      bts.ai_calculated_at,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND bts.todo_state = 'needs_reeval'
    ORDER BY bts.last_action_time DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT * FROM reeval_items;
END;
$$;


ALTER FUNCTION "public"."get_items_needing_reeval"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") RETURNS TABLE("kpi_name" "text", "current_value" numeric, "previous_value" numeric, "change_value" numeric, "change_percent" numeric)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  WITH current_period AS (
    SELECT 
      SUM(inventory_value) as inventory_total,
      SUM(sales_revenue) as sales_total,
      SUM(donations_value) as donations_total,
      SUM(waste_value) as waste_total
    FROM public.dashboard_kpi_daily
    WHERE store_id = p_store_id 
      AND metric_date >= p_current_start 
      AND metric_date <= p_current_end
  ),
  compare_period AS (
    SELECT 
      SUM(inventory_value) as inventory_total,
      SUM(sales_revenue) as sales_total,
      SUM(donations_value) as donations_total,
      SUM(waste_value) as waste_total
    FROM public.dashboard_kpi_daily
    WHERE store_id = p_store_id 
      AND metric_date >= p_compare_start 
      AND metric_date <= p_compare_end
  )
  SELECT 
    'Total Inventory Value'::TEXT as kpi_name,
    ROUND(COALESCE(c.inventory_total, 0), 2) as current_value,
    ROUND(COALESCE(p.inventory_total, 0), 2) as previous_value,
    ROUND(COALESCE(c.inventory_total, 0) - COALESCE(p.inventory_total, 0), 2) as change_value,
    CASE 
      WHEN COALESCE(p.inventory_total, 0) = 0 THEN 0
      ELSE ROUND(((COALESCE(c.inventory_total, 0) - COALESCE(p.inventory_total, 0)) / p.inventory_total) * 100, 2)
    END as change_percent
  FROM current_period c, compare_period p
  
  UNION ALL
  
  SELECT 
    'Sales Revenue'::TEXT as kpi_name,
    ROUND(COALESCE(c.sales_total, 0), 2) as current_value,
    ROUND(COALESCE(p.sales_total, 0), 2) as previous_value,
    ROUND(COALESCE(c.sales_total, 0) - COALESCE(p.sales_total, 0), 2) as change_value,
    CASE 
      WHEN COALESCE(p.sales_total, 0) = 0 THEN 
        CASE WHEN COALESCE(c.sales_total, 0) > 0 THEN 100 ELSE 0 END
      ELSE ROUND(((COALESCE(c.sales_total, 0) - COALESCE(p.sales_total, 0)) / p.sales_total) * 100, 2)
    END as change_percent
  FROM current_period c, compare_period p
  
  UNION ALL
  
  SELECT 
    'Donations'::TEXT as kpi_name,
    ROUND(COALESCE(c.donations_total, 0), 2) as current_value,
    ROUND(COALESCE(p.donations_total, 0), 2) as previous_value,
    ROUND(COALESCE(c.donations_total, 0) - COALESCE(p.donations_total, 0), 2) as change_value,
    CASE 
      WHEN COALESCE(p.donations_total, 0) = 0 THEN 
        CASE WHEN COALESCE(c.donations_total, 0) > 0 THEN 100 ELSE 0 END
      ELSE ROUND(((COALESCE(c.donations_total, 0) - COALESCE(p.donations_total, 0)) / p.donations_total) * 100, 2)
    END as change_percent
  FROM current_period c, compare_period p
  
  UNION ALL
  
  SELECT 
    'Waste Cost'::TEXT as kpi_name,
    ROUND(COALESCE(c.waste_total, 0), 2) as current_value,
    ROUND(COALESCE(p.waste_total, 0), 2) as previous_value,
    ROUND(COALESCE(c.waste_total, 0) - COALESCE(p.waste_total, 0), 2) as change_value,
    CASE 
      WHEN COALESCE(p.waste_total, 0) = 0 THEN 
        CASE WHEN COALESCE(c.waste_total, 0) > 0 THEN 100 ELSE 0 END
      ELSE ROUND(((COALESCE(c.waste_total, 0) - COALESCE(p.waste_total, 0)) / p.waste_total) * 100, 2)
    END as change_percent
  FROM current_period c, compare_period p;
$$;


ALTER FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") IS 'KPI comparison function with secure search_path - all table references are schema-qualified';



CREATE OR REPLACE FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric DEFAULT 10) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_id" "uuid", "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "status" character varying, "product_name" character varying, "product_sku" character varying, "product_category_code" "text", "product_category_name_en" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT * FROM inventory.get_low_stock_batches(p_store_id, p_threshold_quantity);
$$;


ALTER FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) IS 'Public wrapper for inventory.get_low_stock_batches';



CREATE OR REPLACE FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "ai_recommendation" character varying, "composite_score" numeric, "urgency_level" "text", "days_to_expiry" integer, "priority_order" integer, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
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
  WITH pending_items AS (
    SELECT 
      bts.*,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND bts.todo_state = 'pending_action'
    ORDER BY bts.priority_order, bts.composite_score DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT 
    pi.batch_id,
    pi.batch_number,
    pi.product_name,
    pi.product_brand,
    pi.expiry_date,
    pi.current_quantity,
    pi.ai_recommendation,
    pi.composite_score,
    pi.urgency_level,
    pi.days_to_expiry,
    pi.priority_order,
    pi.total_count
  FROM pending_items pi;
END;
$$;


ALTER FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Secure access to pending batch actions with RLS enforcement via store access check';



CREATE OR REPLACE FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text" DEFAULT NULL::"text", "p_brand" "text" DEFAULT NULL::"text", "p_sort_field" "text" DEFAULT 'created_at'::"text", "p_sort_direction" "text" DEFAULT 'desc'::"text", "p_page_size" integer DEFAULT 20, "p_page_offset" integer DEFAULT 0) RETURNS TABLE("product_id" "uuid", "sku" character varying, "name" character varying, "description" "text", "brand" character varying, "unit_type" character varying, "typical_shelf_life_days" integer, "base_cost_price" numeric, "base_selling_price" numeric, "total_stock" numeric, "active_batches_count" integer, "avg_days_to_expiry" numeric, "created_by" "uuid", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "barcode" "text", "image_url" "text", "open_food_facts_data" "jsonb", "last_verified" timestamp without time zone, "barcode_type" character varying, "is_verified" boolean, "verification_count" integer, "last_scanned_at" timestamp without time zone, "category_id" "uuid", "store_cost_price" numeric, "store_selling_price" numeric, "store_is_active" boolean, "store_sku" character varying, "supplier_code" character varying, "category_code" "text", "category_display_name" "text", "category_display_name_fr" "text", "calculated_total_stock" numeric, "calculated_active_batches_count" bigint, "total_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT * FROM inventory.get_products_paginated(
    p_store_id, p_category_code, p_brand, p_sort_field,
    p_sort_direction, p_page_size, p_page_offset
  );
$$;


ALTER FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) IS 'Public wrapper for inventory.get_products_paginated';



CREATE OR REPLACE FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "last_discount_percent" numeric, "last_action_time" timestamp without time zone, "hours_since_last_action" numeric, "total_discounted_quantity" numeric, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH discounted_items AS (
    SELECT 
      bts.*,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND bts.todo_state = 'recently_discounted'
    ORDER BY bts.last_action_time DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT 
    di.batch_id,
    di.batch_number,
    di.product_name,
    di.product_brand,
    di.expiry_date,
    di.current_quantity,
    di.last_discount_percent,
    di.last_action_time,
    di.hours_since_last_action,
    di.total_discounted_quantity,
    di.total_count
  FROM discounted_items di;
END;
$$;


ALTER FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Secure access to recently discounted batches with RLS enforcement via store access check';



CREATE OR REPLACE FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "days_since_expiry" integer, "ai_recommendation" character varying, "has_recent_actions" boolean, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH expired_items AS (
    SELECT 
      bts.batch_id,
      bts.batch_number,
      bts.product_name,
      bts.product_brand,
      bts.expiry_date,
      bts.current_quantity,
      (CURRENT_DATE - bts.expiry_date) as days_since_expiry,
      bts.ai_recommendation,
      (bts.total_actions_ever > 0) as has_recent_actions,
      COUNT(*) OVER() as total_count
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND (bts.todo_state = 'recently_expired' OR bts.expiry_date < CURRENT_DATE)
      AND bts.current_quantity > 0
    ORDER BY bts.expiry_date DESC, bts.priority_order
    LIMIT p_limit OFFSET p_offset
  )
  SELECT * FROM expired_items;
END;
$$;


ALTER FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Secure access to recently expired batches with RLS enforcement via store access check';



CREATE OR REPLACE FUNCTION "public"."get_store_alerts_optimized"("p_store_id" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_number" "text", "current_quantity" numeric, "selling_price" numeric, "cost_price" numeric, "expiry_date" "date", "location_code" "text", "supplier" "text", "sku" "text", "product_name" "text", "category" "text", "brand" "text", "unit_type" "text", "composite_score" numeric, "recommendation" "text", "calculated_at" timestamp without time zone, "urgency_level" "text", "days_to_expiry" integer, "potential_loss" numeric, "margin_percent" numeric, "urgency_level_calculated" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.batch_id,
    b.batch_number::TEXT,
    b.current_quantity,
    b.selling_price,
    b.cost_price,
    b.expiry_date,
    b.location_code::TEXT,
    b.supplier::TEXT,
    COALESCE(p.sku::TEXT, 'Unknown') as sku,
    COALESCE(p.name::TEXT, 'Unknown Product') as product_name,
    COALESCE(c.display_name_en::TEXT, 'Unknown') as category,
    COALESCE(p.brand::TEXT, '') as brand,
    COALESCE(p.unit_type::TEXT, 'pcs') as unit_type,
    COALESCE(ps.composite_score, 0) as composite_score,
    ps.recommendation::TEXT,
    ps.calculated_at,
    ps.urgency_level,
    -- Calculate days to expiry using proper date arithmetic
    (b.expiry_date - CURRENT_DATE) as days_to_expiry,
    -- Calculate potential loss
    (b.current_quantity * b.selling_price) as potential_loss,
    -- Calculate margin percentage
    (CASE 
      WHEN b.selling_price > 0 THEN 
        ((b.selling_price - b.cost_price) / b.selling_price) * 100
      ELSE 0 
    END) as margin_percent,
    -- Calculate urgency level based on expiry
    (CASE 
      WHEN (b.expiry_date - CURRENT_DATE) <= 0 THEN 'critical'
      WHEN (b.expiry_date - CURRENT_DATE) <= 1 THEN 'high'
      WHEN (b.expiry_date - CURRENT_DATE) <= 3 THEN 'medium'
      ELSE 'low'
    END)::TEXT as urgency_level_calculated
  FROM inventory.batches b
  LEFT JOIN inventory.store_products sp ON b.product_id = sp.product_id 
    AND b.store_id = sp.store_id
  LEFT JOIN inventory.products p ON sp.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  LEFT JOIN scoring.product_scores ps ON b.batch_id = ps.batch_id
  WHERE b.store_id = p_store_id 
    AND b.status = 'active'
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_store_alerts_optimized"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric DEFAULT 0.7) RETURNS TABLE("total_products" bigint, "total_batches" bigint, "active_alerts" bigint, "total_value" numeric, "expiring_items" bigint, "urgent_items" bigint, "actions_taken" bigint, "discount_actions" bigint, "total_discount_value" numeric, "avg_composite_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  WITH batch_analytics AS (
    SELECT 
      b.batch_id,
      b.current_quantity,
      b.selling_price,
      b.expiry_date,
      COALESCE(ps.composite_score, 0) as composite_score,
      (b.expiry_date - CURRENT_DATE) as days_to_expiry
    FROM inventory.batches b
    LEFT JOIN scoring.product_scores ps ON b.batch_id = ps.batch_id
    WHERE b.store_id = p_store_id 
      AND b.status = 'active'
      AND b.current_quantity > 0
  ),
  analytics_summary AS (
    SELECT 
      COUNT(*)::BIGINT as total_batches,
      SUM(current_quantity * selling_price) as total_value,
      COUNT(CASE WHEN days_to_expiry <= 3 THEN 1 END)::BIGINT as expiring_items,
      COUNT(CASE WHEN composite_score >= p_threshold THEN 1 END)::BIGINT as urgent_items,
      AVG(composite_score) as avg_composite_score
    FROM batch_analytics
  ),
  product_count AS (
    SELECT COUNT(*)::BIGINT as total_products
    FROM inventory.store_products
    WHERE store_id = p_store_id AND is_active = true
  ),
  action_stats AS (
    SELECT 
      COUNT(*)::BIGINT as actions_taken,
      COUNT(CASE WHEN action_type IN ('discount_aggressive', 'discount_moderate') THEN 1 END)::BIGINT as discount_actions,
      COALESCE(SUM(CASE WHEN action_type IN ('discount_aggressive', 'discount_moderate') 
        THEN (COALESCE(original_price, 0) - COALESCE(new_price, 0)) ELSE 0 END), 0) as total_discount_value
    FROM analytics.actions
    WHERE store_id = p_store_id 
      AND executed_at >= p_start_date 
      AND executed_at <= p_end_date
  )
  SELECT 
    pc.total_products,
    a.total_batches,
    a.urgent_items as active_alerts,
    ROUND(a.total_value, 2) as total_value,
    a.expiring_items,
    a.urgent_items,
    act.actions_taken,
    act.discount_actions,
    ROUND(act.total_discount_value, 2) as total_discount_value,
    ROUND(a.avg_composite_score, 2) as avg_composite_score
  FROM analytics_summary a
  CROSS JOIN product_count pc
  CROSS JOIN action_stats act;
END;
$$;


ALTER FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric) IS 'Returns comprehensive analytics overview including batch counts, values, and action statistics. Replaces multiple queries with single optimized call.';



CREATE OR REPLACE FUNCTION "public"."get_store_category_analytics"("p_store_id" "uuid") RETURNS TABLE("category" "text", "total_items" bigint, "total_value" numeric, "high_urgency" bigint, "avg_score" numeric, "expiring_3days" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(c.display_name_en, 'unknown')::TEXT as category,
    COUNT(*)::BIGINT as total_items,
    ROUND(SUM(b.current_quantity * b.selling_price), 2) as total_value,
    COUNT(CASE WHEN COALESCE(ps.composite_score, 0) >= 0.6 THEN 1 END)::BIGINT as high_urgency,
    ROUND(AVG(COALESCE(ps.composite_score, 0)), 4) as avg_score,
    COUNT(CASE WHEN (b.expiry_date - CURRENT_DATE) <= 3 THEN 1 END)::BIGINT as expiring_3days
  FROM inventory.batches b
  LEFT JOIN inventory.store_products sp ON b.product_id = sp.product_id 
    AND b.store_id = sp.store_id
  LEFT JOIN inventory.products p ON sp.product_id = p.product_id
  LEFT JOIN inventory.categories c ON p.category_id = c.category_id
  LEFT JOIN scoring.product_scores ps ON b.batch_id = ps.batch_id
  WHERE b.store_id = p_store_id 
    AND b.status = 'active'
    AND b.current_quantity > 0
  GROUP BY COALESCE(c.display_name_en, 'unknown')::TEXT
  ORDER BY total_value DESC;
END;
$$;


ALTER FUNCTION "public"."get_store_category_analytics"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_insights"("target_store_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
    result json;
BEGIN
    WITH 
    -- Total products count (through batches relationship)
    total_products AS (
        SELECT COUNT(DISTINCT p.product_id) as count
        FROM inventory.products p
        JOIN inventory.batches b ON p.product_id = b.product_id
        WHERE b.store_id = target_store_id
    ),
    
    -- Products by category with proper JOIN (through batches relationship)
    products_by_category AS (
        SELECT 
            c.display_name_en as category_name,
            c.category_code,
            COUNT(DISTINCT p.product_id) as product_count
        FROM inventory.products p
        JOIN inventory.batches b ON p.product_id = b.product_id
        JOIN inventory.categories c ON p.category_id = c.category_id
        WHERE b.store_id = target_store_id
        GROUP BY c.category_id, c.display_name_en, c.category_code
        ORDER BY product_count DESC
    ),
    
    -- Total batches count
    total_batches AS (
        SELECT COUNT(*) as count
        FROM inventory.batches b
        WHERE b.store_id = target_store_id
    ),
    
    -- Active batches (not expired/consumed)
    active_batches AS (
        SELECT COUNT(*) as count
        FROM inventory.batches b
        WHERE b.store_id = target_store_id
        AND b.expiry_date > CURRENT_DATE
        AND b.current_quantity > 0
    ),
    
    -- Expiring soon (within 7 days)
    expiring_soon AS (
        SELECT COUNT(*) as count
        FROM inventory.batches b
        WHERE b.store_id = target_store_id
        AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND b.current_quantity > 0
    ),
    
    -- Recently added products (last 30 days) - through batches
    recent_products AS (
        SELECT COUNT(DISTINCT p.product_id) as count
        FROM inventory.products p
        JOIN inventory.batches b ON p.product_id = b.product_id
        WHERE b.store_id = target_store_id
        AND p.created_at > CURRENT_DATE - INTERVAL '30 days'
    ),
    
    -- Low stock items (assuming current_quantity < 10 is low stock)
    low_stock_items AS (
        SELECT COUNT(DISTINCT p.product_id) as count
        FROM inventory.products p
        JOIN inventory.batches b ON p.product_id = b.product_id
        WHERE b.store_id = target_store_id
        AND b.current_quantity > 0
        AND b.current_quantity < 10
    )
    
    -- Build the final JSON response
    SELECT json_build_object(
        'store_id', target_store_id,
        'total_products', (SELECT count FROM total_products),
        'total_batches', (SELECT count FROM total_batches),
        'active_batches', (SELECT count FROM active_batches),
        'expiring_soon', (SELECT count FROM expiring_soon),
        'recent_products', (SELECT count FROM recent_products),
        'low_stock_items', (SELECT count FROM low_stock_items),
        'products_by_category', (
            SELECT json_agg(
                json_build_object(
                    'category_name', category_name,
                    'category_code', category_code,
                    'product_count', product_count
                )
            ) 
            FROM products_by_category
        ),
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_store_insights"("target_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_insights"("target_store_id" "uuid") IS 'Returns comprehensive store insights including product counts, batch status, and category breakdowns. Updated to use category_id with proper joins to categories table.';



CREATE OR REPLACE FUNCTION "public"."get_store_settings"("store_id_param" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result json;
  current_user_id uuid;
  has_access boolean;
BEGIN
  -- Get the current user once
  current_user_id := auth.uid();
  
  -- Optimized access check using EXISTS with indexes
  SELECT EXISTS(
    -- Check owner first (faster, indexed)
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = store_id_param 
      AND s.owner_id = current_user_id
      AND s.is_active = true
    UNION ALL
    -- Then check store_users (uses idx_store_users_user_active)
    SELECT 1 FROM business.store_users su 
    WHERE su.store_id = store_id_param 
      AND su.user_id = current_user_id 
      AND su.is_active = true
    LIMIT 1
  ) INTO has_access;
  
  IF NOT has_access THEN
    RAISE EXCEPTION 'Permission denied: You do not have access to this store';
  END IF;
  
  -- Return store data as JSON (single query)
  SELECT row_to_json(s) INTO result
  FROM business.stores s 
  WHERE s.store_id = store_id_param;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_store_settings"("store_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_settings"("store_id_param" "uuid") IS 'Optimized store settings retrieval with improved access check using UNION ALL and early exit';



CREATE OR REPLACE FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
DECLARE
  result json;
  current_user_id uuid;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  -- Check if user has access to this store
  IF NOT (
    EXISTS (SELECT 1 FROM business.stores s WHERE s.store_id = store_id_param AND s.owner_id = current_user_id)
    OR
    EXISTS (
      SELECT 1 FROM business.store_users su 
      WHERE su.store_id = store_id_param 
      AND su.user_id = current_user_id 
      AND su.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: You do not have access to this store';
  END IF;
  
  -- Return BOTH store data AND settings as JSON in a single query
  SELECT json_build_object(
    'store', row_to_json(s),
    'settings', (
      SELECT row_to_json(ss) 
      FROM business.store_settings ss 
      WHERE ss.store_id = store_id_param
    )
  ) INTO result
  FROM business.stores s 
  WHERE s.store_id = store_id_param;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") IS 'Optimized store settings fetch returning both basic info and advanced settings in single query. Expected: <100ms vs 1787ms';



CREATE OR REPLACE FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") RETURNS TABLE("critical_threshold" numeric, "warning_threshold" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ss.critical_threshold, 0.8) as critical_threshold,
    COALESCE(ss.warning_threshold, 0.7) as warning_threshold
  FROM business.store_settings ss
  WHERE ss.store_id = p_store_id
  UNION ALL
  SELECT 0.8::NUMERIC, 0.7::NUMERIC
  WHERE NOT EXISTS (
    SELECT 1 FROM business.store_settings WHERE store_id = p_store_id
  )
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") IS 'Returns store-specific critical and warning thresholds with fallback to defaults (0.8, 0.7). Eliminates need for separate threshold queries.';



CREATE OR REPLACE FUNCTION "public"."get_store_users"("input_store_id" "uuid") RETURNS TABLE("store_id" "uuid", "user_id" "uuid", "role_in_store" character varying, "permissions" "jsonb", "assigned_at" timestamp without time zone, "assigned_by" "uuid", "is_active" boolean, "can_use_pin_auth" boolean, "pin_access_level" character varying, "pin_permissions" "jsonb", "email" character varying, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "raw_user_meta_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_user_effective_role TEXT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- If no authenticated user, return empty (but don't error)
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- ✨ OPTIMIZATION: Use materialized view for instant permission lookup
  -- FIX: Fully qualify the column to avoid ambiguity
  SELECT usp.effective_role INTO current_user_effective_role
  FROM business.user_store_permissions usp
  WHERE usp.store_id = input_store_id
    AND usp.user_id = current_user_id;
  
  RETURN QUERY
  SELECT 
    su.store_id,
    su.user_id,
    su.role_in_store,
    su.permissions,
    su.assigned_at,
    su.assigned_by,
    su.is_active,
    su.can_use_pin_auth,
    su.pin_access_level,
    su.pin_permissions,
    au.email,
    au.created_at,
    au.updated_at,
    au.raw_user_meta_data
  FROM business.store_users su
  JOIN auth.users au ON su.user_id = au.id
  WHERE su.store_id = input_store_id  -- FIX: This is now unambiguous because su is aliased
    AND (
      -- Owners and managers see ALL users (active and inactive)
      current_user_effective_role IN ('owner', 'manager')
      OR
      -- Employees only see active users (including themselves)
      (current_user_effective_role = 'employee' AND su.is_active = TRUE)
      OR
      -- Non-store users only see active users
      (current_user_effective_role IS NULL AND su.is_active = TRUE)
    )
  ORDER BY su.assigned_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_store_users"("input_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_users"("input_store_id" "uuid") IS 'Optimized user listing using materialized view. Fixed ambiguous column references. ~98% faster than previous version.';



CREATE OR REPLACE FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer DEFAULT 0, "page_size" integer DEFAULT 20, "role_filter" character varying DEFAULT NULL::character varying, "pin_auth_filter" boolean DEFAULT NULL::boolean) RETURNS TABLE("store_id" "uuid", "user_id" "uuid", "role_in_store" character varying, "permissions" "jsonb", "assigned_at" timestamp without time zone, "assigned_by" "uuid", "is_active" boolean, "can_use_pin_auth" boolean, "pin_access_level" character varying, "pin_permissions" "jsonb", "email" character varying, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "raw_user_meta_data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_user_effective_role TEXT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- If no authenticated user, return empty
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- ✨ OPTIMIZATION: Use materialized view for instant permission lookup
  -- FIX: Fully qualify the column to avoid ambiguity
  SELECT usp.effective_role INTO current_user_effective_role
  FROM business.user_store_permissions usp
  WHERE usp.store_id = input_store_id
    AND usp.user_id = current_user_id;
  
  RETURN QUERY
  SELECT 
    su.store_id,
    su.user_id,
    su.role_in_store,
    su.permissions,
    su.assigned_at,
    su.assigned_by,
    su.is_active,
    su.can_use_pin_auth,
    su.pin_access_level,
    su.pin_permissions,
    au.email,
    au.created_at,
    au.updated_at,
    au.raw_user_meta_data,
    COUNT(*) OVER() as total_count
  FROM business.store_users su
  JOIN auth.users au ON su.user_id = au.id
  WHERE su.store_id = input_store_id  -- FIX: This is now unambiguous because su is aliased
    AND (
      -- Same visibility logic as get_store_users
      current_user_effective_role IN ('owner', 'manager')
      OR
      (current_user_effective_role = 'employee' AND su.is_active = TRUE)
      OR
      (current_user_effective_role IS NULL AND su.is_active = TRUE)
    )
    -- Apply filters
    AND (role_filter IS NULL OR su.role_in_store = role_filter)
    AND (pin_auth_filter IS NULL OR su.can_use_pin_auth = pin_auth_filter)
  ORDER BY su.assigned_at DESC
  LIMIT page_size
  OFFSET page_number * page_size;
END;
$$;


ALTER FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer, "page_size" integer, "role_filter" character varying, "pin_auth_filter" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer, "page_size" integer, "role_filter" character varying, "pin_auth_filter" boolean) IS 'Optimized paginated user listing using materialized view. Fixed ambiguous column references. ~98% faster than previous version.';



CREATE OR REPLACE FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) RETURNS TABLE("expired_items" bigint, "expiring_soon" bigint, "waste_value" numeric, "prevention_potential" numeric, "waste_by_category" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  waste_categories JSONB;
BEGIN
  -- Build waste by category JSON
  SELECT jsonb_object_agg(
    category, 
    jsonb_build_object(
      'count', item_count,
      'value', category_value
    )
  ) INTO waste_categories
  FROM (
    SELECT 
      COALESCE(c.display_name_en, 'unknown') as category,
      COUNT(*)::BIGINT as item_count,
      ROUND(SUM(b.current_quantity * b.selling_price), 2) as category_value
    FROM inventory.batches b
    LEFT JOIN inventory.store_products sp ON b.product_id = sp.product_id 
      AND b.store_id = sp.store_id
    LEFT JOIN inventory.products p ON sp.product_id = p.product_id
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE b.store_id = p_store_id 
      AND b.status = 'expired'
      AND b.updated_at >= p_start_date 
      AND b.updated_at <= p_end_date
    GROUP BY COALESCE(c.display_name_en, 'unknown')
  ) category_waste;

  -- Return comprehensive waste analytics
  RETURN QUERY
  WITH waste_metrics AS (
    SELECT 
      -- Expired items in timeframe
      (SELECT COUNT(*)::BIGINT 
       FROM inventory.batches 
       WHERE store_id = p_store_id 
         AND status = 'expired'
         AND updated_at >= p_start_date 
         AND updated_at <= p_end_date) as expired_items,
      
      -- Items expiring soon (next 3 days)
      (SELECT COUNT(*)::BIGINT
       FROM inventory.batches
       WHERE store_id = p_store_id 
         AND status = 'active'
         AND current_quantity > 0
         AND expiry_date <= (CURRENT_DATE + INTERVAL '3 days')) as expiring_soon,
      
      -- Total waste value in timeframe
      (SELECT COALESCE(SUM(current_quantity * selling_price), 0)
       FROM inventory.batches
       WHERE store_id = p_store_id 
         AND status = 'expired'
         AND updated_at >= p_start_date 
         AND updated_at <= p_end_date) as waste_value,
      
      -- Prevention potential (value of items expiring soon)
      (SELECT COALESCE(SUM(current_quantity * selling_price), 0)
       FROM inventory.batches
       WHERE store_id = p_store_id 
         AND status = 'active'
         AND current_quantity > 0
         AND expiry_date <= (CURRENT_DATE + INTERVAL '3 days')) as prevention_potential
  )
  SELECT 
    expired_items,
    expiring_soon,
    ROUND(waste_value, 2) as waste_value,
    ROUND(prevention_potential, 2) as prevention_potential,
    COALESCE(waste_categories, '{}'::jsonb) as waste_by_category
  FROM waste_metrics;
END;
$$;


ALTER FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) IS 'Returns waste analytics including expired items, prevention potential, and category breakdown.';



CREATE OR REPLACE FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) RETURNS TABLE("store_id" "uuid", "store_name" character varying, "store_code" character varying, "business_name" character varying, "address" "text", "city" character varying, "postal_code" character varying, "country" character varying, "timezone" character varying, "store_type" "text", "size_category" character varying, "default_markup_percent" numeric, "waste_reduction_target_percent" numeric, "owner_id" "uuid", "is_active" boolean, "onboarding_completed" boolean, "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "batch_count" bigint)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT 
    s.*,
    COALESCE(COUNT(b.batch_id), 0) as batch_count
  FROM business.stores s
  LEFT JOIN inventory.batches b ON s.store_id = b.store_id 
    AND b.status = 'active'
    AND b.current_quantity > 0
  WHERE s.store_id = ANY(store_ids)
    AND s.is_active = true
  GROUP BY s.store_id
  ORDER BY batch_count DESC, s.store_name ASC;
$$;


ALTER FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) IS 'Get stores with their active batch counts. Search path set for security.';



CREATE OR REPLACE FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring'
    AS $$
DECLARE
    v_urgency_levels TEXT[];
    v_action_types TEXT[];
    v_batch_statuses TEXT[];
    v_product_name TEXT;
    v_days_to_expiry_min INT;
    v_days_to_expiry_max INT;
BEGIN
    -- Extract filter values from JSONB
    v_urgency_levels := ARRAY(SELECT jsonb_array_elements_text(p_filters->'urgency_level'));
    v_action_types := ARRAY(SELECT jsonb_array_elements_text(p_filters->'action_type'));
    v_batch_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'batch_status'));
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::INT;
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::INT;

    -- Use a CTE to filter once and count multiple times for better performance
    RETURN (
        WITH filtered_todos AS (
            SELECT 
                completion_status,
                batch_status,
                days_to_expiry
            FROM inventory.batch_todo_states
            WHERE store_id = p_store_id
              -- Apply universal filters (fixed: COALESCE array_length to handle empty arrays)
              AND (COALESCE(array_length(v_urgency_levels, 1), 0) = 0 OR urgency_level = ANY(v_urgency_levels))
              AND (COALESCE(array_length(v_action_types, 1), 0) = 0 OR ai_recommendation::text = ANY(v_action_types))
              AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
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
             WHERE batch_status = 'active'
               AND days_to_expiry >= COALESCE(v_days_to_expiry_min, 0)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'expired',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE batch_status = 'expired'
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max))
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb") IS 'Returns counts for all todo tabs (pending, in_progress, completed, expiring, expired) based on filters.
This is more efficient than fetching all todos just to get counts.
Uses a CTE to apply common filters once, then counts each category separately.

Filter parameters:
- urgency_level: array of urgency levels (critical, high, medium, low)
- action_type: array of AI recommendations (discount, donate, dispose, etc)
- batch_status: array of batch statuses (active, expired, etc)
- product_name: partial match on product name (case insensitive)
- days_to_expiry_min: minimum days to expiry
- days_to_expiry_max: maximum days to expiry

Example usage:
SELECT get_todos_counts_with_filters(
    ''17215fdb-b067-4ff7-b1d8-ebcd49d4f02f''::uuid,
    ''{"urgency_level": ["critical", "high"], "product_name": "milk"}''::jsonb
);';



CREATE OR REPLACE FUNCTION "public"."get_todos_dashboard"("p_store_id" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "product_name" character varying, "product_brand" character varying, "expiry_date" "date", "current_quantity" numeric, "days_to_expiry" integer, "urgency_level" "text", "ai_recommendation" character varying, "composite_score" numeric, "last_action_type" "public"."action_type", "last_action_time" timestamp without time zone, "last_discount_percent" numeric, "completion_status" "text", "todo_state" "text", "priority_order" integer, "hours_since_last_action" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_todos_dashboard"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") RETURNS TABLE("todo_state" character varying, "item_count" bigint, "total_value" numeric, "avg_score" numeric, "urgency_distribution" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring', 'business'
    AS $$
BEGIN
  RETURN QUERY
  WITH dashboard_data AS (
    SELECT 
      bts.todo_state,
      COUNT(*) as item_count,
      SUM(bts.current_quantity * 
          COALESCE(sp.selling_price, p.base_selling_price, 0)) as total_value,
      AVG(bts.composite_score) as avg_score,
      jsonb_object_agg(
        COALESCE(bts.urgency_level, 'none'), 
        COUNT(*) FILTER (WHERE bts.urgency_level IS NOT NULL)
      ) as urgency_distribution
    FROM inventory.batch_todo_states bts
    LEFT JOIN inventory.batches b ON bts.batch_id = b.batch_id
    LEFT JOIN inventory.products p ON b.product_id = p.product_id
    LEFT JOIN inventory.store_products sp ON b.store_id = sp.store_id AND b.product_id = sp.product_id
    WHERE bts.store_id = p_store_id
    GROUP BY bts.todo_state
  )
  SELECT 
    dd.todo_state,
    dd.item_count,
    COALESCE(dd.total_value, 0) as total_value,
    ROUND(COALESCE(dd.avg_score, 0), 3) as avg_score,
    COALESCE(dd.urgency_distribution, '{}'::jsonb) as urgency_distribution
  FROM dashboard_data dd
  ORDER BY 
    CASE dd.todo_state
      WHEN 'pending_action' THEN 1
      WHEN 'recently_discounted' THEN 2
      WHEN 'recently_donated' THEN 3
      WHEN 'recently_expired' THEN 4
      WHEN 'needs_reeval' THEN 5
      ELSE 6
    END;
END;
$$;


ALTER FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") IS 'SECURITY: SECURITY DEFINER function. Enforces store access via business.stores RLS.
Last updated: 2025-01 - Security hardening for materialized view access.';



CREATE OR REPLACE FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") RETURNS TABLE("pending_actions_count" bigint, "recently_discounted_count" bigint, "recently_donated_count" bigint, "recently_expired_count" bigint, "needs_reeval_count" bigint, "total_active_count" bigint, "last_refreshed" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory'
    AS $$
DECLARE
  user_store_access boolean := false;
BEGIN
  -- Check if user has access to this store
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE todo_state = 'pending_action') as pending_actions_count,
    COUNT(*) FILTER (WHERE todo_state = 'recently_discounted') as recently_discounted_count,
    COUNT(*) FILTER (WHERE todo_state = 'recently_donated') as recently_donated_count,
    COUNT(*) FILTER (WHERE todo_state = 'recently_expired') as recently_expired_count,
    COUNT(*) FILTER (WHERE todo_state = 'needs_reeval') as needs_reeval_count,
    COUNT(*) as total_active_count,
    MAX(view_refreshed_at) as last_refreshed
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id;
END;
$$;


ALTER FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") IS 'Secure access to batch todo summary with RLS enforcement via store access check';



CREATE OR REPLACE FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("batch_id" "uuid", "store_id" "uuid", "batch_number" character varying, "expiry_date" "date", "current_quantity" numeric, "available_quantity" numeric, "batch_status" character varying, "product_name" character varying, "product_brand" character varying, "ai_recommendation" character varying, "composite_score" numeric, "urgency_level" "text", "ai_calculated_at" timestamp without time zone, "last_action_type" "public"."action_type", "last_action_time" timestamp without time zone, "last_action_quantity" numeric, "last_discount_percent" numeric, "total_actions_ever" bigint, "total_discounted_quantity" numeric, "total_donated_quantity" numeric, "total_disposed_quantity" numeric, "total_sold_quantity" numeric, "total_ignored_quantity" numeric, "cost_price" numeric, "selling_price" numeric, "current_selling_price" numeric, "profit_margin" numeric, "profit_margin_percent" numeric, "potential_loss_value" numeric, "potential_revenue_value" numeric, "current_total_value" numeric, "unit_price" numeric, "completion_status" "text", "todo_state" "text", "priority_order" integer, "days_to_expiry" integer, "hours_since_last_action" numeric, "view_refreshed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'scoring', 'business'
    AS $$
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

    -- Query the materialized view with filters
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
$$;


ALTER FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb", "p_limit" integer, "p_offset" integer) IS 'SECURITY: SECURITY DEFINER function. Enforces store access via business.stores RLS.
CRITICAL: Verify filter JSON cannot bypass store restrictions.
Last updated: 2025-01 - Security hardening for materialized view access.';



CREATE OR REPLACE FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'scoring', 'business', 'public'
    AS $$
  SELECT inventory.get_urgent_todos_count(p_store_id);
$$;


ALTER FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") IS 'Public wrapper for inventory.get_urgent_todos_count';



CREATE OR REPLACE FUNCTION "public"."get_user_by_username"("p_username" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    store_record RECORD;
BEGIN
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data,
        COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, au.email) as full_name,
        COALESCE((au.raw_user_meta_data->>'username')::TEXT, '') as username,
        COALESCE((au.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active
    INTO user_record
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'username') = p_username
    AND au.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Get user's primary store info
    SELECT s.store_id, s.store_name, su.role_in_store
    INTO store_record
    FROM business.store_users su
    JOIN business.stores s ON su.store_id = s.store_id
    WHERE su.user_id = user_record.id 
    AND su.is_active = true
    ORDER BY su.assigned_at ASC
    LIMIT 1;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'username', user_record.username,
            'full_name', user_record.full_name,
            'is_active', user_record.is_active,
            'store_id', COALESCE(store_record.store_id, NULL),
            'store_name', COALESCE(store_record.store_name, NULL),
            'role_in_store', COALESCE(store_record.role_in_store, NULL)
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_user_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  requesting_user_id UUID;
  user_record RECORD;
  user_stores_array JSON[];
  current_store_data JSON;
  global_roles_data JSON;
  permission_summary_data JSON;
  result JSON;
BEGIN
  -- 🔒 SECURITY CHECK 1: Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- 🔒 SECURITY CHECK 2: Ensure user is authenticated
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;
  
  -- 🔒 SECURITY CHECK 3: Users can only access their own profile
  -- (Allow service role to access any profile for admin operations)
  IF requesting_user_id != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Users can only access their own profile';
  END IF;

  -- Get user data from auth.users
  SELECT 
    id,
    email,
    phone,
    created_at,
    updated_at,
    raw_user_meta_data,
    email_confirmed_at IS NOT NULL as email_verified,
    phone_confirmed_at IS NOT NULL as phone_verified
  INTO user_record
  FROM auth.users 
  WHERE id = p_user_id;

  -- Return null if user doesn't exist
  IF user_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 🔒 SECURITY CHECK 4: Only get stores the user actually has access to
  SELECT array_agg(
    json_build_object(
      'store_id', s.store_id,
      'store_name', s.store_name,
      'store_code', s.store_code,
      'business_name', s.business_name,
      'address', s.address,
      'city', s.city,
      'postal_code', s.postal_code,
      'country', s.country,
      'phone', s.phone,
      'email', s.email,
      'timezone', s.timezone,
      'is_active', s.is_active,
      'role_in_store', su.role_in_store,
      'permissions', su.permissions,
      'is_active_in_store', su.is_active,
      'can_use_pin_auth', su.can_use_pin_auth,
      'pin_access_level', su.pin_access_level,
      'joined_at', su.assigned_at
    )
  ) INTO user_stores_array
  FROM business.store_users su
  INNER JOIN business.stores s ON s.store_id = su.store_id
  WHERE su.user_id = p_user_id  -- Only user's own store relationships
    AND su.is_active = true 
    AND s.is_active = true;

  -- 🔒 SECURITY CHECK 5: Validate store access if store_id provided
  current_store_data := NULL;
  IF p_store_id IS NOT NULL THEN
    -- Verify user has access to the requested store
    IF NOT EXISTS (
      SELECT 1 FROM business.store_users 
      WHERE user_id = p_user_id 
        AND store_id = p_store_id 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied: User does not have access to store %', p_store_id;
    END IF;

    -- Get current store context
    SELECT json_build_object(
      'store_id', p_store_id,
      'store_name', s.store_name,
      'timezone', s.timezone,
      'store_is_active', s.is_active,
      'role_in_store', su.role_in_store,
      'permissions', COALESCE(su.permissions, '{}'::jsonb),
      'is_active_in_store', COALESCE(su.is_active, false),
      'can_use_pin_auth', COALESCE(su.can_use_pin_auth, false),
      'pin_access_level', COALESCE(su.pin_access_level, 'basic')
    ) INTO current_store_data
    FROM business.store_users su
    INNER JOIN business.stores s ON s.store_id = su.store_id
    WHERE su.user_id = p_user_id 
      AND su.store_id = p_store_id;
  END IF;

  -- Get global roles (only from user's own store relationships)
  SELECT json_agg(DISTINCT role_name) INTO global_roles_data
  FROM (
    SELECT 
      CASE 
        WHEN su.role_in_store = 'owner' THEN 'admin'
        WHEN su.role_in_store = 'manager' THEN 'manager'
        WHEN su.role_in_store IN ('employee', 'staff') THEN 'employee'
        ELSE NULL
      END as role_name
    FROM business.store_users su
    WHERE su.user_id = p_user_id  -- Only user's own roles
      AND su.is_active = true
  ) derived_roles
  WHERE role_name IS NOT NULL;

  -- Get permission summary if current store exists
  permission_summary_data := NULL;
  IF current_store_data IS NOT NULL THEN
    SELECT json_build_object(
      'is_owner', (current_store_data->>'role_in_store') = 'owner',
      'is_manager', (current_store_data->>'role_in_store') = 'manager',
      'is_employee', (current_store_data->>'role_in_store') IN ('employee', 'staff'),
      'can_manage_users', 
        (current_store_data->>'role_in_store') = 'owner' OR 
        COALESCE(((current_store_data->'permissions')->>'can_manage_users')::boolean, false),
      'can_view_analytics', 
        (current_store_data->>'role_in_store') IN ('owner', 'manager') OR 
        COALESCE(((current_store_data->'permissions')->>'can_view_analytics')::boolean, false),
      'can_apply_discounts',
        (current_store_data->>'role_in_store') IN ('owner', 'manager') OR 
        COALESCE(((current_store_data->'permissions')->>'can_apply_discounts')::boolean, false),
      'can_scan_products',
        COALESCE(((current_store_data->'permissions')->>'can_scan_products')::boolean, true),
      'can_upload_inventory',
        (current_store_data->>'role_in_store') IN ('owner', 'manager') OR 
        COALESCE(((current_store_data->'permissions')->>'can_upload_inventory')::boolean, false),
      'can_manage_settings',
        (current_store_data->>'role_in_store') = 'owner' OR 
        COALESCE(((current_store_data->'permissions')->>'can_manage_settings')::boolean, false)
    ) INTO permission_summary_data;
  END IF;

  -- Build the complete result
  result := json_build_object(
    'user', json_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'phone', user_record.phone,
      'created_at', user_record.created_at,
      'updated_at', user_record.updated_at,
      'email_verified', user_record.email_verified,
      'phone_verified', user_record.phone_verified,
      'username', COALESCE(user_record.raw_user_meta_data->>'username', ''),
      'full_name', COALESCE(user_record.raw_user_meta_data->>'full_name', ''),
      'is_active', COALESCE((user_record.raw_user_meta_data->>'is_active')::boolean, true),
      'avatar_url', COALESCE(user_record.raw_user_meta_data->>'avatar_url', ''),
      'language_preference', COALESCE(user_record.raw_user_meta_data->>'language_preference', 'en'),
      'last_login', COALESCE(user_record.raw_user_meta_data->>'last_login', ''),
      'pin_hash', COALESCE(user_record.raw_user_meta_data->>'pin_hash', ''),
      'pin_set_at', COALESCE(user_record.raw_user_meta_data->>'pin_set_at', ''),
      'pin_attempts', COALESCE((user_record.raw_user_meta_data->>'pin_attempts')::integer, 0),
      'requires_pin', COALESCE((user_record.raw_user_meta_data->>'requires_pin')::boolean, false),
      'pin_expires_at', COALESCE(user_record.raw_user_meta_data->>'pin_expires_at', ''),
      'pin_locked_until', COALESCE(user_record.raw_user_meta_data->>'pin_locked_until', ''),
      'pin_delivery_method', COALESCE(user_record.raw_user_meta_data->>'pin_delivery_method', ''),
      'migrated_from_user_mgmt', COALESCE((user_record.raw_user_meta_data->>'migrated_from_user_mgmt')::boolean, false),
      'raw_user_meta_data', COALESCE(user_record.raw_user_meta_data, '{}'::jsonb)
    ),
    'user_stores', COALESCE(user_stores_array, ARRAY[]::json[]),
    'current_store', current_store_data,
    'global_roles', COALESCE(global_roles_data, '[]'::json),
    'permission_summary', permission_summary_data,
    'metadata', json_build_object(
      'query_timestamp', NOW(),
      'has_store_access', COALESCE(array_length(user_stores_array, 1), 0) > 0,
      'total_stores', COALESCE(array_length(user_stores_array, 1), 0),
      'requested_store_id', p_store_id,
      'has_current_store_access', current_store_data IS NOT NULL,
      'requesting_user_id', requesting_user_id
    )
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid") IS 'Securely returns complete user profile including store roles and permissions. 
Uses internal security checks to ensure users can only access their own data.
Service role can access any user for admin operations.';



CREATE OR REPLACE FUNCTION "public"."get_user_preferences_fast"() RETURNS TABLE("user_id" "uuid", "primary_store_id" "uuid", "preferences" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'user_mgmt', 'public'
    AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user once
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Direct query bypassing RLS for performance
  -- Uses primary key index for instant lookup
  RETURN QUERY
  SELECT 
    up.user_id,
    up.primary_store_id,
    up.preferences,
    up.created_at,
    up.updated_at
  FROM user_mgmt.user_preferences up
  WHERE up.user_id = current_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_preferences_fast"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_preferences_fast"() IS 'Optimized user preferences fetch bypassing RLS for single-row PK lookup. Expected: <10ms vs 400ms with RLS';



CREATE OR REPLACE FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") RETURNS TABLE("user_id" "uuid", "role_in_store" character varying, "permissions" "jsonb", "is_active" boolean, "can_use_pin_auth" boolean, "pin_access_level" character varying, "store_id" "uuid", "store_name" character varying)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.user_id,
    su.role_in_store,
    su.permissions,
    su.is_active,
    su.can_use_pin_auth,
    su.pin_access_level,
    su.store_id,
    s.store_name
  FROM business.store_users su
  LEFT JOIN business.stores s ON su.store_id = s.store_id
  WHERE su.user_id = p_user_id AND su.store_id = p_store_id;
END;
$$;


ALTER FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") IS 'Get user role and permissions for specific store. Search path set for security.';



CREATE OR REPLACE FUNCTION "public"."get_user_stores_with_details"() RETURNS TABLE("role_in_store" "text", "permissions" "jsonb", "assigned_at" timestamp with time zone, "store_id" "uuid", "store_name" "text", "store_code" "text", "business_name" "text", "address" "text", "city" "text", "postal_code" "text", "country" "text", "timezone" "text", "store_type" "text", "size_category" "text", "default_markup_percent" numeric, "waste_reduction_target_percent" numeric, "owner_id" "uuid", "is_active" boolean, "onboarding_completed" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Return user stores with all details in a single optimized query
  RETURN QUERY
  SELECT 
    su.role_in_store::text,
    su.permissions,
    su.assigned_at,
    s.store_id,
    s.store_name,
    s.store_code,
    s.business_name,
    s.address,
    s.city,
    s.postal_code,
    s.country,
    s.timezone,
    s.store_type,
    s.size_category,
    s.default_markup_percent,
    s.waste_reduction_target_percent,
    s.owner_id,
    s.is_active,
    s.onboarding_completed,
    s.created_at,
    s.updated_at
  FROM business.store_users su
  INNER JOIN business.stores s ON su.store_id = s.store_id
  WHERE su.user_id = current_user_id
    AND su.is_active = true
    AND s.is_active = true
  ORDER BY s.store_name;
END;
$$;


ALTER FUNCTION "public"."get_user_stores_with_details"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_stores_with_details"() IS 'Optimized fetch of user stores with all details bypassing RLS overhead. Expected: <50ms vs 340ms';



CREATE OR REPLACE FUNCTION "public"."get_users_with_metadata"() RETURNS TABLE("id" "uuid", "email" character varying, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "raw_user_meta_data" "jsonb", "username" "text", "full_name" "text", "is_active" boolean, "avatar_url" "text", "last_login" "text", "email_verified" boolean, "phone_verified" boolean, "phone" "text", "language_preference" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.updated_at,
    u.raw_user_meta_data,
    -- Extract metadata fields with defaults (REMOVED PIN-related fields)
    COALESCE(u.raw_user_meta_data->>'username', '') as username,
    COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
    COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) as is_active,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
    COALESCE(u.raw_user_meta_data->>'last_login', '') as last_login,
    COALESCE((u.raw_user_meta_data->>'email_verified')::boolean, false) as email_verified,
    COALESCE((u.raw_user_meta_data->>'phone_verified')::boolean, false) as phone_verified,
    -- Keep existing fields
    u.phone,
    COALESCE(u.raw_user_meta_data->>'language_preference', 'fr') as language_preference
  FROM auth.users u
  WHERE u.deleted_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_users_with_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'user_mgmt'
    AS $$
BEGIN
  INSERT INTO user_mgmt.users (user_id, username, email, password_hash, full_name, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'auth_managed',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default 'viewer' role to new users
  INSERT INTO user_mgmt.user_roles (user_id, role_id)
  SELECT NEW.id, role_id 
  FROM user_mgmt.roles 
  WHERE role_name = 'viewer'
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function to handle new user creation with secure search_path set to prevent SQL injection vulnerabilities';



CREATE OR REPLACE FUNCTION "public"."has_batches"("p_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'inventory', 'public'
    AS $$
  SELECT inventory.has_batches(p_store_id);
$$;


ALTER FUNCTION "public"."has_batches"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_batches"("p_store_id" "uuid") IS 'Public wrapper for inventory.has_batches';



CREATE OR REPLACE FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text" DEFAULT 'employee'::"text", "p_permissions" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'public'
    AS $$
DECLARE
    v_inviting_user_id UUID;
    v_target_user_id UUID;
    v_existing_role TEXT;
    v_store_name TEXT;
    v_result JSONB;
BEGIN
    -- Get the current user ID (who is doing the inviting)
    v_inviting_user_id := auth.uid();
    
    -- Check if inviting user is authenticated
    IF v_inviting_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to invite users';
    END IF;
    
    -- Check if inviting user has permission to invite users to this store
    IF NOT EXISTS (
        SELECT 1 FROM business.store_users 
        WHERE store_id = p_store_id 
        AND user_id = v_inviting_user_id 
        AND role_in_store IN ('owner', 'manager')
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users to this store';
    END IF;
    
    -- Find the target user by email
    SELECT id INTO v_target_user_id 
    FROM auth.users 
    WHERE email = p_user_email;
    
    IF v_target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'user_not_found',
            'message', 'No user found with this email address'
        );
    END IF;
    
    -- Check if user is already associated with this store
    SELECT role_in_store INTO v_existing_role 
    FROM business.store_users 
    WHERE store_id = p_store_id AND user_id = v_target_user_id;
    
    IF v_existing_role IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_member',
            'message', 'User is already a member of this store',
            'existing_role', v_existing_role
        );
    END IF;
    
    -- Get store name for response
    SELECT store_name INTO v_store_name 
    FROM business.stores 
    WHERE store_id = p_store_id;
    
    -- Set default permissions based on role
    IF p_permissions IS NULL THEN
        p_permissions := CASE p_role_in_store
            WHEN 'owner' THEN jsonb_build_object(
                'can_scan_products', true,
                'can_scan_in', true,
                'can_scan_out', true,
                'can_view_basic_inventory', true,
                'can_apply_discounts', true,
                'can_view_analytics', true,
                'can_upload_inventory', true,
                'can_manage_users', true,
                'can_manage_settings', true
            )
            WHEN 'manager' THEN jsonb_build_object(
                'can_scan_products', true,
                'can_scan_in', true,
                'can_scan_out', true,
                'can_view_basic_inventory', true,
                'can_apply_discounts', true,
                'can_view_analytics', true,
                'can_upload_inventory', true,
                'can_manage_users', true,
                'can_manage_settings', false
            )
            ELSE jsonb_build_object(
                'can_scan_products', true,
                'can_scan_in', true,
                'can_scan_out', true,
                'can_view_basic_inventory', true,
                'can_apply_discounts', false,
                'can_view_analytics', false,
                'can_upload_inventory', false,
                'can_manage_users', false,
                'can_manage_settings', false
            )
        END;
    END IF;
    
    -- Add user to store
    INSERT INTO business.store_users (
        store_id,
        user_id,
        role_in_store,
        permissions,
        assigned_by,
        is_active,
        can_use_pin_auth,
        pin_access_level,
        assigned_at
    ) VALUES (
        p_store_id,
        v_target_user_id,
        p_role_in_store,
        p_permissions,
        v_inviting_user_id,
        true,
        true,
        'basic',
        NOW()
    );
    
    -- Return success with user info
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_user_id,
        'email', p_user_email,
        'role', p_role_in_store,
        'store_name', v_store_name,
        'message', 'User successfully invited to store'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'database_error',
        'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text", "p_permissions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text", "p_permissions" "jsonb") IS 'Invite an existing user to join a store with specified role and permissions';



CREATE OR REPLACE FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") RETURNS TABLE("found" boolean, "source" "text", "product_data" "jsonb", "cached_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  cache_result RECORD;
  product_result RECORD;
BEGIN
  -- First check cache
  SELECT * INTO cache_result
  FROM inventory.product_recognition_cache
  WHERE barcode = barcode_param
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      TRUE as found,
      'cache'::TEXT as source,
      cache_result.open_food_facts_data as product_data,
      cache_result.last_verified as cached_at;
    RETURN;
  END IF;
  
  -- Check Supabase products
  SELECT * INTO product_result
  FROM inventory.products
  WHERE barcode = barcode_param
  LIMIT 1;
  
  IF FOUND THEN
    -- Cache the product for future lookups
    INSERT INTO inventory.product_recognition_cache (
      barcode,
      product_name,
      brand,
      category,
      image_url,
      open_food_facts_data,
      is_verified,
      verification_count
    ) VALUES (
      barcode_param,
      product_result.name,
      product_result.brand,
      (SELECT display_name_en FROM inventory.categories WHERE category_id = product_result.category_id),  -- Fixed: Actually get category name
      product_result.image_url,
      COALESCE(product_result.open_food_facts_data, 
        jsonb_build_object(
          'product_name', product_result.name,
          'brands', product_result.brand,
          'image_front_url', product_result.image_url
        )
      ),
      product_result.is_verified,
      1
    ) ON CONFLICT (barcode) DO UPDATE SET
      last_verified = NOW();
    
    RETURN QUERY SELECT 
      TRUE as found,
      'supabase'::TEXT as source,
      COALESCE(product_result.open_food_facts_data, 
        jsonb_build_object(
          'product_name', product_result.name,
          'brands', product_result.brand,
          'image_front_url', product_result.image_url
        )
      ) as product_data,
      NOW() as cached_at;
    RETURN;
  END IF;
  
  -- Not found anywhere
  RETURN QUERY SELECT 
    FALSE as found,
    'none'::TEXT as source,
    NULL::JSONB as product_data,
    NULL::TIMESTAMPTZ as cached_at;  -- Changed to TIMESTAMPTZ here too
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return not found
    RAISE WARNING 'lookup_product_with_cache error for barcode %: %', barcode_param, SQLERRM;
    RETURN QUERY SELECT 
      FALSE as found,
      'error'::TEXT as source,
      NULL::JSONB as product_data,
      NULL::TIMESTAMPTZ as cached_at;
END;
$$;


ALTER FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") IS 'Optimized barcode lookup with automatic cache population. Returns product from cache or inventory.products, auto-populating cache on products table hits.';



CREATE OR REPLACE FUNCTION "public"."override_batch_status"("p_batch_id" "uuid", "p_new_status" character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  old_status VARCHAR;
  batch_exists BOOLEAN := FALSE;
BEGIN
  -- Check if batch exists and get current status
  SELECT status INTO old_status 
  FROM inventory.batches 
  WHERE batch_id = p_batch_id;
  
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;
  
  -- Validate new status
  IF p_new_status NOT IN ('active', 'expired', 'damaged', 'sold_out', 'reserved') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;
  
  -- Update batch status
  UPDATE inventory.batches 
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE batch_id = p_batch_id;
  
  -- Log the manual override
  INSERT INTO inventory.batch_status_logs (
    action_type,
    affected_count,
    executed_at,
    notes,
    created_by
  ) VALUES (
    'manual_status_override',
    1,
    NOW(),
    format('Status changed from %s to %s. %s', old_status, p_new_status, COALESCE(p_notes, '')),
    p_user_id
  );
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."override_batch_status"("p_batch_id" "uuid", "p_new_status" character varying, "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_user_from_store"("p_store_id" "uuid", "p_target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_can_manage BOOLEAN;
  v_target_user_role TEXT;
  v_target_is_active BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  
  -- Check authentication
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User must be authenticated'
    );
  END IF;
  
  -- Prevent users from removing themselves
  IF p_target_user_id = v_current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot remove yourself from the store'
    );
  END IF;
  
  -- Check if current user has permission to manage the target user
  -- This function handles the role hierarchy (owners can remove anyone,
  -- managers can remove employees, employees can't remove anyone)
  SELECT business.user_can_manage_store_users(
    p_store_id, 
    p_target_user_id
  ) INTO v_can_manage;
  
  IF NOT v_can_manage THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to manage this user'
    );
  END IF;
  
  -- Get target user's current details for the response
  SELECT role_in_store, is_active 
  INTO v_target_user_role, v_target_is_active
  FROM business.store_users
  WHERE store_id = p_store_id 
    AND user_id = p_target_user_id;
  
  -- Check if user exists in this store
  IF v_target_user_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found in this store'
    );
  END IF;
  
  -- PERMANENTLY DELETE the user from the store
  -- This is different from setting is_active = false (which is deactivation)
  DELETE FROM business.store_users
  WHERE store_id = p_store_id
    AND user_id = p_target_user_id;
  
  -- Verify deletion succeeded
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to remove user from store'
    );
  END IF;
  
  -- Return success with audit details
  RETURN json_build_object(
    'success', true,
    'message', 'User permanently removed from store',
    'removed_user_id', p_target_user_id,
    'removed_user_role', v_target_user_role,
    'was_active', v_target_is_active,
    'removed_by', v_current_user_id,
    'removed_at', NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in remove_user_from_store: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'An unexpected error occurred: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."remove_user_from_store"("p_store_id" "uuid", "p_target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_user_from_store"("p_store_id" "uuid", "p_target_user_id" "uuid") IS 'Permanently removes a user from a store with proper permission checks. 
Uses SECURITY DEFINER to bypass RLS restrictions. 
Enforces role hierarchy: owners can remove anyone (except self), managers can remove employees/staff only.
SECURITY: Only authenticated users can execute this function.';



CREATE OR REPLACE FUNCTION "public"."reset_pin_attempts"("p_username" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- This would need Admin API implementation to actually reset attempts
    RETURN json_build_object(
        'success', true,
        'message', 'PIN attempts reset functionality requires Admin API'
    );
END;
$$;


ALTER FUNCTION "public"."reset_pin_attempts"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) RETURNS TABLE("input_index" integer, "product_id" "uuid", "found_method" "text", "sku" "text", "name" "text")
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  WITH input_data AS (
    SELECT 
      row_number() OVER () as idx,
      unnest(p_skus) as sku,
      unnest(p_barcodes) as barcode,
      unnest(p_names) as name
  ),
  -- Try SKU matches first (most reliable)
  sku_matches AS (
    SELECT 
      id.idx::INTEGER as input_index, 
      p.product_id, 
      'sku'::TEXT as found_method, 
      p.sku, 
      p.name
    FROM input_data id
    JOIN inventory.products p ON p.sku = id.sku
    WHERE id.sku IS NOT NULL AND id.sku != ''
  ),
  -- Try barcode matches for remaining items
  barcode_matches AS (
    SELECT 
      id.idx::INTEGER as input_index, 
      p.product_id, 
      'barcode'::TEXT as found_method, 
      p.sku, 
      p.name
    FROM input_data id
    JOIN inventory.products p ON p.barcode = id.barcode
    WHERE id.idx NOT IN (SELECT input_index FROM sku_matches)
      AND id.barcode IS NOT NULL AND id.barcode != ''
  ),
  -- Try name matches for remaining items (fuzzy matching)
  name_matches AS (
    SELECT 
      id.idx::INTEGER as input_index, 
      p.product_id, 
      'name'::TEXT as found_method, 
      p.sku, 
      p.name
    FROM input_data id
    JOIN inventory.products p ON LOWER(trim(p.name)) = LOWER(trim(id.name))
    WHERE id.idx NOT IN (
      SELECT input_index FROM sku_matches 
      UNION SELECT input_index FROM barcode_matches
    )
    AND id.name IS NOT NULL AND id.name != ''
  ),
  all_matches AS (
    SELECT * FROM sku_matches
    UNION ALL SELECT * FROM barcode_matches  
    UNION ALL SELECT * FROM name_matches
  )
  SELECT * FROM all_matches ORDER BY input_index;
$$;


ALTER FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) IS 'Bulk product resolution for CSV data - matches by SKU, barcode, or name';



CREATE OR REPLACE FUNCTION "public"."resolve_bulk_products_simple"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) RETURNS TABLE("input_index" integer, "product_id" "uuid", "found_method" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  i INTEGER;
  current_sku TEXT;
  current_barcode TEXT;
  current_name TEXT;
  found_product_id UUID;
  method TEXT;
BEGIN
  -- Loop through each input item
  FOR i IN 1..array_length(p_skus, 1) LOOP
    current_sku := p_skus[i];
    current_barcode := p_barcodes[i];
    current_name := p_names[i];
    found_product_id := NULL;
    method := NULL;
    
    -- Try SKU first
    IF current_sku IS NOT NULL AND current_sku != '' THEN
      SELECT p.product_id INTO found_product_id 
      FROM inventory.products p 
      WHERE p.sku = current_sku;
      
      IF found_product_id IS NOT NULL THEN
        method := 'sku';
      END IF;
    END IF;
    
    -- Try barcode if SKU didn't work
    IF found_product_id IS NULL AND current_barcode IS NOT NULL AND current_barcode != '' THEN
      SELECT p.product_id INTO found_product_id 
      FROM inventory.products p 
      WHERE p.barcode = current_barcode;
      
      IF found_product_id IS NOT NULL THEN
        method := 'barcode';
      END IF;
    END IF;
    
    -- Try name if neither SKU nor barcode worked
    IF found_product_id IS NULL AND current_name IS NOT NULL AND current_name != '' THEN
      SELECT p.product_id INTO found_product_id 
      FROM inventory.products p 
      WHERE LOWER(trim(p.name)) = LOWER(trim(current_name));
      
      IF found_product_id IS NOT NULL THEN
        method := 'name';
      END IF;
    END IF;
    
    -- Return result for this item (even if not found)
    RETURN QUERY SELECT i, found_product_id, method;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."resolve_bulk_products_simple"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products_with_stock"("search_query" "text", "store_id_param" "uuid" DEFAULT NULL::"uuid", "max_results" integer DEFAULT 20) RETURNS TABLE("product_id" "uuid", "name" character varying, "brand" character varying, "barcode" "text", "image_url" "text", "unit_type" character varying, "category_name" "text", "total_available_quantity" numeric, "batch_count" integer, "is_out_of_stock" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  IF store_id_param IS NULL THEN
    -- Inbound mode: search all products
    RETURN QUERY
    SELECT 
      p.product_id,
      p.name,
      p.brand,
      p.barcode,
      p.image_url,
      p.unit_type,
      c.display_name_en as category_name,
      0::NUMERIC as total_available_quantity,
      0::INTEGER as batch_count,
      FALSE as is_out_of_stock
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    WHERE (
      p.name ILIKE '%' || search_query || '%' OR 
      COALESCE(p.brand, '') ILIKE '%' || search_query || '%'
    )
    ORDER BY p.name
    LIMIT max_results;
  ELSE
    -- Outbound mode: search products with stock
    RETURN QUERY
    SELECT 
      p.product_id,
      p.name,
      p.brand,
      p.barcode,
      p.image_url,
      p.unit_type,
      c.display_name_en as category_name,
      COALESCE(SUM(CASE 
        WHEN b.status = 'active' AND b.current_quantity > 0 
        THEN b.current_quantity 
        ELSE 0 
      END), 0) as total_available_quantity,
      COUNT(CASE 
        WHEN b.status = 'active' AND b.current_quantity > 0 
        THEN 1 
      END)::INTEGER as batch_count,
      COALESCE(SUM(CASE 
        WHEN b.status = 'active' AND b.current_quantity > 0 
        THEN b.current_quantity 
        ELSE 0 
      END), 0) = 0 as is_out_of_stock
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON p.category_id = c.category_id
    INNER JOIN inventory.store_products sp ON p.product_id = sp.product_id
    LEFT JOIN inventory.batches b ON sp.store_id = b.store_id 
      AND sp.product_id = b.product_id
    WHERE sp.store_id = store_id_param
      AND sp.is_active = true
      AND (
        p.name ILIKE '%' || search_query || '%' OR 
        COALESCE(p.brand, '') ILIKE '%' || search_query || '%'
      )
    GROUP BY p.product_id, p.name, p.brand, p.barcode, p.image_url, p.unit_type, c.display_name_en
    HAVING COALESCE(SUM(CASE 
      WHEN b.status = 'active' AND b.current_quantity > 0 
      THEN b.current_quantity 
      ELSE 0 
    END), 0) > 0
    ORDER BY p.name
    LIMIT max_results;
  END IF;
END;
$$;


ALTER FUNCTION "public"."search_products_with_stock"("search_query" "text", "store_id_param" "uuid", "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."security_summary"() RETURNS TABLE("total_issues" integer, "rls_issues" integer, "function_issues" integer, "compliance_status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH security_check AS (
    SELECT * FROM public.check_security_warnings()
  ),
  summary AS (
    SELECT 
      COUNT(*) FILTER (WHERE status LIKE '❌%' OR status LIKE '⚠️%') as total_issues,
      COUNT(*) FILTER (WHERE warning_type = 'RLS_DISABLED' AND status LIKE '❌%') as rls_issues,
      COUNT(*) FILTER (WHERE warning_type = 'FUNCTION_SEARCH_PATH' AND status LIKE '⚠️%') as function_issues
    FROM security_check
  )
  SELECT 
    total_issues::integer,
    rls_issues::integer,
    function_issues::integer,
    CASE 
      WHEN total_issues = 0 THEN '✅ FULLY_COMPLIANT'::text
      WHEN total_issues <= 2 THEN '⚠️ MINOR_ISSUES'::text
      ELSE '❌ NEEDS_ATTENTION'::text
    END as compliance_status
  FROM summary;
$$;


ALTER FUNCTION "public"."security_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_french_language"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If no language_preference is set in metadata, set it to French
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'language_preference' IS NULL THEN
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || 
                              jsonb_build_object('language_preference', 'fr');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_default_french_language"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  rows_affected INTEGER;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN 'ERROR: Not authenticated';
  END IF;

  -- Log the operation
  RAISE NOTICE 'Simple test: User % updating user % in store %', 
    current_user_id, input_user_id, input_store_id;
  
  -- Perform a very simple update (just the PIN auth field)
  UPDATE business.store_users
  SET can_use_pin_auth = input_can_use_pin_auth
  WHERE store_id = input_store_id 
    AND user_id = input_user_id;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Return status
  IF rows_affected = 0 THEN
    RETURN 'ERROR: No rows updated (user not found or permission denied)';
  ELSE
    RETURN 'SUCCESS: Updated ' || rows_affected || ' rows';
  END IF;
  
END;
$$;


ALTER FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) IS 'Simple test function to verify store user updates work with SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."test_business_schema_access"() RETURNS TABLE("user_count" bigint, "store_count" bigint)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT 
    (SELECT COUNT(*) FROM business.store_users) as user_count,
    (SELECT COUNT(*) FROM business.stores) as store_count;
$$;


ALTER FUNCTION "public"."test_business_schema_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_business_schema_access"() IS 'Test function for business schema access. Search path set for security.';



CREATE OR REPLACE FUNCTION "public"."test_csv_performance"("p_store_id" "uuid", "p_item_count" integer) RETURNS TABLE("operation_type" "text", "duration_ms" integer, "item_count" integer, "items_per_second" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  test_skus TEXT[];
  test_barcodes TEXT[];
  test_names TEXT[];
  i INTEGER;
BEGIN
  -- Prepare test data
  FOR i IN 1..p_item_count LOOP
    test_skus := array_append(test_skus, 'TEST-SKU-' || i);
    test_barcodes := array_append(test_barcodes, 'TEST-BARCODE-' || i);
    test_names := array_append(test_names, 'Test Product ' || i);
  END LOOP;

  -- Test duplicate detection performance
  start_time := clock_timestamp();
  PERFORM public.check_bulk_duplicates(
    p_store_id,
    test_barcodes,
    ARRAY_FILL('2025-02-15'::DATE, ARRAY[p_item_count])
  );
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'duplicate_detection'::TEXT,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
    p_item_count,
    ROUND(p_item_count / EXTRACT(EPOCH FROM (end_time - start_time)), 2);

  -- Test product resolution performance
  start_time := clock_timestamp();
  PERFORM public.resolve_bulk_products_simple(test_skus, test_barcodes, test_names);
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'product_resolution'::TEXT,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
    p_item_count,
    ROUND(p_item_count / EXTRACT(EPOCH FROM (end_time - start_time)), 2);
END;
$$;


ALTER FUNCTION "public"."test_csv_performance"("p_store_id" "uuid", "p_item_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_batch_automation"() RETURNS TABLE("message" "text", "updated_count" integer, "sold_out_count" integer, "expired_count" integer, "next_scheduled_run" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  result RECORD;
BEGIN
  -- Run the automation
  SELECT * INTO result FROM update_expired_batch_statuses();
  
  RETURN QUERY SELECT 
    'Manual automation completed successfully'::TEXT,
    result.updated_count,
    result.sold_out_count, 
    result.expired_count,
    'Next automatic run: tomorrow at 1:00 AM UTC (2:00 AM CET)'::TEXT;
END;
$$;


ALTER FUNCTION "public"."trigger_batch_automation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_batch_quantity"("batch_id_param" "uuid", "quantity_to_remove" numeric, "reason_param" "text" DEFAULT 'scan-out'::"text") RETURNS TABLE("success" boolean, "new_quantity" numeric, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  current_batch RECORD;
  new_qty NUMERIC;
BEGIN
  -- Get current batch state
  SELECT batch_id, current_quantity, store_id, product_id 
  INTO current_batch
  FROM inventory.batches 
  WHERE batch_id = batch_id_param 
    AND status = 'active'
  LIMIT 1;
  
  -- Check if batch exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'Batch not found or inactive'::TEXT;
    RETURN;
  END IF;
  
  -- Check if sufficient quantity available
  IF current_batch.current_quantity < quantity_to_remove THEN
    RETURN QUERY SELECT 
      FALSE, 
      current_batch.current_quantity, 
      format('Insufficient quantity. Available: %s, Requested: %s', 
             current_batch.current_quantity, quantity_to_remove)::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new quantity
  new_qty := current_batch.current_quantity - quantity_to_remove;
  
  -- Update the batch
  UPDATE inventory.batches 
  SET 
    current_quantity = new_qty,
    updated_at = NOW()
  WHERE batch_id = batch_id_param;
  
  -- TODO: Log the transaction in audit table
  -- INSERT INTO inventory.batch_transactions (...)
  
  RETURN QUERY SELECT TRUE, new_qty, NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."update_batch_quantity"("batch_id_param" "uuid", "quantity_to_remove" numeric, "reason_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cache_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cache_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_cache_updated_at"() IS 'Trigger function to automatically update updated_at timestamp. Search path is set for security.';



CREATE OR REPLACE FUNCTION "public"."update_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_expired_batch_statuses"() RETURNS TABLE("updated_count" integer, "sold_out_count" integer, "expired_count" integer, "details" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  sold_out_updated INTEGER := 0;
  expired_updated INTEGER := 0;
  total_updated INTEGER := 0;
  update_details JSONB := '[]'::jsonb;
BEGIN
  -- Update batches that have no remaining quantity to sold_out
  WITH sold_out_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'sold_out',
      updated_at = NOW()
    WHERE status = 'active' 
      AND current_quantity <= 0
    RETURNING batch_id, product_id, expiry_date, current_quantity
  )
  SELECT COUNT(*) INTO sold_out_updated FROM sold_out_updates;
  
  -- Update batches that have expired but still have quantity to expired
  WITH expired_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'active' 
      AND expiry_date < CURRENT_DATE 
      AND current_quantity > 0
    RETURNING batch_id, product_id, expiry_date, current_quantity
  )
  SELECT COUNT(*) INTO expired_updated FROM expired_updates;
  
  total_updated := sold_out_updated + expired_updated;
  
  -- Log the batch status update
  INSERT INTO inventory.batch_status_logs (
    action_type,
    affected_count,
    executed_at,
    notes
  ) VALUES (
    'automated_status_update',
    total_updated,
    NOW(),
    format('Automated daily update: %s sold_out, %s expired', sold_out_updated, expired_updated)
  );
  
  -- Return summary
  RETURN QUERY SELECT 
    total_updated,
    sold_out_updated,
    expired_updated,
    jsonb_build_object(
      'timestamp', NOW(),
      'sold_out_count', sold_out_updated,
      'expired_count', expired_updated,
      'total_updated', total_updated
    );
END;
$$;


ALTER FUNCTION "public"."update_expired_batch_statuses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Update product totals for affected product(s)
    WITH product_stats AS (
        SELECT 
            product_id,
            COALESCE(SUM(current_quantity), 0) as total_stock,
            COUNT(*) FILTER (WHERE status = 'active') as active_batches,
            AVG(expiry_date - CURRENT_DATE) FILTER (WHERE status = 'active' AND expiry_date > CURRENT_DATE) as avg_days_to_expiry
        FROM inventory.batches 
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        GROUP BY product_id
    )
    UPDATE inventory.products p
    SET 
        total_stock = COALESCE(ps.total_stock, 0),
        active_batches_count = COALESCE(ps.active_batches, 0),
        avg_days_to_expiry = ps.avg_days_to_expiry,
        updated_at = NOW()
    FROM product_stats ps
    WHERE p.product_id = ps.product_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_product_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric DEFAULT NULL::numeric, "p_warning_threshold" numeric DEFAULT NULL::numeric, "p_scoring_weights" "jsonb" DEFAULT NULL::"jsonb", "p_currency" character varying DEFAULT NULL::character varying, "p_opening_hours" "jsonb" DEFAULT NULL::"jsonb", "p_peak_hours" "jsonb" DEFAULT NULL::"jsonb", "p_weather_location_lat" numeric DEFAULT NULL::numeric, "p_weather_location_lon" numeric DEFAULT NULL::numeric, "p_notification_preferences" "jsonb" DEFAULT NULL::"jsonb", "p_display_preferences" "jsonb" DEFAULT NULL::"jsonb", "p_backup_preferences" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("store_id" "uuid", "critical_threshold" numeric, "warning_threshold" numeric, "scoring_weights" "jsonb", "currency" character varying, "opening_hours" "jsonb", "peak_hours" "jsonb", "weather_location_lat" numeric, "weather_location_lon" numeric, "notification_preferences" "jsonb", "display_preferences" "jsonb", "backup_preferences" "jsonb", "updated_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has owner/manager access to this store
  SELECT EXISTS (
    SELECT 1
    FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = v_user_id
    AND su.role_in_store IN ('owner', 'manager')
    AND su.is_active = true
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Permission denied: insufficient store access';
  END IF;

  -- Validate threshold values if provided
  IF p_critical_threshold IS NOT NULL AND (p_critical_threshold < 0 OR p_critical_threshold > 1) THEN
    RAISE EXCEPTION 'Critical threshold must be between 0 and 1';
  END IF;

  IF p_warning_threshold IS NOT NULL AND (p_warning_threshold < 0 OR p_warning_threshold > 1) THEN
    RAISE EXCEPTION 'Warning threshold must be between 0 and 1';
  END IF;

  -- Ensure critical threshold is higher than warning threshold
  IF p_critical_threshold IS NOT NULL AND p_warning_threshold IS NOT NULL 
     AND p_critical_threshold <= p_warning_threshold THEN
    RAISE EXCEPTION 'Critical threshold must be higher than warning threshold';
  END IF;

  -- Update store settings with proper column qualification
  UPDATE business.store_settings ss
  SET 
    critical_threshold = COALESCE(p_critical_threshold, ss.critical_threshold),
    warning_threshold = COALESCE(p_warning_threshold, ss.warning_threshold),
    scoring_weights = COALESCE(p_scoring_weights, ss.scoring_weights),
    currency = COALESCE(p_currency, ss.currency),
    opening_hours = COALESCE(p_opening_hours, ss.opening_hours),
    peak_hours = COALESCE(p_peak_hours, ss.peak_hours),
    weather_location_lat = COALESCE(p_weather_location_lat, ss.weather_location_lat),
    weather_location_lon = COALESCE(p_weather_location_lon, ss.weather_location_lon),
    notification_preferences = COALESCE(p_notification_preferences, ss.notification_preferences),
    display_preferences = COALESCE(p_display_preferences, ss.display_preferences),
    backup_preferences = COALESCE(p_backup_preferences, ss.backup_preferences),
    updated_at = NOW()
  WHERE ss.store_id = p_store_id;

  -- Check if any row was updated
  IF FOUND THEN
    -- Return the updated settings
    RETURN QUERY
    SELECT 
      ss.store_id,
      ss.critical_threshold,
      ss.warning_threshold,
      ss.scoring_weights,
      ss.currency,
      ss.opening_hours,
      ss.peak_hours,
      ss.weather_location_lat,
      ss.weather_location_lon,
      ss.notification_preferences,
      ss.display_preferences,
      ss.backup_preferences,
      ss.updated_at
    FROM business.store_settings ss
    WHERE ss.store_id = p_store_id;
  ELSE
    -- No settings exist, create default settings
    INSERT INTO business.store_settings (
      store_id,
      critical_threshold,
      warning_threshold,
      scoring_weights,
      currency,
      opening_hours,
      peak_hours,
      weather_location_lat,
      weather_location_lon,
      notification_preferences,
      display_preferences,
      backup_preferences
    ) VALUES (
      p_store_id,
      COALESCE(p_critical_threshold, 0.80),
      COALESCE(p_warning_threshold, 0.60),
      COALESCE(p_scoring_weights, '{"expiry": 0.5, "margin": 0.2, "velocity": 0.3}'::jsonb),
      COALESCE(p_currency, 'EUR'),
      COALESCE(p_opening_hours, '{"monday": {"open": "08:00", "close": "20:00"}}'::jsonb),
      COALESCE(p_peak_hours, '{"evening": "17:00-19:00", "morning": "08:00-10:00"}'::jsonb),
      p_weather_location_lat,
      p_weather_location_lon,
      COALESCE(p_notification_preferences, '{"sms_alerts": false, "email_alerts": true, "push_notifications": true, "alert_types": ["critical_expiry", "low_stock", "system_updates"]}'::jsonb),
      COALESCE(p_display_preferences, '{"theme": "light", "language": "en", "date_format": "DD/MM/YYYY", "time_format": "24h"}'::jsonb),
      COALESCE(p_backup_preferences, '{"auto_backup": true, "retention_days": 30, "backup_frequency": "daily"}'::jsonb)
    )
    RETURNING 
      store_id,
      critical_threshold,
      warning_threshold,
      scoring_weights,
      currency,
      opening_hours,
      peak_hours,
      weather_location_lat,
      weather_location_lon,
      notification_preferences,
      display_preferences,
      backup_preferences,
      updated_at;
  END IF;

END;
$$;


ALTER FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric, "p_scoring_weights" "jsonb", "p_currency" character varying, "p_opening_hours" "jsonb", "p_peak_hours" "jsonb", "p_weather_location_lat" numeric, "p_weather_location_lon" numeric, "p_notification_preferences" "jsonb", "p_display_preferences" "jsonb", "p_backup_preferences" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric, "p_scoring_weights" "jsonb", "p_currency" character varying, "p_opening_hours" "jsonb", "p_peak_hours" "jsonb", "p_weather_location_lat" numeric, "p_weather_location_lon" numeric, "p_notification_preferences" "jsonb", "p_display_preferences" "jsonb", "p_backup_preferences" "jsonb") IS 'Update all store settings including thresholds, scoring weights, and preferences with proper access control and column qualification';



CREATE OR REPLACE FUNCTION "public"."update_store_settings"("store_id_param" "uuid", "store_name_param" character varying DEFAULT NULL::character varying, "business_name_param" character varying DEFAULT NULL::character varying, "store_code_param" character varying DEFAULT NULL::character varying, "store_type_param" character varying DEFAULT NULL::character varying, "size_category_param" character varying DEFAULT NULL::character varying, "address_param" "text" DEFAULT NULL::"text", "city_param" character varying DEFAULT NULL::character varying, "postal_code_param" character varying DEFAULT NULL::character varying, "country_param" character varying DEFAULT NULL::character varying, "phone_param" character varying DEFAULT NULL::character varying, "email_param" character varying DEFAULT NULL::character varying, "website_url_param" character varying DEFAULT NULL::character varying, "description_param" "text" DEFAULT NULL::"text", "default_markup_percent_param" numeric DEFAULT NULL::numeric, "waste_reduction_target_percent_param" numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result json;
  current_user_id uuid;
  store_type_enum business.store_type_enum;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  -- Check permissions
  IF NOT (
    EXISTS (SELECT 1 FROM business.stores s WHERE s.store_id = store_id_param AND s.owner_id = current_user_id)
    OR
    EXISTS (
      SELECT 1 FROM business.store_users su 
      WHERE su.store_id = store_id_param 
      AND su.user_id = current_user_id 
      AND su.is_active = true 
      AND (
        su.role_in_store = 'owner' 
        OR su.role_in_store = 'manager'
        OR su.permissions->>'can_manage_settings' = 'true'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: You do not have permission to update this store';
  END IF;
  
  -- Cast store_type to enum if provided
  IF store_type_param IS NOT NULL THEN
    store_type_enum := store_type_param::business.store_type_enum;
  END IF;
  
  -- Perform the update
  UPDATE business.stores 
  SET 
    store_name = COALESCE(store_name_param, store_name),
    business_name = COALESCE(business_name_param, business_name),
    store_code = COALESCE(store_code_param, store_code),
    store_type = COALESCE(store_type_enum, store_type),
    size_category = COALESCE(size_category_param, size_category),
    address = COALESCE(address_param, address),
    city = COALESCE(city_param, city),
    postal_code = COALESCE(postal_code_param, postal_code),
    country = COALESCE(country_param, country),
    phone = COALESCE(phone_param, phone),
    email = COALESCE(email_param, email),
    website_url = COALESCE(website_url_param, website_url),
    description = COALESCE(description_param, description),
    default_markup_percent = COALESCE(default_markup_percent_param, default_markup_percent),
    waste_reduction_target_percent = COALESCE(waste_reduction_target_percent_param, waste_reduction_target_percent),
    updated_at = NOW()
  WHERE store_id = store_id_param
  RETURNING row_to_json(business.stores.*) INTO result;
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Store not found or update failed';
  END IF;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."update_store_settings"("store_id_param" "uuid", "store_name_param" character varying, "business_name_param" character varying, "store_code_param" character varying, "store_type_param" character varying, "size_category_param" character varying, "address_param" "text", "city_param" character varying, "postal_code_param" character varying, "country_param" character varying, "phone_param" character varying, "email_param" character varying, "website_url_param" character varying, "description_param" "text", "default_markup_percent_param" numeric, "waste_reduction_target_percent_param" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) RETURNS TABLE("store_id" "uuid", "critical_threshold" numeric, "warning_threshold" numeric, "updated_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'inventory', 'business', 'scoring'
    AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has owner/manager access to this store
  SELECT EXISTS (
    SELECT 1
    FROM business.store_users su
    WHERE su.store_id = p_store_id
    AND su.user_id = v_user_id
    AND su.role_in_store IN ('owner', 'manager')
    AND su.is_active = true
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Permission denied: insufficient store access';
  END IF;

  -- Validate threshold values
  IF p_critical_threshold < 0 OR p_critical_threshold > 1 THEN
    RAISE EXCEPTION 'Critical threshold must be between 0 and 1';
  END IF;

  IF p_warning_threshold < 0 OR p_warning_threshold > 1 THEN
    RAISE EXCEPTION 'Warning threshold must be between 0 and 1';
  END IF;

  -- Ensure critical threshold is higher than warning threshold
  IF p_critical_threshold <= p_warning_threshold THEN
    RAISE EXCEPTION 'Critical threshold must be higher than warning threshold';
  END IF;

  -- Update or insert store settings
  INSERT INTO business.store_settings (
    store_id,
    critical_threshold,
    warning_threshold,
    updated_at
  ) VALUES (
    p_store_id,
    p_critical_threshold,
    p_warning_threshold,
    NOW()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    critical_threshold = EXCLUDED.critical_threshold,
    warning_threshold = EXCLUDED.warning_threshold,
    updated_at = NOW();

  -- Return the updated settings
  RETURN QUERY
  SELECT 
    ss.store_id,
    ss.critical_threshold,
    ss.warning_threshold,
    ss.updated_at
  FROM business.store_settings ss
  WHERE ss.store_id = p_store_id;

END;
$$;


ALTER FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) IS 'Simple function to update only critical and warning thresholds for a store';



CREATE OR REPLACE FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying DEFAULT NULL::character varying, "input_permissions" "jsonb" DEFAULT NULL::"jsonb", "input_is_active" boolean DEFAULT NULL::boolean, "input_can_use_pin_auth" boolean DEFAULT NULL::boolean, "input_pin_access_level" character varying DEFAULT NULL::character varying, "input_pin_permissions" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("store_id" "uuid", "user_id" "uuid", "role_in_store" character varying, "permissions" "jsonb", "assigned_at" timestamp without time zone, "assigned_by" "uuid", "is_active" boolean, "can_use_pin_auth" boolean, "pin_access_level" character varying, "pin_permissions" "jsonb", "email" character varying, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "raw_user_meta_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
DECLARE
  current_user_id UUID;
  rows_affected INTEGER;
  can_update BOOLEAN := FALSE;
  debug_current_role TEXT;
  debug_target_role TEXT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- DEBUG: Log the current user
  RAISE NOTICE 'RPC DEBUG: current_user_id = %', current_user_id;
  RAISE NOTICE 'RPC DEBUG: input_store_id = %, input_user_id = %', input_store_id, input_user_id;
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- DEBUG: Check what the view returns
  SELECT effective_role INTO debug_current_role
  FROM business.user_store_permissions
  WHERE user_store_permissions.store_id = input_store_id
    AND user_store_permissions.user_id = current_user_id
    AND user_store_permissions.is_active = TRUE;
    
  SELECT effective_role INTO debug_target_role
  FROM business.user_store_permissions
  WHERE user_store_permissions.store_id = input_store_id
    AND user_store_permissions.user_id = input_user_id;
  
  RAISE NOTICE 'RPC DEBUG: current_role = %, target_role = %', debug_current_role, debug_target_role;

  -- Check permissions using helper function
  SELECT business.user_can_manage_store_users_v2(input_store_id, input_user_id) INTO can_update;
  
  RAISE NOTICE 'RPC DEBUG: can_update = %', can_update;
  
  IF NOT can_update THEN
    RAISE EXCEPTION 'Permission denied: Cannot update this user in store %', input_store_id
      USING ERRCODE = '42501';
  END IF;
  
  -- Perform the update with fully qualified column names to avoid ambiguity
  UPDATE business.store_users su
  SET 
    role_in_store = COALESCE(input_role_in_store, su.role_in_store),
    permissions = COALESCE(input_permissions, su.permissions),
    is_active = COALESCE(input_is_active, su.is_active),
    can_use_pin_auth = COALESCE(input_can_use_pin_auth, su.can_use_pin_auth),
    pin_access_level = COALESCE(input_pin_access_level, su.pin_access_level),
    pin_permissions = COALESCE(input_pin_permissions, su.pin_permissions)
  WHERE su.store_id = input_store_id 
    AND su.user_id = input_user_id;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Store user not found: store_id=%, user_id=%', input_store_id, input_user_id
      USING ERRCODE = '02000';
  END IF;
  
  -- Return the updated user
  RETURN QUERY
  SELECT 
    su.store_id,
    su.user_id,
    su.role_in_store,
    su.permissions,
    su.assigned_at,
    su.assigned_by,
    su.is_active,
    su.can_use_pin_auth,
    su.pin_access_level,
    su.pin_permissions,
    au.email,
    au.created_at,
    au.updated_at,
    au.raw_user_meta_data
  FROM business.store_users su
  JOIN auth.users au ON su.user_id = au.id
  WHERE su.store_id = input_store_id 
    AND su.user_id = input_user_id;
  
END;
$$;


ALTER FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying, "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" character varying, "input_pin_permissions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying, "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" character varying, "input_pin_permissions" "jsonb") IS 'Updated to use user_can_manage_store_users_v2 for faster permission checks';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_email"("target_user_id" "uuid", "new_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $_$
DECLARE
  current_user_id uuid;
  updated_user auth.users%ROWTYPE;
BEGIN
  -- Get current user from JWT
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate email format (basic check)
  IF new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if email is already in use by another user
  IF EXISTS(SELECT 1 FROM auth.users WHERE email = new_email AND id != target_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Email already in use';
  END IF;
  
  -- Update the user email
  UPDATE auth.users 
  SET 
    email = new_email,
    updated_at = NOW()
  WHERE id = target_user_id AND deleted_at IS NULL
  RETURNING * INTO updated_user;
  
  -- Check if user was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_email', new_email
  );
END;
$_$;


ALTER FUNCTION "public"."update_user_email"("target_user_id" "uuid", "new_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_language_preference"("target_user_id" "uuid", "new_language_preference" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
  updated_user auth.users%ROWTYPE;
  valid_languages text[] := ARRAY['en', 'fr', 'nl', 'de', 'es'];
BEGIN
  -- Get current user from JWT
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate language preference
  IF new_language_preference IS NULL OR new_language_preference = '' THEN
    new_language_preference := 'fr'; -- 🇫🇷 DEFAULT TO FRENCH
  END IF;
  
  IF NOT (new_language_preference = ANY(valid_languages)) THEN
    RAISE EXCEPTION 'Invalid language preference. Supported languages: en, fr, nl, de, es';
  END IF;
  
  -- Update the user language preference in metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
                        jsonb_build_object('language_preference', new_language_preference),
    updated_at = NOW()
  WHERE id = target_user_id AND deleted_at IS NULL
  RETURNING * INTO updated_user;
  
  -- Check if user was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'language_preference', new_language_preference
  );
END;
$$;


ALTER FUNCTION "public"."update_user_language_preference"("target_user_id" "uuid", "new_language_preference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_metadata"("target_user_id" "uuid", "metadata_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
DECLARE
  current_user_id uuid;
  updated_user auth.users%ROWTYPE;
BEGIN
  -- Get current user from JWT
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- For now, allow any authenticated user to update any user
  -- TODO: Add proper role-based access control here
  
  -- Update the user metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || metadata_updates,
    updated_at = NOW()
  WHERE id = target_user_id AND deleted_at IS NULL
  RETURNING * INTO updated_user;
  
  -- Check if user was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
  
  -- Return success response with updated metadata
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'updated_metadata', updated_user.raw_user_meta_data
  );
END;
$$;


ALTER FUNCTION "public"."update_user_metadata"("target_user_id" "uuid", "metadata_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_phone"("target_user_id" "uuid", "new_phone" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  current_user_id uuid;
  updated_user auth.users%ROWTYPE;
BEGIN
  -- Get current user from JWT
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Basic phone validation (allow null for removal)
  IF new_phone IS NOT NULL AND LENGTH(trim(new_phone)) = 0 THEN
    new_phone := NULL; -- Treat empty string as null
  END IF;
  
  -- Basic phone format validation (if not null)
  IF new_phone IS NOT NULL AND new_phone !~ '^[\+]?[0-9\s\-\(\)\.]+$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Update the user phone in auth.users table
  UPDATE auth.users 
  SET 
    phone = new_phone,
    updated_at = NOW()
  WHERE id = target_user_id AND deleted_at IS NULL
  RETURNING * INTO updated_user;
  
  -- Check if user was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'phone', new_phone
  );
END;
$_$;


ALTER FUNCTION "public"."update_user_phone"("target_user_id" "uuid", "new_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    -- Validate new PIN (FLEXIBLE LENGTH - just check it's digits)
    IF p_new_pin IS NULL OR p_new_pin = '' OR p_new_pin !~ '^[0-9]+$' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'New PIN must contain only digits and cannot be empty'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'PIN update requires Admin API implementation'
    );
END;
$_$;


ALTER FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") IS 'Updates user PIN with FLEXIBLE length - only requires digits, no maximum length.';



CREATE OR REPLACE FUNCTION "public"."user_has_pin_access"("target_store_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  has_access boolean := false;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT su.can_use_pin_auth AND su.is_active
  INTO has_access
  FROM business.store_users su
  WHERE su.user_id = current_user_id
    AND su.store_id = target_store_id;
  
  RETURN COALESCE(has_access, false);
END;
$$;


ALTER FUNCTION "public"."user_has_pin_access"("target_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_store_access"("target_store_id" "uuid", "required_role" "text" DEFAULT 'employee'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  has_access boolean := false;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 
    FROM business.store_users su
    WHERE su.user_id = current_user_id
      AND su.store_id = target_store_id
      AND su.is_active = true
      AND (
        required_role = 'employee' OR 
        su.role_in_store = required_role OR
        su.role_in_store = 'owner'
      )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;


ALTER FUNCTION "public"."user_has_store_access"("target_store_id" "uuid", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    is_valid boolean := false;
BEGIN
    -- Find user by username
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data,
        COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, au.email) as full_name,
        COALESCE((au.raw_user_meta_data->>'username')::TEXT, '') as username,
        COALESCE((au.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
        (au.raw_user_meta_data->>'pin_hash')::TEXT as pin_hash,
        COALESCE((au.raw_user_meta_data->>'failed_pin_attempts')::INT, 0) as failed_attempts,
        (au.raw_user_meta_data->>'locked_until')::TIMESTAMP as locked_until
    INTO user_record
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'username') = p_username
    AND au.deleted_at IS NULL;
    
    -- User not found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid username or PIN'
        );
    END IF;
    
    -- User is inactive
    IF NOT user_record.is_active THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Account is inactive'
        );
    END IF;
    
    -- Check if account is locked
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Account is temporarily locked due to too many failed attempts',
            'locked_until', user_record.locked_until
        );
    END IF;
    
    -- Validate PIN (NO LENGTH RESTRICTIONS - any length numeric PIN is valid)
    IF user_record.pin_hash IS NOT NULL THEN
        -- Simple comparison for now (in production, use proper bcrypt)
        SELECT crypt(p_pin, user_record.pin_hash) = user_record.pin_hash INTO is_valid;
    END IF;
    
    -- PIN validation failed
    IF NOT is_valid THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid username or PIN',
            'failed_attempts', COALESCE(user_record.failed_attempts, 0) + 1
        );
    END IF;
    
    -- PIN validation successful - return user info
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'username', user_record.username,
            'full_name', user_record.full_name
        ),
        'message', 'PIN validation successful'
    );
END;
$$;


ALTER FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") IS 'Validates PIN login with FLEXIBLE length - accepts any length numeric PIN.';



CREATE OR REPLACE FUNCTION "sales"."user_has_store_access"("target_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'business', 'auth', 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM business.store_users su 
        WHERE su.store_id = target_store_id 
        AND su.user_id = auth.uid() 
        AND su.is_active = true
    );
$$;


ALTER FUNCTION "sales"."user_has_store_access"("target_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "scoring"."calculate_batch_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
  -- Normalize to 0-1 scale (500 = 1.0)
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
$$;


ALTER FUNCTION "scoring"."calculate_batch_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "scoring"."calculate_batch_score"("p_store_id" "uuid", "p_expiration_date" "date", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_quantity" integer DEFAULT 1) RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT jsonb_build_object(
    'score', GREATEST(0.1, LEAST(1.0, 
      CASE 
        WHEN (p_expiration_date - CURRENT_DATE) <= 0 THEN 1.0
        WHEN (p_expiration_date - CURRENT_DATE) = 1 THEN 0.9
        WHEN (p_expiration_date - CURRENT_DATE) = 2 THEN 0.7
        WHEN (p_expiration_date - CURRENT_DATE) <= 7 THEN 0.5
        ELSE 0.2
      END * 
      CASE 
        WHEN p_quantity >= 10 THEN 1.2
        WHEN p_quantity >= 5 THEN 1.1
        ELSE 1.0
      END
    )),
    'urgency_level', 
    CASE 
      WHEN (p_expiration_date - CURRENT_DATE) <= 0 THEN 'critical'
      WHEN (p_expiration_date - CURRENT_DATE) <= 2 THEN 'high'
      WHEN (p_expiration_date - CURRENT_DATE) <= 7 THEN 'medium'
      ELSE 'low'
    END,
    'days_until_expiration', (p_expiration_date - CURRENT_DATE),
    'recommended_action',
    CASE 
      WHEN (p_expiration_date - CURRENT_DATE) <= 0 THEN 'donate_or_dispose'
      WHEN (p_expiration_date - CURRENT_DATE) <= 1 THEN 'immediate_discount'
      WHEN (p_expiration_date - CURRENT_DATE) <= 3 THEN 'apply_discount'
      ELSE 'monitor'
    END
  );
$$;


ALTER FUNCTION "scoring"."calculate_batch_score"("p_store_id" "uuid", "p_expiration_date" "date", "p_category_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'scoring', 'inventory', 'public'
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_batch RECORD;
BEGIN
  -- Loop through all active batches and manually trigger scoring
  FOR v_batch IN 
    SELECT * FROM inventory.batches 
    WHERE store_id = p_store_id AND status = 'active'
  LOOP
    -- Manually calculate and insert/update scores
    PERFORM inventory.calculate_batch_score_manual(v_batch);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") IS 'Recalculates scores for all active batches in a store';



CREATE OR REPLACE FUNCTION "user_mgmt"."ensure_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  first_store_id UUID;
BEGIN
  -- Get the user's first store (if any)
  SELECT store_id INTO first_store_id
  FROM business.store_users
  WHERE user_id = NEW.id
  ORDER BY assigned_at ASC
  LIMIT 1;
  
  -- Insert user preferences with first store as primary
  INSERT INTO user_mgmt.user_preferences (user_id, primary_store_id)
  VALUES (NEW.id, first_store_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "user_mgmt"."ensure_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text" DEFAULT 'user_request'::"text", "performed_by_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result JSON;
    user_record RECORD;
    owned_stores_count INTEGER;
    created_batches_count INTEGER;
    created_products_count INTEGER;
BEGIN
    -- Validate deletion type
    IF deletion_type NOT IN ('user_request', 'admin_action', 'automated') THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Invalid deletion type'
        );
    END IF;
    
    -- Get user details before deletion
    SELECT id, email, raw_user_meta_data->>'full_name' as full_name
    INTO user_record
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Check if user exists
    IF user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found'
        );
    END IF;
    
    -- Count business impact
    SELECT COUNT(*) INTO owned_stores_count FROM business.stores WHERE owner_id = target_user_id;
    SELECT COUNT(*) INTO created_batches_count FROM inventory.batches WHERE created_by = target_user_id;
    SELECT COUNT(*) INTO created_products_count FROM inventory.products WHERE created_by = target_user_id;
    
    -- Log the deletion request
    INSERT INTO user_mgmt.gdpr_deletion_log (
        user_id,
        user_email,
        user_full_name,
        deletion_type,
        business_impact_notes,
        performed_by
    ) VALUES (
        user_record.id,
        user_record.email,
        user_record.full_name,
        deletion_type,
        format('Owned stores: %s, Created batches: %s, Created products: %s', 
               owned_stores_count, created_batches_count, created_products_count),
        performed_by_user_id
    );
    
    BEGIN
        -- STEP 1: Handle store ownership (CRITICAL - must resolve first)
        IF owned_stores_count > 0 THEN
            -- Set owner to NULL (requires manual admin resolution)
            UPDATE business.stores 
            SET owner_id = NULL,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
            
            -- Log this critical business impact
            UPDATE user_mgmt.gdpr_deletion_log 
            SET business_impact_notes = business_impact_notes || 
                format('. CRITICAL: %s stores now have NULL owner and need admin assignment.', owned_stores_count)
            WHERE user_id = target_user_id
            AND deletion_completed_at IS NULL;
        END IF;
        
        -- STEP 2: Anonymize business data (preserve records, remove personal links)
        
        -- Anonymize batch creation records
        UPDATE inventory.batches 
        SET created_by = NULL,
            updated_at = NOW()
        WHERE created_by = target_user_id;
        
        -- Anonymize product creation records  
        UPDATE inventory.products 
        SET created_by = NULL,
            updated_at = NOW()
        WHERE created_by = target_user_id;
        
        -- Anonymize batch actions (preserve audit trail)
        UPDATE inventory.batch_actions 
        SET performed_by = NULL,
            updated_at = NOW()
        WHERE performed_by = target_user_id;
        
        UPDATE inventory.batch_actions 
        SET verified_by = NULL,
            updated_at = NOW()
        WHERE verified_by = target_user_id;
        
        -- STEP 3: Delete analytics/temporary data (no business value)
        DELETE FROM analytics.actions 
        WHERE executed_by = target_user_id;
        
        -- STEP 4: Delete personal data (CASCADE will handle related auth tables)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        -- Update deletion log as completed
        UPDATE user_mgmt.gdpr_deletion_log 
        SET deletion_completed_at = NOW()
        WHERE user_id = target_user_id
        AND deletion_completed_at IS NULL;
        
        RETURN json_build_object(
            'success', true,
            'message', 'GDPR deletion completed successfully',
            'details', json_build_object(
                'user_email', user_record.email,
                'business_impact', json_build_object(
                    'stores_transferred', owned_stores_count,
                    'batches_anonymized', created_batches_count,
                    'products_anonymized', created_products_count
                ),
                'compliance_note', 'Personal data deleted, business data anonymized per GDPR Article 17'
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't complete the deletion
        UPDATE user_mgmt.gdpr_deletion_log 
        SET business_impact_notes = business_impact_notes || 
            format('. ERROR: Deletion failed - %s', SQLERRM)
        WHERE user_id = target_user_id
        AND deletion_completed_at IS NULL;
        
        RETURN json_build_object(
            'success', false,
            'message', 'GDPR deletion failed: ' || SQLERRM,
            'user_email', user_record.email
        );
    END;
END;
$$;


ALTER FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text", "performed_by_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text", "performed_by_user_id" "uuid") IS 'GDPR-compliant user deletion: removes personal data, anonymizes business data, preserves critical business records per GDPR Article 17 legitimate interest exceptions';



CREATE OR REPLACE FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean DEFAULT false, "deletion_type" "text" DEFAULT 'user_request'::"text", "performed_by_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result JSON;
    user_record RECORD;
    owned_stores_count INTEGER;
BEGIN
    -- Get user details before deletion
    SELECT id, email, raw_user_meta_data->>'full_name' as full_name
    INTO user_record
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Check if user exists
    IF user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found'
        );
    END IF;
    
    -- Count owned stores
    SELECT COUNT(*) INTO owned_stores_count 
    FROM business.stores 
    WHERE owner_id = target_user_id;
    
    IF delete_owned_stores AND owned_stores_count > 0 THEN
        -- Delete all owned stores first
        PERFORM business.delete_store_and_data(store_id, 'Owner account deletion', performed_by_user_id)
        FROM business.stores 
        WHERE owner_id = target_user_id;
    END IF;
    
    -- Now delete the user
    SELECT user_mgmt.gdpr_delete_user(target_user_id, deletion_type, performed_by_user_id) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean, "deletion_type" "text", "performed_by_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean, "deletion_type" "text", "performed_by_user_id" "uuid") IS 'Enhanced GDPR-compliant user deletion that can optionally delete owned stores. Use delete_owned_stores=true for business closure scenarios.';



CREATE OR REPLACE FUNCTION "user_mgmt"."get_current_user_preferences"() RETURNS TABLE("user_id" "uuid", "primary_store_id" "uuid", "preferences" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID once
  v_user_id := auth.uid();
  
  -- Early return if not authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Direct query without RLS overhead
  RETURN QUERY
  SELECT 
    up.user_id,
    up.primary_store_id,
    up.preferences,
    up.created_at,
    up.updated_at
  FROM user_mgmt.user_preferences up
  WHERE up.user_id = v_user_id;
END;
$$;


ALTER FUNCTION "user_mgmt"."get_current_user_preferences"() OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."get_current_user_preferences"() IS 'Get current user preferences. Optimized SECURITY DEFINER function that bypasses RLS overhead (595ms → ~20ms). Returns at most one row.';



CREATE OR REPLACE FUNCTION "user_mgmt"."get_current_user_preferences_v2"() RETURNS TABLE("user_id" "uuid", "primary_store_id" "uuid", "preferences" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER PARALLEL SAFE
    AS $$
  -- Direct index lookup, no PL/pgSQL overhead
  -- This is 2-3x faster than the PL/pgSQL version
  SELECT 
    up.user_id,
    up.primary_store_id,
    up.preferences,
    up.created_at,
    up.updated_at
  FROM user_mgmt.user_preferences up
  WHERE up.user_id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "user_mgmt"."get_current_user_preferences_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."get_current_user_preferences_v2"() IS 'Performance-optimized version using SQL instead of PL/pgSQL. Achieves 50-70% faster execution by eliminating PL/pgSQL overhead and using direct index scan with LIMIT 1.';



CREATE OR REPLACE FUNCTION "user_mgmt"."get_user_roles"("user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS "text"[]
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT ARRAY_AGG(r.role_name)
    FROM user_mgmt.roles r
    JOIN user_mgmt.user_roles ur ON r.role_id = ur.role_id
    WHERE ur.user_id = user_uuid;
$$;


ALTER FUNCTION "user_mgmt"."get_user_roles"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "user_mgmt"."has_role"("role_name" "text", "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
    SELECT EXISTS (
        SELECT 1
        FROM user_mgmt.roles r
        JOIN user_mgmt.user_roles ur ON r.role_id = ur.role_id
        WHERE ur.user_id = user_uuid AND r.role_name = $1
    );
$_$;


ALTER FUNCTION "user_mgmt"."has_role"("role_name" "text", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
    SELECT EXISTS (
        SELECT 1
        FROM user_mgmt.roles r
        JOIN user_mgmt.user_roles ur ON r.role_id = ur.role_id
        WHERE ur.user_id = user_uuid AND r.role_name = $1
    );
$_$;


ALTER FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") IS 'Optimized version of has_role for RLS policies that accepts a pre-cached user_id to avoid re-evaluating auth.uid() for each row';



CREATE OR REPLACE FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text" DEFAULT 'User requested account deletion'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    current_user_id UUID;
    user_record RECORD;
    owned_stores_count INTEGER;
    result JSON;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;
    
    -- Get user details
    SELECT id, email, raw_user_meta_data->>'full_name' as full_name
    INTO user_record
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Check if user owns any stores
    SELECT COUNT(*) INTO owned_stores_count 
    FROM business.stores 
    WHERE owner_id = current_user_id;
    
    -- For store owners, require additional confirmation
    IF owned_stores_count > 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Account deletion request received',
            'details', json_build_object(
                'status', 'pending_admin_review',
                'reason', format('You own %s store(s). A LIFO administrator will contact you to arrange ownership transfer.', owned_stores_count),
                'owned_stores', owned_stores_count
            )
        );
    ELSE
        -- For non-store-owners, process deletion immediately
        SELECT user_mgmt.gdpr_delete_user(current_user_id, 'user_request', current_user_id) INTO result;
        RETURN result;
    END IF;
END;
$$;


ALTER FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text") IS 'GDPR Right to Erasure: Allows users to request account deletion. Store owners require admin review for ownership transfer.';



CREATE OR REPLACE FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Update delivery_sent_at when status changes to 'sent'
    IF OLD.delivery_status != 'sent' AND NEW.delivery_status = 'sent' THEN
        NEW.delivery_sent_at = NOW();
    END IF;
    
    -- Update delivery_confirmed_at when status changes to 'delivered'
    IF OLD.delivery_status != 'delivered' AND NEW.delivery_status = 'delivered' THEN
        NEW.delivery_confirmed_at = NOW();
    END IF;
    
    -- Always update updated_at
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() IS 'Trigger function to update PIN delivery timestamps. Search path set for security.';



CREATE OR REPLACE FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has access to this store
  IF NOT business.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Access denied to store %', p_store_id;
  END IF;

  -- Upsert preferences
  INSERT INTO user_mgmt.user_preferences (user_id, primary_store_id, updated_at)
  VALUES (v_user_id, p_store_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    primary_store_id = p_store_id,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") IS 'Update user primary store with authorization check. SECURITY DEFINER ensures proper access control.';



CREATE OR REPLACE FUNCTION "user_mgmt"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "user_mgmt"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'user_mgmt', 'auth', 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = store_uuid
      AND su.user_id = auth.uid()
      AND su.is_active = true
  );
END;
$$;


ALTER FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") IS 'Helper function to check if the current user has access to a specific store';



CREATE OR REPLACE FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'business', 'user_mgmt', 'auth', 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business.store_users su
    WHERE su.store_id = store_uuid
      AND su.user_id = auth.uid()
      AND su.role_in_store IN ('owner', 'manager')
      AND su.is_active = true
  );
END;
$$;


ALTER FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") IS 'Helper function to check if the current user is a manager or owner of a specific store';



CREATE TABLE IF NOT EXISTS "analytics"."actions" (
    "action_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_id" "uuid",
    "store_id" "uuid",
    "action_type" character varying(50),
    "original_price" numeric(12,4),
    "new_price" numeric(12,4),
    "discount_percent" numeric(5,2),
    "executed_at" timestamp without time zone DEFAULT "now"(),
    "executed_by" "uuid",
    "quantity_sold_24h" numeric(12,4),
    "quantity_sold_48h" numeric(12,4),
    "revenue_recovered" numeric(12,4),
    "effectiveness_score" numeric(3,2)
);


ALTER TABLE "analytics"."actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timeseries"."inventory_snapshots" (
    "snapshot_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_id" "uuid",
    "store_id" "uuid",
    "sku" character varying(100),
    "quantity" numeric(12,4),
    "price" numeric(12,4),
    "days_to_expiry" integer,
    "snapshot_timestamp" timestamp without time zone DEFAULT "now"(),
    "day_of_week" integer,
    "hour_of_day" integer,
    "is_weekend" boolean,
    "temperature" numeric(5,2),
    "is_holiday" boolean
);


ALTER TABLE "timeseries"."inventory_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "timeseries"."inventory_snapshots" IS 'Time-series snapshots of inventory state. RLS enabled: users can only access data for stores they are associated with. Service role can insert for automated analytics.';



CREATE MATERIALIZED VIEW "analytics"."daily_inventory_summary" AS
 SELECT "store_id",
    "sku",
    "date_trunc"('day'::"text", "snapshot_timestamp") AS "snapshot_date",
    "avg"("quantity") AS "avg_quantity",
    "min"("quantity") AS "min_quantity",
    "max"("quantity") AS "max_quantity",
    "avg"("days_to_expiry") AS "avg_days_to_expiry",
    "count"(*) AS "snapshot_count"
   FROM "timeseries"."inventory_snapshots"
  GROUP BY "store_id", "sku", ("date_trunc"('day'::"text", "snapshot_timestamp"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."daily_inventory_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timeseries"."sales_events" (
    "event_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_id" "uuid",
    "store_id" "uuid",
    "sku" character varying(100),
    "quantity_sold" numeric(12,4),
    "sale_price" numeric(12,4),
    "sale_timestamp" timestamp without time zone DEFAULT "now"(),
    "channel" character varying(50) DEFAULT 'in_store'::character varying,
    "customer_type" character varying(50) DEFAULT 'regular'::character varying
);


ALTER TABLE "timeseries"."sales_events" OWNER TO "postgres";


COMMENT ON TABLE "timeseries"."sales_events" IS 'Time-series sales events. RLS enabled: users can only access data for stores they are associated with. Authorized users can insert scan-out events.';



CREATE MATERIALIZED VIEW "analytics"."daily_sales_summary" AS
 SELECT "store_id",
    "sku",
    "date_trunc"('day'::"text", "sale_timestamp") AS "sale_date",
    "sum"("quantity_sold") AS "total_quantity_sold",
    "sum"(("quantity_sold" * "sale_price")) AS "total_revenue",
    "avg"("sale_price") AS "avg_sale_price",
    "count"(*) AS "transaction_count"
   FROM "timeseries"."sales_events"
  GROUP BY "store_id", "sku", ("date_trunc"('day'::"text", "sale_timestamp"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."daily_sales_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "business"."store_settings" (
    "store_id" "uuid" NOT NULL,
    "scoring_weights" "jsonb" DEFAULT '{"expiry": 0.5, "margin": 0.2, "velocity": 0.3}'::"jsonb",
    "critical_threshold" numeric(3,2) DEFAULT 0.80,
    "warning_threshold" numeric(3,2) DEFAULT 0.60,
    "opening_hours" "jsonb" DEFAULT '{"monday": {"open": "08:00", "close": "20:00"}}'::"jsonb",
    "peak_hours" "jsonb" DEFAULT '{"evening": "17:00-19:00", "morning": "08:00-10:00"}'::"jsonb",
    "weather_location_lat" numeric(10,8),
    "weather_location_lon" numeric(11,8),
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "notification_preferences" "jsonb" DEFAULT '{"sms_alerts": false, "alert_types": ["critical_expiry", "low_stock", "system_updates"], "email_alerts": true, "push_notifications": true}'::"jsonb",
    "backup_preferences" "jsonb" DEFAULT '{"auto_backup": true, "retention_days": 30, "backup_frequency": "daily"}'::"jsonb",
    "display_preferences" "jsonb" DEFAULT '{"theme": "light", "language": "en", "date_format": "DD/MM/YYYY", "time_format": "24h"}'::"jsonb",
    "donation_preference_config" "jsonb" DEFAULT '{"strategy": "balanced", "show_reasoning": true, "blocked_recipients": [], "margin_sensitivity": 1.0, "tax_deduction_rate": 60.0, "auto_donate_enabled": false, "excluded_categories": ["fresh_meat_fish", "alcohol_tobacco"], "min_value_threshold": 10.0, "critical_expiry_days": 1, "preferred_recipients": ["food_bank", "soup_kitchen", "charity"], "max_days_before_expiry": 7, "max_value_per_donation": 500.0, "min_days_before_expiry": 1, "bulk_quantity_threshold": 50.0, "enable_tax_calculations": true, "min_margin_for_discount": 40.0, "small_quantity_fallback": "discount", "donation_first_threshold": 0.6, "force_donation_categories": [], "min_quantity_for_donation": 1.0, "require_user_confirmation": true, "donation_weight_multiplier": 1.0, "european_disposal_threshold": 35.0, "include_recipient_suggestions": true}'::"jsonb"
);


ALTER TABLE "business"."store_settings" OWNER TO "postgres";


COMMENT ON COLUMN "business"."store_settings"."donation_preference_config" IS 'Store donation preferences configuration including strategy, categories, and thresholds';



CREATE OR REPLACE VIEW "business"."store_type_reference" WITH ("security_invoker"='on') AS
 SELECT "unnest"("enum_range"(NULL::"business"."store_type_enum")) AS "store_type_value";


ALTER VIEW "business"."store_type_reference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "business"."store_users" (
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_in_store" character varying(50) DEFAULT 'staff'::character varying,
    "permissions" "jsonb" DEFAULT '{"can_view_analytics": true, "can_apply_discounts": false, "can_upload_inventory": true}'::"jsonb",
    "assigned_at" timestamp without time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "is_active" boolean DEFAULT true,
    "can_use_pin_auth" boolean DEFAULT false,
    "pin_access_level" character varying(20) DEFAULT 'basic'::character varying,
    "pin_permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "chk_pin_access_level" CHECK ((("pin_access_level")::"text" = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "store_users_role_in_store_check" CHECK ((("role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::"text"[])))
);


ALTER TABLE "business"."store_users" OWNER TO "postgres";


COMMENT ON COLUMN "business"."store_users"."created_at" IS 'Timestamp when this store user relationship was created.';



COMMENT ON COLUMN "business"."store_users"."updated_at" IS 'Timestamp of last update to this store user relationship. Automatically updated by trigger.';



CREATE OR REPLACE VIEW "business"."user_store_permissions" WITH ("security_invoker"='on') AS
 SELECT "su"."store_id",
    "su"."user_id",
    "su"."role_in_store",
    "su"."is_active",
    "su"."can_use_pin_auth",
    "su"."pin_access_level",
    "su"."permissions",
    "su"."assigned_at",
    "s"."owner_id",
    ("s"."owner_id" = "su"."user_id") AS "is_store_owner",
        CASE
            WHEN ("s"."owner_id" = "su"."user_id") THEN 'owner'::"text"
            WHEN (("su"."role_in_store")::"text" = 'manager'::"text") THEN 'manager'::"text"
            WHEN (("su"."role_in_store")::"text" = ANY (ARRAY[('employee'::character varying)::"text", ('staff'::character varying)::"text"])) THEN 'employee'::"text"
            ELSE 'employee'::"text"
        END AS "effective_role"
   FROM ("business"."store_users" "su"
     JOIN "business"."stores" "s" ON (("su"."store_id" = "s"."store_id")));


ALTER VIEW "business"."user_store_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."products" (
    "product_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sku" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "brand" character varying(100),
    "unit_type" character varying(20) NOT NULL,
    "typical_shelf_life_days" integer NOT NULL,
    "base_cost_price" numeric(12,4) NOT NULL,
    "base_selling_price" numeric(12,4) NOT NULL,
    "total_stock" numeric(12,4) DEFAULT 0,
    "active_batches_count" integer DEFAULT 0,
    "avg_days_to_expiry" numeric(8,2),
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "barcode" "text",
    "image_url" "text",
    "open_food_facts_data" "jsonb",
    "last_verified" timestamp without time zone DEFAULT "now"(),
    "barcode_type" character varying(20),
    "is_verified" boolean DEFAULT false,
    "verification_count" integer DEFAULT 0,
    "last_scanned_at" timestamp without time zone,
    "category_id" "uuid",
    CONSTRAINT "products_barcode_format_check" CHECK ((("barcode" IS NULL) OR (("length"("barcode") >= 8) AND ("length"("barcode") <= 50)))),
    CONSTRAINT "products_base_cost_price_check" CHECK (("base_cost_price" > (0)::numeric)),
    CONSTRAINT "products_base_selling_price_check" CHECK (("base_selling_price" > (0)::numeric)),
    CONSTRAINT "products_typical_shelf_life_days_check" CHECK (("typical_shelf_life_days" > 0))
);


ALTER TABLE "inventory"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."automation_preview" WITH ("security_invoker"='on') AS
 SELECT "b"."batch_id",
    "p"."name" AS "product_name",
    "p"."brand",
    "b"."expiry_date",
    "b"."current_quantity",
    "b"."status" AS "current_status",
        CASE
            WHEN ("b"."current_quantity" <= (0)::numeric) THEN 'sold_out'::character varying
            WHEN ("b"."expiry_date" < CURRENT_DATE) THEN 'expired'::character varying
            ELSE "b"."status"
        END AS "would_become_status",
    ("b"."current_quantity" * "b"."selling_price") AS "potential_loss_value",
    "s"."store_name",
    ("b"."expiry_date" - CURRENT_DATE) AS "days_past_expiry"
   FROM (("inventory"."batches" "b"
     JOIN "inventory"."products" "p" ON (("b"."product_id" = "p"."product_id")))
     JOIN "business"."stores" "s" ON (("b"."store_id" = "s"."store_id")))
  WHERE ((("b"."status")::"text" = 'active'::"text") AND (("b"."expiry_date" < CURRENT_DATE) OR ("b"."current_quantity" <= (0)::numeric)))
  ORDER BY "b"."expiry_date";


ALTER VIEW "inventory"."automation_preview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."barcode_scan_summary" WITH ("security_invoker"='on') AS
 SELECT "store_id",
    "batch_source",
    "verification_status",
    "count"(*) AS "batch_count",
    "avg"("scan_confidence") AS "avg_confidence",
    "count"(DISTINCT "scanned_barcode") AS "unique_barcodes",
    "min"("created_at") AS "first_scan",
    "max"("created_at") AS "last_scan"
   FROM "inventory"."batches" "b"
  WHERE (("scanned_barcode" IS NOT NULL) AND "inventory"."user_can_access_store"("store_id"))
  GROUP BY "store_id", "batch_source", "verification_status";


ALTER VIEW "inventory"."barcode_scan_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."batch_actions" (
    "entry_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "action_type" "public"."action_type",
    "quantity_affected" numeric(10,4),
    "total_original_value" numeric(10,2) DEFAULT 0,
    "total_recovered_value" numeric(10,2) DEFAULT 0,
    "discount_percentage" numeric(5,2),
    "donation_recipient_id" "uuid",
    "disposal_reason" "text",
    "performed_by" "uuid",
    "performed_at" timestamp without time zone DEFAULT "now"(),
    "verified_at" timestamp without time zone,
    "verified_by" "uuid",
    "notes" "text",
    "batch_initial_quantity" numeric(10,4),
    "recommended_action" "public"."action_type",
    "ai_score" numeric(5,3),
    "store_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "batch_action_entries_discount_percentage_check" CHECK ((("discount_percentage" IS NULL) OR (("discount_percentage" >= (0)::numeric) AND ("discount_percentage" <= (100)::numeric)))),
    CONSTRAINT "batch_action_entries_quantity_affected_check" CHECK ((("quantity_affected" > (0)::numeric) OR (("quantity_affected" = (0)::numeric) AND ("action_type" = 'ignored'::"public"."action_type")))),
    CONSTRAINT "batch_actions_valid_action" CHECK (((("action_type" IS NOT NULL) AND ("action_type" <> 'ignored'::"public"."action_type") AND ("performed_by" IS NOT NULL) AND ("quantity_affected" IS NOT NULL) AND ("quantity_affected" > (0)::numeric)) OR (("action_type" = 'ignored'::"public"."action_type") AND ("quantity_affected" IS NOT NULL)))),
    CONSTRAINT "valid_action_specific_fields" CHECK (((("action_type" = 'discount'::"public"."action_type") AND ("discount_percentage" IS NOT NULL)) OR ("action_type" = 'donate'::"public"."action_type") OR (("action_type" = 'dispose'::"public"."action_type") AND ("disposal_reason" IS NOT NULL)) OR ("action_type" = ANY (ARRAY['maintain'::"public"."action_type", 'ignored'::"public"."action_type", 'donate_prepared'::"public"."action_type", 'sold'::"public"."action_type"])))),
    CONSTRAINT "valid_recovered_value" CHECK ((("total_recovered_value" >= (0)::numeric) AND ("total_recovered_value" <= "total_original_value")))
);


ALTER TABLE "inventory"."batch_actions" OWNER TO "postgres";


COMMENT ON TABLE "inventory"."batch_actions" IS 'Enhanced action tracking for inventory batches supporting multiple actions per batch with detailed quantity breakdowns and financial tracking';



COMMENT ON COLUMN "inventory"."batch_actions"."action_type" IS 'The action the user actually took. NULL = pending recommendation awaiting user action.';



COMMENT ON COLUMN "inventory"."batch_actions"."batch_initial_quantity" IS 'Stored copy of batch initial quantity for percentage calculation stability';



COMMENT ON COLUMN "inventory"."batch_actions"."recommended_action" IS 'The action recommended by the AI scoring engine.';



COMMENT ON CONSTRAINT "valid_action_specific_fields" ON "inventory"."batch_actions" IS 'Validates that action-specific fields are provided based on action_type:
- discount: requires discount_percentage
- donate: donation_recipient_id is optional (can be NULL for ad-hoc donations, recipient name in notes)
- dispose: requires disposal_reason
- sold/maintain/ignored/donate_prepared: no specific fields required';



CREATE TABLE IF NOT EXISTS "inventory"."categories" (
    "category_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_code" "text" NOT NULL,
    "display_name_en" "text" NOT NULL,
    "display_name_fr" "text",
    "parent_category_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "typical_shelf_life_days" integer,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "inventory"."categories" OWNER TO "postgres";


COMMENT ON TABLE "inventory"."categories" IS 'Product categories with parent-child relationships. Former categories_hierarchy view removed as redundant for current 2-level structure.';



CREATE OR REPLACE VIEW "inventory"."batch_expiry_status" WITH ("security_invoker"='on') AS
 SELECT "b"."batch_id",
    "b"."product_id",
    "b"."store_id",
    "b"."expiry_date",
    "b"."current_quantity",
    "b"."created_at",
    "p"."name" AS "product_name",
    "p"."category_id",
    "c"."display_name_en" AS "category_name",
    "c"."category_code",
    ("b"."expiry_date" - CURRENT_DATE) AS "days_to_expiry",
        CASE
            WHEN (("b"."expiry_date" - CURRENT_DATE) <= 1) THEN 'Critical'::"text"
            WHEN (("b"."expiry_date" - CURRENT_DATE) <= 7) THEN 'Urgent'::"text"
            WHEN (("b"."expiry_date" - CURRENT_DATE) <= 14) THEN 'Warning'::"text"
            ELSE 'Normal'::"text"
        END AS "urgency_level",
        CASE
            WHEN ("b"."expiry_date" < CURRENT_DATE) THEN 'Expired'::"text"
            WHEN ("b"."current_quantity" = (0)::numeric) THEN 'Empty'::"text"
            WHEN (("b"."expiry_date" - CURRENT_DATE) <= 7) THEN 'Expiring_Soon'::"text"
            ELSE 'Active'::"text"
        END AS "status"
   FROM (("inventory"."batches" "b"
     JOIN "inventory"."products" "p" ON (("b"."product_id" = "p"."product_id")))
     LEFT JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")))
  WHERE ("b"."current_quantity" > (0)::numeric)
  ORDER BY ("b"."expiry_date" - CURRENT_DATE);


ALTER VIEW "inventory"."batch_expiry_status" OWNER TO "postgres";


COMMENT ON VIEW "inventory"."batch_expiry_status" IS 'View showing batch expiry status with urgency levels. Uses security_invoker=on to respect caller RLS policies.';



CREATE OR REPLACE VIEW "inventory"."batch_status" WITH ("security_invoker"='on') AS
 SELECT "batch_id",
    "product_id",
    "batch_number",
    "supplier",
    "manufacture_date",
    "expiry_date",
    "received_date",
    "initial_quantity",
    "current_quantity",
    "reserved_quantity",
    "cost_price",
    "selling_price",
    "location_code",
    "status",
    "available_quantity",
    "created_by",
    "created_at",
    "updated_at",
    ("expiry_date" - CURRENT_DATE) AS "days_to_expiry",
    ("expiry_date" < CURRENT_DATE) AS "is_expired",
    (CURRENT_DATE - "received_date") AS "turnover_days",
        CASE
            WHEN ("expiry_date" < CURRENT_DATE) THEN 'expired'::"text"
            WHEN (("expiry_date" - CURRENT_DATE) <= 3) THEN 'critical'::"text"
            WHEN (("expiry_date" - CURRENT_DATE) <= 7) THEN 'urgent'::"text"
            WHEN (("expiry_date" - CURRENT_DATE) <= 30) THEN 'warning'::"text"
            ELSE 'good'::"text"
        END AS "expiry_status"
   FROM "inventory"."batches" "b";


ALTER VIEW "inventory"."batch_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."batch_status_logs" (
    "log_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "affected_count" integer DEFAULT 0,
    "executed_at" timestamp without time zone DEFAULT "now"(),
    "notes" "text",
    "created_by" "uuid"
);


ALTER TABLE "inventory"."batch_status_logs" OWNER TO "postgres";


COMMENT ON TABLE "inventory"."batch_status_logs" IS 'Logs all automatic and manual batch status changes for monitoring and auditing purposes.';



CREATE TABLE IF NOT EXISTS "scoring"."product_scores" (
    "score_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_id" "uuid",
    "store_id" "uuid",
    "expiry_score" numeric(3,2),
    "velocity_score" numeric(3,2),
    "margin_score" numeric(3,2),
    "composite_score" numeric(3,2),
    "recommendation" character varying(50),
    "ml_enhanced" boolean DEFAULT false,
    "confidence_level" numeric(3,2),
    "calculated_at" timestamp without time zone DEFAULT "now"(),
    "urgency_level" "text",
    "days_to_expiry" integer,
    "potential_loss" numeric(10,2),
    "margin_percent" numeric(5,2),
    "financial_impact_score" numeric(3,2),
    "quantity_risk_score" numeric(3,2),
    "turnover_score" numeric(3,2),
    "category_risk_score" numeric(3,2),
    "reason" "text",
    "discount_percent" integer DEFAULT 0,
    CONSTRAINT "check_composite_score" CHECK ((("composite_score" IS NULL) OR (("composite_score" >= (0)::numeric) AND ("composite_score" <= (1)::numeric)))),
    CONSTRAINT "check_discount_percent_range" CHECK ((("discount_percent" IS NULL) OR (("discount_percent" >= 0) AND ("discount_percent" <= 100)))),
    CONSTRAINT "check_urgency_level" CHECK ((("urgency_level" IS NULL) OR ("urgency_level" = ANY (ARRAY['critical'::"text", 'high'::"text", 'medium'::"text", 'low'::"text", 'none'::"text"]))))
);


ALTER TABLE "scoring"."product_scores" OWNER TO "postgres";


COMMENT ON COLUMN "scoring"."product_scores"."reason" IS 'Explanation of why this score/recommendation was given';



COMMENT ON COLUMN "scoring"."product_scores"."discount_percent" IS 'Recommended discount percentage (0-100)';



CREATE OR REPLACE VIEW "inventory"."batch_todo_states" WITH ("security_invoker"='on') AS
 WITH "all_actions" AS (
         SELECT DISTINCT ON ("batch_actions"."batch_id") "batch_actions"."batch_id",
            "batch_actions"."action_type" AS "last_action_type",
            "batch_actions"."performed_at" AS "last_action_time",
            "batch_actions"."quantity_affected" AS "last_action_quantity",
            "batch_actions"."discount_percentage" AS "last_discount_percent"
           FROM "inventory"."batch_actions"
          WHERE (("batch_actions"."action_type" IS NOT NULL) AND ("batch_actions"."performed_by" IS NOT NULL) AND ("batch_actions"."quantity_affected" > (0)::numeric))
          ORDER BY "batch_actions"."batch_id", "batch_actions"."performed_at" DESC
        ), "action_summary" AS (
         SELECT "batch_actions"."batch_id",
            "count"(*) AS "total_actions",
            "sum"(
                CASE
                    WHEN ("batch_actions"."action_type" = 'discount'::"public"."action_type") THEN "batch_actions"."quantity_affected"
                    ELSE (0)::numeric
                END) AS "total_discounted",
            "sum"(
                CASE
                    WHEN ("batch_actions"."action_type" = ANY (ARRAY['donate'::"public"."action_type", 'donate_prepared'::"public"."action_type"])) THEN "batch_actions"."quantity_affected"
                    ELSE (0)::numeric
                END) AS "total_donated",
            "sum"(
                CASE
                    WHEN ("batch_actions"."action_type" = 'dispose'::"public"."action_type") THEN "batch_actions"."quantity_affected"
                    ELSE (0)::numeric
                END) AS "total_disposed",
            "sum"(
                CASE
                    WHEN ("batch_actions"."action_type" = 'sold'::"public"."action_type") THEN "batch_actions"."quantity_affected"
                    ELSE (0)::numeric
                END) AS "total_sold",
            "sum"(
                CASE
                    WHEN ("batch_actions"."action_type" = 'ignored'::"public"."action_type") THEN "batch_actions"."quantity_affected"
                    ELSE (0)::numeric
                END) AS "total_ignored",
            "max"("batch_actions"."performed_at") AS "last_action_date"
           FROM "inventory"."batch_actions"
          WHERE ("batch_actions"."action_type" IS NOT NULL)
          GROUP BY "batch_actions"."batch_id"
        )
 SELECT "b"."batch_id",
    "b"."store_id",
    "b"."batch_number",
    "b"."expiry_date",
    "b"."current_quantity",
    "b"."available_quantity",
    "b"."status" AS "batch_status",
    "p"."name" AS "product_name",
    "p"."brand" AS "product_brand",
    "ps"."recommendation" AS "ai_recommendation",
    "ps"."composite_score",
    "ps"."urgency_level",
    "ps"."calculated_at" AS "ai_calculated_at",
    "aa"."last_action_type",
    "aa"."last_action_time",
    "aa"."last_action_quantity",
    "aa"."last_discount_percent",
    COALESCE("acs"."total_actions", (0)::bigint) AS "total_actions_ever",
    COALESCE("acs"."total_discounted", (0)::numeric) AS "total_discounted_quantity",
    COALESCE("acs"."total_donated", (0)::numeric) AS "total_donated_quantity",
    COALESCE("acs"."total_disposed", (0)::numeric) AS "total_disposed_quantity",
    COALESCE("acs"."total_sold", (0)::numeric) AS "total_sold_quantity",
    COALESCE("acs"."total_ignored", (0)::numeric) AS "total_ignored_quantity",
    "b"."cost_price",
    "b"."selling_price",
        CASE
            WHEN (("aa"."last_action_type" = 'discount'::"public"."action_type") AND ("aa"."last_discount_percent" IS NOT NULL)) THEN ("b"."selling_price" * ((1)::numeric - ("aa"."last_discount_percent" / (100)::numeric)))
            ELSE "b"."selling_price"
        END AS "current_selling_price",
    ("b"."selling_price" - COALESCE("b"."cost_price", (0)::numeric)) AS "profit_margin",
        CASE
            WHEN (COALESCE("b"."cost_price", (0)::numeric) > (0)::numeric) THEN ((("b"."selling_price" - COALESCE("b"."cost_price", (0)::numeric)) / "b"."cost_price") * (100)::numeric)
            ELSE (0)::numeric
        END AS "profit_margin_percent",
    ("b"."current_quantity" * COALESCE("b"."cost_price", (0)::numeric)) AS "potential_loss_value",
    ("b"."current_quantity" * COALESCE("b"."selling_price", (0)::numeric)) AS "potential_revenue_value",
    ("b"."current_quantity" *
        CASE
            WHEN (("aa"."last_action_type" = 'discount'::"public"."action_type") AND ("aa"."last_discount_percent" IS NOT NULL)) THEN ("b"."selling_price" * ((1)::numeric - ("aa"."last_discount_percent" / (100)::numeric)))
            ELSE "b"."selling_price"
        END) AS "current_total_value",
    COALESCE("b"."selling_price", (0)::numeric) AS "unit_price",
        CASE
            WHEN ("b"."current_quantity" = (0)::numeric) THEN 'completed'::"text"
            WHEN ("aa"."last_action_type" = 'ignored'::"public"."action_type") THEN 'completed'::"text"
            WHEN ("aa"."last_action_type" = ANY (ARRAY['discount'::"public"."action_type", 'donate_prepared'::"public"."action_type"])) THEN 'in_progress'::"text"
            WHEN (("aa"."last_action_type" = ANY (ARRAY['donate'::"public"."action_type", 'dispose'::"public"."action_type", 'sold'::"public"."action_type"])) AND ("b"."current_quantity" > (0)::numeric)) THEN 'in_progress'::"text"
            WHEN ("aa"."last_action_type" IS NOT NULL) THEN 'in_progress'::"text"
            ELSE 'pending'::"text"
        END AS "completion_status",
        CASE
            WHEN (("aa"."last_action_type" = 'ignored'::"public"."action_type") AND (("ps"."calculated_at" IS NULL) OR ("aa"."last_action_time" >= "ps"."calculated_at"))) THEN 'recently_ignored'::"text"
            WHEN (("ps"."urgency_level" = ANY (ARRAY['critical'::"text", 'high'::"text"])) AND (("aa"."last_action_time" IS NULL) OR ("aa"."last_action_time" < "ps"."calculated_at")) AND ("b"."current_quantity" > (0)::numeric) AND (("aa"."last_action_type" IS NULL) OR ("aa"."last_action_type" <> 'ignored'::"public"."action_type"))) THEN 'immediate_action'::"text"
            WHEN (("b"."expiry_date" >= (CURRENT_DATE - '7 days'::interval)) AND ("b"."expiry_date" < CURRENT_DATE) AND (("aa"."last_action_type" IS NULL) OR ("aa"."last_action_type" <> 'ignored'::"public"."action_type")) AND ("ps"."urgency_level" <> ALL (ARRAY['critical'::"text", 'high'::"text"]))) THEN 'recently_expired'::"text"
            WHEN (("aa"."last_action_time" IS NOT NULL) AND ("aa"."last_action_time" >= ("now"() - '24:00:00'::interval))) THEN
            CASE "aa"."last_action_type"
                WHEN 'discount'::"public"."action_type" THEN 'recently_discounted'::"text"
                WHEN 'donate_prepared'::"public"."action_type" THEN 'ready_for_donation'::"text"
                WHEN 'donate'::"public"."action_type" THEN 'recently_donated'::"text"
                WHEN 'dispose'::"public"."action_type" THEN 'recently_disposed'::"text"
                WHEN 'sold'::"public"."action_type" THEN 'recently_sold'::"text"
                WHEN 'ignored'::"public"."action_type" THEN 'recently_ignored'::"text"
                ELSE 'recent_action'::"text"
            END
            WHEN (("aa"."last_action_time" IS NOT NULL) AND ("aa"."last_action_time" < "ps"."calculated_at") AND ("ps"."calculated_at" IS NOT NULL) AND ("b"."current_quantity" > (0)::numeric) AND ("aa"."last_action_type" <> 'ignored'::"public"."action_type")) THEN 'needs_reeval'::"text"
            WHEN ((("ps"."recommendation")::"text" = ANY (ARRAY[('discount_moderate'::character varying)::"text", ('discount_aggressive'::character varying)::"text", ('dispose'::character varying)::"text", ('alert'::character varying)::"text"])) AND (("aa"."last_action_time" IS NULL) OR ("aa"."last_action_time" < "ps"."calculated_at")) AND ("b"."current_quantity" > (0)::numeric) AND (("aa"."last_action_type" IS NULL) OR ("aa"."last_action_type" <> 'ignored'::"public"."action_type")) AND ("ps"."urgency_level" <> ALL (ARRAY['critical'::"text", 'high'::"text"]))) THEN 'pending_action'::"text"
            WHEN ((("ps"."recommendation")::"text" = ANY (ARRAY[('maintain'::character varying)::"text", ('monitor'::character varying)::"text", ('normal'::character varying)::"text"])) AND ("b"."current_quantity" > (0)::numeric) AND (("aa"."last_action_type" IS NULL) OR ("aa"."last_action_type" <> 'ignored'::"public"."action_type"))) THEN 'monitor_only'::"text"
            ELSE 'unknown'::"text"
        END AS "todo_state",
        CASE
            WHEN ("ps"."urgency_level" = 'critical'::"text") THEN 1
            WHEN ("ps"."urgency_level" = 'high'::"text") THEN 2
            WHEN ("ps"."urgency_level" = 'medium'::"text") THEN 3
            ELSE 4
        END AS "priority_order",
    ("b"."expiry_date" - CURRENT_DATE) AS "days_to_expiry",
        CASE
            WHEN ("aa"."last_action_time" IS NOT NULL) THEN (EXTRACT(epoch FROM ("now"() - ("aa"."last_action_time")::timestamp with time zone)) / (3600)::numeric)
            ELSE NULL::numeric
        END AS "hours_since_last_action",
    "now"() AS "view_refreshed_at"
   FROM (((("inventory"."batches" "b"
     LEFT JOIN "inventory"."products" "p" ON (("b"."product_id" = "p"."product_id")))
     LEFT JOIN "scoring"."product_scores" "ps" ON (("b"."batch_id" = "ps"."batch_id")))
     LEFT JOIN "all_actions" "aa" ON (("b"."batch_id" = "aa"."batch_id")))
     LEFT JOIN "action_summary" "acs" ON (("b"."batch_id" = "acs"."batch_id")))
  WHERE ((("b"."status")::"text" = 'active'::"text") OR ("aa"."last_action_type" IS NOT NULL));


ALTER VIEW "inventory"."batch_todo_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."donation_recipients" (
    "recipient_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "recipient_type" "public"."donation_recipient_type" NOT NULL,
    "is_certified" boolean DEFAULT false,
    "certification_notes" "text",
    "accepts_pickups" boolean DEFAULT true,
    "max_distance_km" integer DEFAULT 10,
    "store_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "inventory"."donation_recipients" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."expiring_products" WITH ("security_invoker"='on') AS
 SELECT "p"."product_id",
    "p"."sku",
    "p"."name",
    "p"."description",
    "p"."brand",
    "p"."unit_type",
    "p"."typical_shelf_life_days",
    "p"."base_cost_price",
    "p"."base_selling_price",
    "p"."total_stock",
    "p"."active_batches_count",
    "p"."avg_days_to_expiry",
    "p"."created_by",
    "p"."created_at",
    "p"."updated_at",
    "p"."barcode",
    "p"."image_url",
    "p"."open_food_facts_data",
    "p"."last_verified",
    "p"."barcode_type",
    "p"."is_verified",
    "p"."verification_count",
    "p"."last_scanned_at",
    "p"."category_id",
    "c"."category_code",
    "c"."display_name_en" AS "category_name",
    "b"."expiry_date",
    "b"."current_quantity",
    ("b"."expiry_date" - CURRENT_DATE) AS "days_to_expiry"
   FROM (("inventory"."products" "p"
     JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")))
     JOIN "inventory"."batches" "b" ON (("p"."product_id" = "b"."product_id")))
  WHERE (("b"."expiry_date" <= (CURRENT_DATE + '7 days'::interval)) AND (("b"."status")::"text" = 'active'::"text") AND ("b"."current_quantity" > (0)::numeric));


ALTER VIEW "inventory"."expiring_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."store_products" (
    "store_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "cost_price" numeric(12,4),
    "selling_price" numeric(12,4),
    "is_active" boolean DEFAULT true,
    "store_sku" character varying(100),
    "supplier_code" character varying(50),
    "added_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "store_products_pricing_check" CHECK ((("cost_price" IS NULL) OR ("cost_price" > (0)::numeric))),
    CONSTRAINT "store_products_selling_price_check" CHECK ((("selling_price" IS NULL) OR ("selling_price" > (0)::numeric)))
);


ALTER TABLE "inventory"."store_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."my_store_products" WITH ("security_invoker"='on') AS
 SELECT "p"."product_id",
    "p"."sku",
    "p"."name",
    "p"."description",
    "p"."brand",
    "p"."unit_type",
    "p"."typical_shelf_life_days",
    "p"."base_cost_price",
    "p"."base_selling_price",
    "p"."total_stock",
    "p"."active_batches_count",
    "p"."avg_days_to_expiry",
    "p"."created_by",
    "p"."created_at",
    "p"."updated_at",
    "p"."barcode",
    "p"."image_url",
    "p"."open_food_facts_data",
    "p"."last_verified",
    "p"."barcode_type",
    "p"."is_verified",
    "p"."verification_count",
    "p"."last_scanned_at",
    "p"."category_id",
    "sp"."cost_price" AS "store_cost_price",
    "sp"."selling_price" AS "store_selling_price",
    "sp"."is_active" AS "store_is_active",
    "sp"."store_sku",
    "sp"."supplier_code",
    "c"."category_code",
    "c"."display_name_en" AS "category_name"
   FROM (("inventory"."products" "p"
     JOIN "inventory"."store_products" "sp" ON (("p"."product_id" = "sp"."product_id")))
     JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")))
  WHERE ("sp"."store_id" IN ( SELECT "su"."store_id"
           FROM "business"."store_users" "su"
          WHERE ("su"."user_id" = "auth"."uid"())));


ALTER VIEW "inventory"."my_store_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."ocr_processing_batches" (
    "batch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "image_count" integer NOT NULL,
    "processing_status" character varying(20) DEFAULT 'pending'::character varying,
    "submitted_at" timestamp without time zone DEFAULT "now"(),
    "completed_at" timestamp without time zone,
    "total_cost_cents" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "error_details" "jsonb",
    CONSTRAINT "ocr_processing_batches_processing_status_check" CHECK ((("processing_status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "inventory"."ocr_processing_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "inventory"."product_recognition_cache" (
    "cache_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barcode" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "brand" "text",
    "category" "text",
    "image_url" "text",
    "open_food_facts_data" "jsonb",
    "typical_shelf_life_days" integer,
    "last_verified" timestamp without time zone DEFAULT "now"(),
    "verification_count" integer DEFAULT 1,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "inventory"."product_recognition_cache" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."products_needing_barcodes" WITH ("security_invoker"='on') AS
 SELECT "p"."product_id",
    "p"."sku",
    "p"."name",
    "p"."description",
    "p"."brand",
    "p"."unit_type",
    "p"."typical_shelf_life_days",
    "p"."base_cost_price",
    "p"."base_selling_price",
    "p"."total_stock",
    "p"."active_batches_count",
    "p"."avg_days_to_expiry",
    "p"."created_by",
    "p"."created_at",
    "p"."updated_at",
    "p"."barcode",
    "p"."image_url",
    "p"."open_food_facts_data",
    "p"."last_verified",
    "p"."barcode_type",
    "p"."is_verified",
    "p"."verification_count",
    "p"."last_scanned_at",
    "p"."category_id",
    "c"."category_code",
    "c"."display_name_en" AS "category_name"
   FROM ("inventory"."products" "p"
     JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")))
  WHERE (("p"."barcode" IS NULL) OR ("p"."barcode" = ''::"text") OR ("p"."is_verified" = false));


ALTER VIEW "inventory"."products_needing_barcodes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."products_with_categories" WITH ("security_invoker"='on') AS
 SELECT "p"."product_id",
    "p"."sku",
    "p"."name",
    "p"."description",
    "p"."brand",
    "p"."unit_type",
    "p"."typical_shelf_life_days",
    "p"."base_cost_price",
    "p"."base_selling_price",
    "p"."total_stock",
    "p"."active_batches_count",
    "p"."avg_days_to_expiry",
    "p"."created_by",
    "p"."created_at",
    "p"."updated_at",
    "p"."barcode",
    "p"."image_url",
    "p"."open_food_facts_data",
    "p"."last_verified",
    "p"."barcode_type",
    "p"."is_verified",
    "p"."verification_count",
    "p"."last_scanned_at",
    "p"."category_id",
    "c"."category_code",
    "c"."display_name_en" AS "category_display_name_en",
    "c"."display_name_fr" AS "category_display_name_fr",
    "c"."typical_shelf_life_days" AS "category_shelf_life",
    COALESCE("p"."typical_shelf_life_days", "c"."typical_shelf_life_days") AS "effective_shelf_life"
   FROM ("inventory"."products" "p"
     JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")));


ALTER VIEW "inventory"."products_with_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "inventory"."sales_summary" WITH ("security_invoker"='on') AS
 SELECT "event_id",
    "batch_id",
    "store_id",
    "sku",
    "quantity_sold",
    "sale_price",
    "sale_timestamp",
    "channel",
    "customer_type",
    ("quantity_sold" * "sale_price") AS "sale_value"
   FROM "timeseries"."sales_events" "se";


ALTER VIEW "inventory"."sales_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_view_for_scoring" WITH ("security_invoker"='on') AS
 SELECT "b"."batch_id",
    "b"."product_id",
    "p"."sku",
    "c"."display_name_en" AS "category",
    "c"."category_code",
    "b"."current_quantity",
    "b"."expiry_date",
    "b"."selling_price",
    "b"."cost_price",
    ("b"."expiry_date" - CURRENT_DATE) AS "days_to_expiry",
    COALESCE("c"."typical_shelf_life_days", "p"."typical_shelf_life_days", 30) AS "typical_shelf_life_days",
    "b"."store_id"
   FROM (("inventory"."batches" "b"
     JOIN "inventory"."products" "p" ON (("b"."product_id" = "p"."product_id")))
     JOIN "inventory"."categories" "c" ON (("p"."category_id" = "c"."category_id")))
  WHERE (("b"."status")::"text" = 'active'::"text");


ALTER VIEW "public"."inventory_view_for_scoring" OWNER TO "postgres";


COMMENT ON VIEW "public"."inventory_view_for_scoring" IS 'View for Python FastAPI scoring service. Uses SECURITY INVOKER to respect RLS policies.';



CREATE UNLOGGED TABLE "public"."temp_batch_actions_staging" (
    "batch_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "recommended_action" "text",
    "ai_score" numeric,
    "notes" "text"
);


ALTER TABLE "public"."temp_batch_actions_staging" OWNER TO "postgres";


CREATE UNLOGGED TABLE "public"."temp_scores_staging" (
    "batch_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "expiry_score" numeric NOT NULL,
    "velocity_score" numeric NOT NULL,
    "margin_score" numeric NOT NULL,
    "composite_score" numeric NOT NULL,
    "recommendation" "text" NOT NULL,
    "urgency_level" "text" NOT NULL,
    "discount_percent" integer,
    "reason" "text",
    "ml_enhanced" boolean DEFAULT true,
    "confidence_level" numeric,
    "calculated_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."temp_scores_staging" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "sales"."transactions" (
    "transaction_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "original_price" numeric(10,2) NOT NULL,
    "total_amount" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "transaction_type" "sales"."transaction_type" NOT NULL,
    "sale_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "scanned_barcode" character varying(50),
    "performed_by" "uuid",
    CONSTRAINT "transactions_original_price_check" CHECK (("original_price" > (0)::numeric)),
    CONSTRAINT "transactions_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "transactions_unit_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "valid_discount_logic" CHECK (("unit_price" <= "original_price")),
    CONSTRAINT "valid_sale_date" CHECK ((("sale_date" >= '2020-01-01'::"date") AND ("sale_date" <= (CURRENT_DATE + '1 day'::interval))))
);


ALTER TABLE "sales"."transactions" OWNER TO "postgres";


COMMENT ON TABLE "sales"."transactions" IS 'Records all sales transactions for mobile performance tracking with <300ms query targets';



COMMENT ON COLUMN "sales"."transactions"."transaction_id" IS 'Primary key for transaction record';



COMMENT ON COLUMN "sales"."transactions"."store_id" IS 'Foreign key to business.stores for store-level data isolation';



COMMENT ON COLUMN "sales"."transactions"."batch_id" IS 'Foreign key to inventory.batches for inventory tracking';



COMMENT ON COLUMN "sales"."transactions"."quantity" IS 'Quantity of items sold (supports decimal quantities)';



COMMENT ON COLUMN "sales"."transactions"."unit_price" IS 'Actual selling price per unit after any discounts';



COMMENT ON COLUMN "sales"."transactions"."original_price" IS 'Original price per unit before any discounts';



COMMENT ON COLUMN "sales"."transactions"."total_amount" IS 'Computed total amount (quantity * unit_price)';



COMMENT ON COLUMN "sales"."transactions"."transaction_type" IS 'Type of transaction from sales.transaction_type enum';



COMMENT ON COLUMN "sales"."transactions"."sale_date" IS 'Date when the sale occurred';



COMMENT ON COLUMN "sales"."transactions"."scanned_barcode" IS 'Optional barcode that was scanned during transaction';



COMMENT ON COLUMN "sales"."transactions"."performed_by" IS 'User who performed the transaction';



CREATE TABLE IF NOT EXISTS "scoring"."category_weights" (
    "category" character varying(100) NOT NULL,
    "spoilage_risk_weight" numeric(4,3) DEFAULT 0.333 NOT NULL,
    "value_impact_weight" numeric(4,3) DEFAULT 0.333 NOT NULL,
    "turnover_speed_weight" numeric(4,3) DEFAULT 0.334 NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "chk_weights_sum" CHECK (("abs"(((("spoilage_risk_weight" + "value_impact_weight") + "turnover_speed_weight") - 1.000)) < 0.001))
);


ALTER TABLE "scoring"."category_weights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "timeseries"."external_factors" (
    "factor_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "store_id" "uuid",
    "recorded_at" timestamp without time zone DEFAULT "now"(),
    "temperature" numeric(5,2),
    "humidity" numeric(5,2),
    "is_rainy" boolean DEFAULT false,
    "is_holiday" boolean DEFAULT false,
    "local_events" "text"[],
    "day_of_week" integer,
    "hour_of_day" integer,
    "week_of_year" integer
);


ALTER TABLE "timeseries"."external_factors" OWNER TO "postgres";


COMMENT ON TABLE "timeseries"."external_factors" IS 'Time-series external factors (weather, events, holidays). RLS enabled: users can only access data for stores they are associated with. Service role handles automated imports.';



CREATE TABLE IF NOT EXISTS "user_mgmt"."gdpr_deletion_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "user_full_name" "text",
    "deletion_requested_at" timestamp without time zone DEFAULT "now"(),
    "deletion_completed_at" timestamp without time zone,
    "deletion_type" "text",
    "business_impact_notes" "text",
    "performed_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "gdpr_deletion_log_deletion_type_check" CHECK (("deletion_type" = ANY (ARRAY['user_request'::"text", 'admin_action'::"text", 'automated'::"text"])))
);


ALTER TABLE "user_mgmt"."gdpr_deletion_log" OWNER TO "postgres";


COMMENT ON TABLE "user_mgmt"."gdpr_deletion_log" IS 'Tracks GDPR user deletion requests and completions for compliance audit trail';



CREATE TABLE IF NOT EXISTS "user_mgmt"."roles" (
    "role_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "role_name" character varying(50) NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "user_mgmt"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "user_mgmt"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "primary_store_id" "uuid",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "user_mgmt"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "user_mgmt"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "user_mgmt"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "user_mgmt"."users" (
    "user_id" "uuid" NOT NULL,
    "username" character varying(255),
    "email" character varying(255),
    "password_hash" character varying(255),
    "full_name" character varying(255),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "user_mgmt"."users" OWNER TO "postgres";


COMMENT ON COLUMN "user_mgmt"."users"."updated_at" IS 'Timestamp of last update to this user record. Automatically updated by trigger.';



ALTER TABLE ONLY "analytics"."actions"
    ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("action_id");



ALTER TABLE ONLY "business"."store_settings"
    ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY ("store_id");



ALTER TABLE ONLY "business"."store_users"
    ADD CONSTRAINT "store_users_pkey" PRIMARY KEY ("store_id", "user_id");



ALTER TABLE ONLY "business"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("store_id");



ALTER TABLE ONLY "business"."stores"
    ADD CONSTRAINT "stores_store_code_key" UNIQUE ("store_code");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_pkey" PRIMARY KEY ("entry_id");



ALTER TABLE ONLY "inventory"."batch_status_logs"
    ADD CONSTRAINT "batch_status_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "inventory"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "inventory"."categories"
    ADD CONSTRAINT "categories_category_code_key" UNIQUE ("category_code");



ALTER TABLE ONLY "inventory"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "inventory"."donation_recipients"
    ADD CONSTRAINT "donation_recipients_pkey" PRIMARY KEY ("recipient_id");



ALTER TABLE ONLY "inventory"."ocr_processing_batches"
    ADD CONSTRAINT "ocr_processing_batches_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "inventory"."product_recognition_cache"
    ADD CONSTRAINT "product_recognition_cache_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "inventory"."product_recognition_cache"
    ADD CONSTRAINT "product_recognition_cache_pkey" PRIMARY KEY ("cache_id");



ALTER TABLE ONLY "inventory"."products"
    ADD CONSTRAINT "products_barcode_unique" UNIQUE ("barcode");



ALTER TABLE ONLY "inventory"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "inventory"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "inventory"."store_products"
    ADD CONSTRAINT "store_products_pkey" PRIMARY KEY ("store_id", "product_id");



ALTER TABLE ONLY "sales"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "scoring"."category_weights"
    ADD CONSTRAINT "category_weights_pkey" PRIMARY KEY ("category");



ALTER TABLE ONLY "scoring"."product_scores"
    ADD CONSTRAINT "product_scores_pkey" PRIMARY KEY ("score_id");



ALTER TABLE ONLY "timeseries"."external_factors"
    ADD CONSTRAINT "external_factors_pkey" PRIMARY KEY ("factor_id");



ALTER TABLE ONLY "timeseries"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("snapshot_id");



ALTER TABLE ONLY "timeseries"."sales_events"
    ADD CONSTRAINT "sales_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "user_mgmt"."gdpr_deletion_log"
    ADD CONSTRAINT "gdpr_deletion_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "user_mgmt"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id");



ALTER TABLE ONLY "user_mgmt"."roles"
    ADD CONSTRAINT "roles_role_name_key" UNIQUE ("role_name");



ALTER TABLE ONLY "user_mgmt"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "user_mgmt"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



ALTER TABLE ONLY "user_mgmt"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_actions_batch" ON "analytics"."actions" USING "btree" ("batch_id");



CREATE INDEX "idx_actions_store_time" ON "analytics"."actions" USING "btree" ("store_id", "executed_at");



CREATE INDEX "idx_daily_sales_store_date" ON "analytics"."daily_sales_summary" USING "btree" ("store_id", "sale_date");



CREATE INDEX "idx_daily_summary_store_date" ON "analytics"."daily_inventory_summary" USING "btree" ("store_id", "snapshot_date");



CREATE INDEX "idx_store_users_fetch_covering" ON "business"."store_users" USING "btree" ("user_id", "is_active") INCLUDE ("store_id", "role_in_store", "permissions", "assigned_at", "assigned_by") WHERE ("is_active" = true);



CREATE INDEX "idx_store_users_store" ON "business"."store_users" USING "btree" ("store_id");



CREATE INDEX "idx_store_users_store_active" ON "business"."store_users" USING "btree" ("store_id", "is_active", "user_id");



CREATE INDEX "idx_store_users_user" ON "business"."store_users" USING "btree" ("user_id");



CREATE INDEX "idx_store_users_user_active" ON "business"."store_users" USING "btree" ("user_id", "is_active", "store_id");



CREATE INDEX "idx_stores_fk_validation" ON "business"."stores" USING "btree" ("store_id") INCLUDE ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_stores_owner" ON "business"."stores" USING "btree" ("owner_id");



CREATE INDEX "idx_batch_action_entries_action_type_time" ON "inventory"."batch_actions" USING "btree" ("store_id", "action_type", "performed_at" DESC);



CREATE INDEX "idx_batch_action_entries_batch_id_perf" ON "inventory"."batch_actions" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_action_entries_performed_at" ON "inventory"."batch_actions" USING "btree" ("performed_at");



CREATE INDEX "idx_batch_action_entries_performed_by_perf" ON "inventory"."batch_actions" USING "btree" ("performed_by");



CREATE INDEX "idx_batch_action_entries_store_time" ON "inventory"."batch_actions" USING "btree" ("store_id", "performed_at" DESC);



CREATE INDEX "idx_batches_analytics_time" ON "inventory"."batches" USING "btree" ("store_id", "created_at", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_batch_number_search" ON "inventory"."batches" USING "btree" ("batch_number");



CREATE INDEX "idx_batches_bulk_duplicate_check" ON "inventory"."batches" USING "btree" ("store_id", "scanned_barcode", "expiry_date", "status") WHERE ((("status")::"text" = 'active'::"text") AND ("scanned_barcode" IS NOT NULL));



CREATE INDEX "idx_batches_created_by" ON "inventory"."batches" USING "btree" ("created_by");



CREATE INDEX "idx_batches_expiry_date" ON "inventory"."batches" USING "btree" ("expiry_date");



CREATE INDEX "idx_batches_expiry_range" ON "inventory"."batches" USING "btree" ("expiry_date", "store_id", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_fk_validation" ON "inventory"."batches" USING "btree" ("batch_id") INCLUDE ("store_id", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_id_mobile" ON "inventory"."batches" USING "btree" ("batch_id") INCLUDE ("product_id", "store_id", "current_quantity", "selling_price", "cost_price", "expiry_date") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_location_code_search" ON "inventory"."batches" USING "btree" ("location_code");



CREATE INDEX "idx_batches_mobile_scan" ON "inventory"."batches" USING "btree" ("store_id", "product_id", "expiry_date", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_mobile_urgency" ON "inventory"."batches" USING "btree" ("store_id", "expiry_date", "status") INCLUDE ("current_quantity", "selling_price", "cost_price") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_product_expiry" ON "inventory"."batches" USING "btree" ("product_id", "expiry_date");



CREATE INDEX "idx_batches_product_id" ON "inventory"."batches" USING "btree" ("product_id");



CREATE INDEX "idx_batches_product_store" ON "inventory"."batches" USING "btree" ("product_id", "store_id", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_scoring_factors" ON "inventory"."batches" USING "btree" ("store_id", "expiry_date", "current_quantity", "cost_price", "selling_price") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_status" ON "inventory"."batches" USING "btree" ("status");



CREATE INDEX "idx_batches_status_expiry" ON "inventory"."batches" USING "btree" ("status", "expiry_date") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_status_expiry_quantity" ON "inventory"."batches" USING "btree" ("status", "expiry_date", "current_quantity") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_store_barcode" ON "inventory"."batches" USING "btree" ("store_id", "scanned_barcode") WHERE ("scanned_barcode" IS NOT NULL);



CREATE INDEX "idx_batches_store_created" ON "inventory"."batches" USING "btree" ("store_id", "created_at" DESC) WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_store_expiry" ON "inventory"."batches" USING "btree" ("store_id", "expiry_date") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_store_expiry_active" ON "inventory"."batches" USING "btree" ("store_id", "expiry_date") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_store_expiry_status" ON "inventory"."batches" USING "btree" ("store_id", "expiry_date", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_batches_store_id_perf" ON "inventory"."batches" USING "btree" ("store_id");



CREATE INDEX "idx_batches_store_product" ON "inventory"."batches" USING "btree" ("store_id", "product_id");



CREATE INDEX "idx_batches_store_product_expiry_active" ON "inventory"."batches" USING "btree" ("store_id", "product_id", "expiry_date", "status", "current_quantity") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_store_quantity_active" ON "inventory"."batches" USING "btree" ("store_id", "current_quantity") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_store_status" ON "inventory"."batches" USING "btree" ("store_id", "status");



CREATE INDEX "idx_batches_store_status_expiry" ON "inventory"."batches" USING "btree" ("store_id", "status", "expiry_date") WHERE ("current_quantity" > (0)::numeric);



CREATE INDEX "idx_batches_store_status_quantity" ON "inventory"."batches" USING "btree" ("store_id", "status", "current_quantity") WHERE ((("status")::"text" = 'active'::"text") AND ("current_quantity" > (0)::numeric));



CREATE INDEX "idx_batches_supplier_search" ON "inventory"."batches" USING "btree" ("supplier");



CREATE INDEX "idx_batches_verification" ON "inventory"."batches" USING "btree" ("verification_status") WHERE (("verification_status")::"text" <> 'verified'::"text");



CREATE INDEX "idx_categories_code" ON "inventory"."categories" USING "btree" ("category_code");



CREATE INDEX "idx_donation_recipients_store" ON "inventory"."donation_recipients" USING "btree" ("store_id") WHERE ("is_active" = true);



CREATE INDEX "idx_product_cache_barcode" ON "inventory"."product_recognition_cache" USING "btree" ("barcode", "is_verified");



CREATE UNIQUE INDEX "idx_products_barcode" ON "inventory"."products" USING "btree" ("barcode") WHERE ("barcode" IS NOT NULL);



CREATE INDEX "idx_products_barcode_active" ON "inventory"."products" USING "btree" ("barcode") WHERE (("barcode" IS NOT NULL) AND ("barcode" <> ''::"text"));



CREATE INDEX "idx_products_brand" ON "inventory"."products" USING "btree" ("brand");



CREATE INDEX "idx_products_bulk_resolution" ON "inventory"."products" USING "btree" ("sku", "barcode") WHERE (("sku" IS NOT NULL) OR ("barcode" IS NOT NULL));



CREATE INDEX "idx_products_category_active" ON "inventory"."products" USING "btree" ("category_id", "sku") WHERE ("category_id" IS NOT NULL);



CREATE INDEX "idx_products_category_id" ON "inventory"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_created_by" ON "inventory"."products" USING "btree" ("created_by");



CREATE INDEX "idx_products_name_lower" ON "inventory"."products" USING "btree" ("lower"(TRIM(BOTH FROM "name")));



CREATE INDEX "idx_products_sku" ON "inventory"."products" USING "btree" ("sku");



CREATE INDEX "idx_store_products_added_by" ON "inventory"."store_products" USING "btree" ("added_by");



CREATE INDEX "idx_store_products_product" ON "inventory"."store_products" USING "btree" ("product_id");



CREATE INDEX "idx_store_products_product_lookup" ON "inventory"."store_products" USING "btree" ("product_id", "store_id") WHERE ("is_active" = true);



CREATE INDEX "idx_store_products_store_active" ON "inventory"."store_products" USING "btree" ("store_id", "product_id", "is_active") WHERE ("is_active" = true);



COMMENT ON INDEX "inventory"."idx_store_products_store_active" IS 'Partial index for active products lookup by store - critical for get_products_paginated RPC';



CREATE INDEX "idx_store_products_store_category" ON "inventory"."store_products" USING "btree" ("store_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_store_products_store_id" ON "inventory"."store_products" USING "btree" ("store_id");



CREATE INDEX "idx_product_scores_batch_store" ON "scoring"."product_scores" USING "btree" ("batch_id", "store_id", "calculated_at");



CREATE INDEX "idx_product_scores_days_to_expiry" ON "scoring"."product_scores" USING "btree" ("days_to_expiry");



CREATE INDEX "idx_product_scores_high_priority" ON "scoring"."product_scores" USING "btree" ("composite_score" DESC, "calculated_at" DESC) INCLUDE ("batch_id", "store_id", "recommendation", "urgency_level") WHERE ("composite_score" >= 0.6);



CREATE INDEX "idx_product_scores_recent" ON "scoring"."product_scores" USING "btree" ("calculated_at" DESC, "store_id");



CREATE INDEX "idx_product_scores_recommendations" ON "scoring"."product_scores" USING "btree" ("store_id", "recommendation", "calculated_at" DESC) INCLUDE ("batch_id", "composite_score", "urgency_level", "discount_percent") WHERE (("recommendation")::"text" = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::"text"[]));



CREATE INDEX "idx_product_scores_store_composite" ON "scoring"."product_scores" USING "btree" ("store_id", "composite_score" DESC);



CREATE INDEX "idx_product_scores_store_composite_threshold" ON "scoring"."product_scores" USING "btree" ("store_id", "composite_score") WHERE ("composite_score" >= 0.6);



CREATE UNIQUE INDEX "idx_product_scores_upsert_optimized" ON "scoring"."product_scores" USING "btree" ("batch_id") INCLUDE ("expiry_score", "velocity_score", "margin_score", "composite_score", "recommendation", "urgency_level", "discount_percent", "reason", "ml_enhanced", "confidence_level", "calculated_at", "store_id");



CREATE INDEX "idx_product_scores_urgency" ON "scoring"."product_scores" USING "btree" ("store_id", "urgency_level", "calculated_at" DESC) INCLUDE ("batch_id", "composite_score", "recommendation") WHERE ("urgency_level" = ANY (ARRAY['critical'::"text", 'high'::"text", 'medium'::"text"]));



CREATE INDEX "idx_product_scores_urgency_score" ON "scoring"."product_scores" USING "btree" ("store_id", "urgency_level", "composite_score" DESC);



CREATE INDEX "idx_product_scores_urgent_items" ON "scoring"."product_scores" USING "btree" ("store_id", "composite_score" DESC, "urgency_level") WHERE ("composite_score" >= 0.4);



CREATE INDEX "idx_scores_store_batch" ON "scoring"."product_scores" USING "btree" ("store_id", "batch_id");



CREATE INDEX "idx_factors_store_time" ON "timeseries"."external_factors" USING "btree" ("store_id", "recorded_at");



CREATE INDEX "idx_sales_batch_time" ON "timeseries"."sales_events" USING "btree" ("batch_id", "sale_timestamp");



CREATE INDEX "idx_sales_store_time" ON "timeseries"."sales_events" USING "btree" ("store_id", "sale_timestamp");



CREATE INDEX "idx_sales_timestamp" ON "timeseries"."sales_events" USING "btree" ("sale_timestamp");



CREATE INDEX "idx_snapshots_batch_time" ON "timeseries"."inventory_snapshots" USING "btree" ("batch_id", "snapshot_timestamp");



CREATE INDEX "idx_snapshots_store_time" ON "timeseries"."inventory_snapshots" USING "btree" ("store_id", "snapshot_timestamp");



CREATE INDEX "idx_user_roles_assigned_by" ON "user_mgmt"."user_roles" USING "btree" ("assigned_by");



CREATE INDEX "idx_user_roles_role_id" ON "user_mgmt"."user_roles" USING "btree" ("role_id");



CREATE OR REPLACE TRIGGER "trigger_refresh_user_permissions_on_stores" AFTER UPDATE OF "owner_id" ON "business"."stores" FOR EACH STATEMENT EXECUTE FUNCTION "business"."refresh_user_permissions"();



COMMENT ON TRIGGER "trigger_refresh_user_permissions_on_stores" ON "business"."stores" IS 'Refreshes user permissions when store ownership changes';



CREATE OR REPLACE TRIGGER "update_store_users_updated_at" BEFORE UPDATE ON "business"."store_users" FOR EACH ROW EXECUTE FUNCTION "business"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_batches_updated_at" BEFORE UPDATE ON "inventory"."batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_categories_updated_at" BEFORE UPDATE ON "inventory"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_categories_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_check_batch_expiry" BEFORE INSERT OR UPDATE ON "inventory"."batches" FOR EACH ROW EXECUTE FUNCTION "inventory"."check_batch_expiry_on_change"();



CREATE OR REPLACE TRIGGER "trigger_products_updated_at" BEFORE UPDATE ON "inventory"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_cache_updated_at" BEFORE UPDATE ON "inventory"."product_recognition_cache" FOR EACH ROW EXECUTE FUNCTION "public"."update_cache_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_product_totals" AFTER INSERT OR DELETE OR UPDATE ON "inventory"."batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_totals"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "user_mgmt"."users" FOR EACH ROW EXECUTE FUNCTION "user_mgmt"."update_updated_at_column"();



ALTER TABLE ONLY "analytics"."actions"
    ADD CONSTRAINT "actions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id");



ALTER TABLE ONLY "analytics"."actions"
    ADD CONSTRAINT "actions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "analytics"."actions"
    ADD CONSTRAINT "actions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "business"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id") ON DELETE CASCADE;



ALTER TABLE ONLY "business"."store_users"
    ADD CONSTRAINT "store_users_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "business"."store_users"
    ADD CONSTRAINT "store_users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id") ON DELETE CASCADE;



ALTER TABLE ONLY "business"."store_users"
    ADD CONSTRAINT "store_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "business"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_action_entries_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_action_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_action_entries_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id") ON DELETE CASCADE;



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_donation_recipient_id_fkey" FOREIGN KEY ("donation_recipient_id") REFERENCES "inventory"."donation_recipients"("recipient_id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "inventory"."batch_actions"
    ADD CONSTRAINT "batch_actions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batch_status_logs"
    ADD CONSTRAINT "batch_status_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "inventory"."batches"
    ADD CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."batches"
    ADD CONSTRAINT "batches_processing_batch_id_fkey" FOREIGN KEY ("processing_batch_id") REFERENCES "inventory"."ocr_processing_batches"("batch_id");



ALTER TABLE ONLY "inventory"."batches"
    ADD CONSTRAINT "batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "inventory"."batches"
    ADD CONSTRAINT "batches_store_product_fkey" FOREIGN KEY ("store_id", "product_id") REFERENCES "inventory"."store_products"("store_id", "product_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "inventory"."categories"
    ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "inventory"."categories"("category_id");



ALTER TABLE ONLY "inventory"."donation_recipients"
    ADD CONSTRAINT "donation_recipients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."donation_recipients"
    ADD CONSTRAINT "donation_recipients_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "inventory"."ocr_processing_batches"
    ADD CONSTRAINT "ocr_processing_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "inventory"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inventory"."categories"("category_id");



ALTER TABLE ONLY "inventory"."products"
    ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."store_products"
    ADD CONSTRAINT "store_products_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "inventory"."store_products"
    ADD CONSTRAINT "store_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("product_id") ON DELETE CASCADE;



ALTER TABLE ONLY "inventory"."store_products"
    ADD CONSTRAINT "store_products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id") ON DELETE CASCADE;



ALTER TABLE ONLY "inventory"."store_products"
    ADD CONSTRAINT "store_products_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "sales"."transactions"
    ADD CONSTRAINT "transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id") ON DELETE CASCADE;



ALTER TABLE ONLY "sales"."transactions"
    ADD CONSTRAINT "transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "sales"."transactions"
    ADD CONSTRAINT "transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id") ON DELETE CASCADE;



ALTER TABLE ONLY "scoring"."product_scores"
    ADD CONSTRAINT "product_scores_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id");



ALTER TABLE ONLY "scoring"."product_scores"
    ADD CONSTRAINT "product_scores_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "timeseries"."external_factors"
    ADD CONSTRAINT "external_factors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "timeseries"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id");



ALTER TABLE ONLY "timeseries"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "timeseries"."sales_events"
    ADD CONSTRAINT "sales_events_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory"."batches"("batch_id");



ALTER TABLE ONLY "timeseries"."sales_events"
    ADD CONSTRAINT "sales_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "user_mgmt"."gdpr_deletion_log"
    ADD CONSTRAINT "gdpr_deletion_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "user_mgmt"."user_preferences"
    ADD CONSTRAINT "user_preferences_primary_store_id_fkey" FOREIGN KEY ("primary_store_id") REFERENCES "business"."stores"("store_id");



ALTER TABLE ONLY "user_mgmt"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "user_mgmt"."user_roles"
    ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "user_mgmt"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "user_mgmt"."roles"("role_id") ON DELETE CASCADE;



ALTER TABLE ONLY "user_mgmt"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can access actions for their stores" ON "analytics"."actions" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



ALTER TABLE "analytics"."actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Store owners and managers can insert store settings" ON "business"."store_settings" FOR INSERT WITH CHECK (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su"."is_active" = true)))));



CREATE POLICY "Store owners and managers can update store settings" ON "business"."store_settings" FOR UPDATE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su"."is_active" = true)))));



CREATE POLICY "Store owners and managers can view store settings" ON "business"."store_settings" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can manage settings for their stores" ON "business"."store_settings" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users" "su"
  WHERE (("su"."store_id" = "store_settings"."store_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users" "su"
  WHERE (("su"."store_id" = "store_settings"."store_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[]))))));



COMMENT ON POLICY "Users can manage settings for their stores" ON "business"."store_settings" IS 'Only store owners and managers can view/modify store settings. Uses optimized auth.uid() call.';



ALTER TABLE "business"."store_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "business"."store_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_users_delete_authenticated" ON "business"."store_users" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."stores"
  WHERE (("stores"."store_id" = "store_users"."store_id") AND ("stores"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "store_users_insert_authenticated" ON "business"."store_users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."stores"
  WHERE (("stores"."store_id" = "store_users"."store_id") AND ("stores"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "store_users_select_accessible" ON "business"."store_users" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "business"."stores"
  WHERE (("stores"."store_id" = "store_users"."store_id") AND ("stores"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "store_users_update_by_store_access" ON "business"."store_users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."stores"
  WHERE (("stores"."store_id" = "store_users"."store_id") AND ("stores"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "business"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores_delete_by_owner" ON "business"."stores" FOR DELETE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "stores_insert_by_owner" ON "business"."stores" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "stores_select_accessible" ON "business"."stores" FOR SELECT USING (("store_id" = ANY (ARRAY( SELECT "business"."get_user_stores_fast"() AS "get_user_stores_fast"))));



CREATE POLICY "stores_update_by_owner" ON "business"."stores" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Products are readable by authenticated users" ON "inventory"."products" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Service role can manage OCR batches" ON "inventory"."ocr_processing_batches" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Store managers can remove products from stores" ON "inventory"."store_products" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "store_products"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("store_users"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Store users can add products to their stores" ON "inventory"."store_products" FOR INSERT WITH CHECK (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "Store users can update products in their stores" ON "inventory"."store_products" FOR UPDATE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can access donation recipients for their stores" ON "inventory"."donation_recipients" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can create OCR batches for their stores" ON "inventory"."ocr_processing_batches" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "ocr_processing_batches"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can create donation recipients for their stores" ON "inventory"."donation_recipients" FOR INSERT WITH CHECK (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = "auth"."uid"()) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can create products" ON "inventory"."products" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can delete donation recipients for their stores" ON "inventory"."donation_recipients" FOR DELETE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = "auth"."uid"()) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can insert product cache entries" ON "inventory"."product_recognition_cache" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can update OCR batches for their stores" ON "inventory"."ocr_processing_batches" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "ocr_processing_batches"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can update donation recipients for their stores" ON "inventory"."donation_recipients" FOR UPDATE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = "auth"."uid"()) AND ("su"."is_active" = true))))) WITH CHECK (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = "auth"."uid"()) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can update products with permissions" ON "inventory"."products" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("business"."store_users" "su"
     JOIN "inventory"."store_products" "sp" ON (("sp"."store_id" = "su"."store_id")))
  WHERE (("sp"."product_id" = "products"."product_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "Users can view batch status logs" ON "inventory"."batch_status_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[]))))));



CREATE POLICY "Users can view store products for accessible stores" ON "inventory"."store_products" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "batch_action_entries_delete_policy" ON "inventory"."batch_actions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("inventory"."batches" "b"
     JOIN "business"."store_users" "su" ON (("su"."store_id" = "b"."store_id")))
  WHERE (("b"."batch_id" = "batch_actions"."batch_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su"."is_active" = true)))));



CREATE POLICY "batch_action_entries_insert_policy" ON "inventory"."batch_actions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("inventory"."batches" "b"
     JOIN "business"."store_users" "su" ON (("su"."store_id" = "b"."store_id")))
  WHERE (("b"."batch_id" = "batch_actions"."batch_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "batch_action_entries_select_policy" ON "inventory"."batch_actions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("inventory"."batches" "b"
     JOIN "business"."store_users" "su" ON (("su"."store_id" = "b"."store_id")))
  WHERE (("b"."batch_id" = "batch_actions"."batch_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "batch_action_entries_update_policy" ON "inventory"."batch_actions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("inventory"."batches" "b"
     JOIN "business"."store_users" "su" ON (("su"."store_id" = "b"."store_id")))
  WHERE (("b"."batch_id" = "batch_actions"."batch_id") AND ("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



ALTER TABLE "inventory"."batch_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventory"."batch_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventory"."batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batches_delete_policy" ON "inventory"."batches" FOR DELETE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[]))))));



CREATE POLICY "batches_insert_policy" ON "inventory"."batches" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "batches"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



CREATE POLICY "batches_select_policy" ON "inventory"."batches" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



CREATE POLICY "batches_update_policy" ON "inventory"."batches" FOR UPDATE USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true) AND (("su"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'staff'::character varying])::"text"[]))))));



ALTER TABLE "inventory"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_policy" ON "inventory"."categories" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "categories_insert_policy" ON "inventory"."categories" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "categories_read_policy" ON "inventory"."categories" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "categories_update_policy" ON "inventory"."categories" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "inventory"."donation_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ocr_batches_store_access" ON "inventory"."ocr_processing_batches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "ocr_processing_batches"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



ALTER TABLE "inventory"."ocr_processing_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_cache_read_all" ON "inventory"."product_recognition_cache" FOR SELECT USING (true);



CREATE POLICY "product_cache_update_auth" ON "inventory"."product_recognition_cache" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "inventory"."product_recognition_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventory"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "inventory"."store_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Only privileged users can delete transactions" ON "sales"."transactions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "transactions"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("store_users"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can insert transactions for their stores" ON "sales"."transactions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "transactions"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can update transactions for their stores" ON "sales"."transactions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "transactions"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can view transactions from their stores" ON "sales"."transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."store_id" = "transactions"."store_id") AND ("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("store_users"."is_active" = true)))));



ALTER TABLE "sales"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can access product scores for their stores" ON "scoring"."product_scores" FOR SELECT USING (("store_id" IN ( SELECT "su"."store_id"
   FROM "business"."store_users" "su"
  WHERE (("su"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su"."is_active" = true)))));



ALTER TABLE "scoring"."category_weights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_weights_admin_all" ON "scoring"."category_weights" TO "service_role" USING (true);



CREATE POLICY "category_weights_read_all" ON "scoring"."category_weights" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "scoring"."product_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authorized users can insert sales events" ON "timeseries"."sales_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = "auth"."uid"()) AND ("store_users"."store_id" = "sales_events"."store_id") AND ("store_users"."is_active" = true) AND ((("store_users"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) OR ((("store_users"."permissions" ->> 'can_scan_out'::"text"))::boolean = true))))));



CREATE POLICY "Service role can insert external factors" ON "timeseries"."external_factors" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can insert inventory snapshots" ON "timeseries"."inventory_snapshots" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can insert sales events" ON "timeseries"."sales_events" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Users can view external factors for their stores" ON "timeseries"."external_factors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = "auth"."uid"()) AND ("store_users"."store_id" = "external_factors"."store_id") AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can view inventory snapshots for their stores" ON "timeseries"."inventory_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = "auth"."uid"()) AND ("store_users"."store_id" = "inventory_snapshots"."store_id") AND ("store_users"."is_active" = true)))));



CREATE POLICY "Users can view sales events for their stores" ON "timeseries"."sales_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = "auth"."uid"()) AND ("store_users"."store_id" = "sales_events"."store_id") AND ("store_users"."is_active" = true)))));



ALTER TABLE "timeseries"."external_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "timeseries"."inventory_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "timeseries"."sales_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Only store owners can view GDPR deletion logs" ON "user_mgmt"."gdpr_deletion_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("store_users"."role_in_store")::"text" = 'owner'::"text") AND ("store_users"."is_active" = true)))));



CREATE POLICY "Store managers can assign roles" ON "user_mgmt"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("business"."store_users" "su1"
     JOIN "business"."store_users" "su2" ON (("su1"."store_id" = "su2"."store_id")))
  WHERE (("su1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su2"."user_id" = "user_roles"."user_id") AND (("su1"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su1"."is_active" = true)))));



CREATE POLICY "Store managers can create employee accounts" ON "user_mgmt"."users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "business"."store_users"
  WHERE (("store_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("store_users"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("store_users"."is_active" = true)))));



CREATE POLICY "Store managers can update employee profiles" ON "user_mgmt"."users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("business"."store_users" "su1"
     JOIN "business"."store_users" "su2" ON (("su1"."store_id" = "su2"."store_id")))
  WHERE (("su1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su2"."user_id" = "users"."user_id") AND (("su1"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su1"."is_active" = true)))));



CREATE POLICY "Store managers can update user roles" ON "user_mgmt"."user_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("business"."store_users" "su1"
     JOIN "business"."store_users" "su2" ON (("su1"."store_id" = "su2"."store_id")))
  WHERE (("su1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su2"."user_id" = "user_roles"."user_id") AND (("su1"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su1"."is_active" = true)))));



CREATE POLICY "Store managers can view employee profiles" ON "user_mgmt"."users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("business"."store_users" "su1"
     JOIN "business"."store_users" "su2" ON (("su1"."store_id" = "su2"."store_id")))
  WHERE (("su1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("su2"."user_id" = "users"."user_id") AND (("su1"."role_in_store")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::"text"[])) AND ("su1"."is_active" = true)))));



CREATE POLICY "Users can insert own preferences" ON "user_mgmt"."user_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own preferences" ON "user_mgmt"."user_preferences" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own profile" ON "user_mgmt"."users" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own preferences" ON "user_mgmt"."user_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own profile" ON "user_mgmt"."users" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "user_mgmt"."gdpr_deletion_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "user_mgmt"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_read_all" ON "user_mgmt"."roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "user_mgmt"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "user_mgmt"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select_own" ON "user_mgmt"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "user_mgmt"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "analytics" TO "anon";
GRANT USAGE ON SCHEMA "analytics" TO "authenticated";
GRANT USAGE ON SCHEMA "analytics" TO "service_role";



GRANT USAGE ON SCHEMA "business" TO "anon";
GRANT USAGE ON SCHEMA "business" TO "authenticated";
GRANT USAGE ON SCHEMA "business" TO "service_role";






GRANT USAGE ON SCHEMA "inventory" TO "anon";
GRANT USAGE ON SCHEMA "inventory" TO "authenticated";
GRANT USAGE ON SCHEMA "inventory" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "sales" TO "service_role";



GRANT USAGE ON SCHEMA "scoring" TO "anon";
GRANT USAGE ON SCHEMA "scoring" TO "authenticated";
GRANT USAGE ON SCHEMA "scoring" TO "service_role";



GRANT USAGE ON SCHEMA "timeseries" TO "anon";
GRANT USAGE ON SCHEMA "timeseries" TO "authenticated";
GRANT USAGE ON SCHEMA "timeseries" TO "service_role";



GRANT USAGE ON SCHEMA "user_mgmt" TO "anon";
GRANT USAGE ON SCHEMA "user_mgmt" TO "authenticated";
GRANT USAGE ON SCHEMA "user_mgmt" TO "service_role";












GRANT SELECT ON TABLE "business"."stores" TO "anon";
GRANT SELECT ON TABLE "business"."stores" TO "authenticated";
GRANT ALL ON TABLE "business"."stores" TO "service_role";



GRANT ALL ON FUNCTION "business"."create_store_for_user"("p_store_name" "text", "p_store_code" "text", "p_store_type" "text", "p_address" "text", "p_city" "text", "p_postal_code" "text", "p_country" "text", "p_business_name" "text", "p_phone" "text", "p_size_category" "text", "p_timezone" "text") TO "service_role";
GRANT ALL ON FUNCTION "business"."create_store_for_user"("p_store_name" "text", "p_store_code" "text", "p_store_type" "text", "p_address" "text", "p_city" "text", "p_postal_code" "text", "p_country" "text", "p_business_name" "text", "p_phone" "text", "p_size_category" "text", "p_timezone" "text") TO "authenticated";



GRANT ALL ON FUNCTION "business"."deactivate_store_safe"("p_store_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "business"."deactivate_store_safe"("p_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "business"."delete_store_and_data"("target_store_id" "uuid", "deletion_reason" "text", "performed_by_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "business"."delete_store_and_data"("target_store_id" "uuid", "deletion_reason" "text", "performed_by_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "business"."get_store_types"() TO "service_role";
GRANT ALL ON FUNCTION "business"."get_store_types"() TO "anon";
GRANT ALL ON FUNCTION "business"."get_store_types"() TO "authenticated";



GRANT ALL ON FUNCTION "business"."get_user_accessible_store_ids"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "business"."get_user_stores_fast"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "business"."refresh_user_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "business"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" "text", "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" "text", "input_pin_permissions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "business"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "business"."user_can_manage_store_users"("target_store_id" "uuid", "target_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "business"."user_can_manage_store_users"("target_store_id" "uuid", "target_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "business"."user_can_manage_store_users_v2"("target_store_id" "uuid", "target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "business"."user_has_store_access"("store_uuid" "uuid") TO "service_role";


































































































































































































































































GRANT ALL ON FUNCTION "inventory"."auto_expire_batches"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."auto_expire_batches"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."auto_expire_batches"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."batch_update_quantities"("items" "jsonb") TO "service_role";



GRANT ALL ON TABLE "inventory"."batches" TO "anon";
GRANT ALL ON TABLE "inventory"."batches" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batches" TO "service_role";



GRANT ALL ON FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") TO "anon";
GRANT ALL ON FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."calculate_batch_score_manual"("batch_row" "inventory"."batches") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."check_batch_expiry_on_change"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."check_batch_expiry_on_change"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."check_batch_expiry_on_change"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."daily_batch_expiry_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."daily_batch_expiry_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."daily_batch_expiry_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_action_statistics"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_available_batches_by_product"("p_product_id" "uuid", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_batch_action_breakdown"("p_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_search" "text", "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_search" "text", "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_search" "text", "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_categories_for_dropdown"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_categories_for_dropdown"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_categories_for_dropdown"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_category_info"("category_text" "text", "category_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_category_info"("category_text" "text", "category_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_category_info"("category_text" "text", "category_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_donation_recipients"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_expiry_job_status"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_expiry_job_status"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_expiry_job_status"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_search" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_search" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_search" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_recent_actions"("p_store_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_urgent_todos_count"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."get_user_stores"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."get_user_stores"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."get_user_stores"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."has_batches"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."has_batches"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."has_batches"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."manual_expire_batch"("batch_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."map_legacy_category"("legacy_category" "text") TO "anon";
GRANT ALL ON FUNCTION "inventory"."map_legacy_category"("legacy_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."map_legacy_category"("legacy_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."record_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."resolve_category_from_off_data"("off_categories" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "inventory"."resolve_category_from_off_data"("off_categories" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."resolve_category_from_off_data"("off_categories" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "inventory"."trigger_manual_expiry_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."trigger_manual_expiry_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."trigger_manual_expiry_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."trigger_todo_states_refresh"() TO "anon";
GRANT ALL ON FUNCTION "inventory"."trigger_todo_states_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."trigger_todo_states_refresh"() TO "service_role";



GRANT ALL ON FUNCTION "inventory"."user_can_access_store"("store_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."user_can_access_store"("store_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."user_can_access_store"("store_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."user_can_manage_store"("store_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "inventory"."user_can_manage_store"("store_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."user_can_manage_store"("store_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "inventory"."validate_batch_actions"("p_batch_id" "uuid", "p_actions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_existing_user_to_store"("input_store_id" "uuid", "input_user_email" "text", "input_role" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_product_to_store_safely"("p_store_id" "uuid", "p_product_id" "uuid", "p_cost_price" numeric, "p_selling_price" numeric, "p_store_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_product_to_store_safely"("p_store_id" "uuid", "p_product_id" "uuid", "p_cost_price" numeric, "p_selling_price" numeric, "p_store_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_product_to_store_safely"("p_store_id" "uuid", "p_product_id" "uuid", "p_cost_price" numeric, "p_selling_price" numeric, "p_store_sku" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_add_test_user"("input_store_id" "uuid", "input_email" "text", "input_full_name" "text", "input_role" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_add_test_user"("input_store_id" "uuid", "input_email" "text", "input_full_name" "text", "input_role" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_add_test_user"("input_store_id" "uuid", "input_email" "text", "input_full_name" "text", "input_role" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_function_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_function_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_function_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_quantities"("p_items" "jsonb", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_csv_import"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_csv_import"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_csv_import"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches_with_store_link"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches_with_store_link"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_insert_csv_batches_with_store_link"("p_store_id" "uuid", "p_created_by" "uuid", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_bulk_duplicates"("p_barcodes" "text"[], "p_expiry_dates" "date"[], "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_bulk_duplicates"("p_barcodes" "text"[], "p_expiry_dates" "date"[], "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_bulk_duplicates"("p_barcodes" "text"[], "p_expiry_dates" "date"[], "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_existing_store_products"("pairs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."check_existing_store_products"("pairs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_existing_store_products"("pairs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_pin_lock_status"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_pin_lock_status"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_pin_lock_status"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_security_warnings"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_security_warnings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_security_warnings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_store_access"("user_id_param" "uuid", "store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_store_access"("user_id_param" "uuid", "store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_store_access"("user_id_param" "uuid", "store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_exists_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_exists_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_exists_by_email"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_username_availability"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_username_availability"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_availability"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_availability"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_backup_table"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_backup_table"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_backup_table"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_duplicate_batches"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_duplicate_batches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_duplicate_batches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_employee_with_pin"("p_email" "text", "p_full_name" "text", "p_username" "text", "p_pin" "text", "p_store_id" "uuid", "p_role" "text", "p_language_preference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_preferences_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_preferences_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_preferences_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_next_duplicate_batch"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_next_duplicate_batch"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_next_duplicate_batch"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."disable_batch_automation"() TO "anon";
GRANT ALL ON FUNCTION "public"."disable_batch_automation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."disable_batch_automation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enable_batch_automation"() TO "anon";
GRANT ALL ON FUNCTION "public"."enable_batch_automation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enable_batch_automation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_bulk_action"("p_batch_ids" "uuid"[], "p_action_type" "text", "p_action_params" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_bulk_action"("p_batch_ids" "uuid"[], "p_action_type" "text", "p_action_params" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_bulk_action"("p_batch_ids" "uuid"[], "p_action_type" "text", "p_action_params" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_discount_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_discount_percentage" numeric, "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_dismiss_action"("p_batch_id" "uuid", "p_dismissal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_dismiss_action"("p_batch_id" "uuid", "p_dismissal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_dismiss_action"("p_batch_id" "uuid", "p_dismissal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_dispose_action"("p_batch_id" "uuid", "p_quantity_disposed" numeric, "p_disposal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_dispose_action"("p_batch_id" "uuid", "p_quantity_disposed" numeric, "p_disposal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_dispose_action"("p_batch_id" "uuid", "p_quantity_disposed" numeric, "p_disposal_reason" "text", "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_donate_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_donation_recipient_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_donate_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_donation_recipient_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_donate_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_donation_recipient_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_donate_prepared_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_donate_prepared_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_donate_prepared_action"("p_batch_id" "uuid", "p_quantity_affected" numeric, "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_ignore_action"("p_batch_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_ignore_action"("p_batch_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_ignore_action"("p_batch_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_sold_action"("p_batch_id" "uuid", "p_quantity_sold" numeric, "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sold_action"("p_batch_id" "uuid", "p_quantity_sold" numeric, "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sold_action"("p_batch_id" "uuid", "p_quantity_sold" numeric, "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fast_csv_import_skip_duplicates"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fast_csv_import_skip_duplicates"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fast_csv_import_skip_duplicates"("p_store_id" "uuid", "p_user_id" "uuid", "p_csv_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_available_batches_by_barcode"("barcode_param" "text", "store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_duplicate_batches_bulk"("p_store_id" "uuid", "p_sku_expiry_pairs" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_duplicate_batches_bulk"("p_store_id" "uuid", "p_sku_expiry_pairs" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_duplicate_batches_bulk"("p_store_id" "uuid", "p_sku_expiry_pairs" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_duplicate_batch_numbers"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_duplicate_batch_numbers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_duplicate_batch_numbers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_action_history_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_action_history_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_action_history_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_actionable_batches"("input_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_actionable_batches"("input_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_actionable_batches"("input_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_actionable_batches"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_actionable_batches"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_actionable_batches"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_active_with_states"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_active_with_states"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_active_with_states"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_automation_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_automation_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_automation_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text", "p_date_from" timestamp without time zone, "p_date_to" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text", "p_date_from" timestamp without time zone, "p_date_to" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_actions_with_details"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_action_type" "text", "p_date_from" timestamp without time zone, "p_date_to" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todo_by_id"("target_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_rows" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_rows" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_rows" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("target_store_id" "uuid", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid", "p_todo_state" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid", "p_todo_state" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todo_states"("p_store_id" "uuid", "p_todo_state" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todo_summary"("target_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_todos_by_state"("target_store_id" "uuid", "filter_todo_state" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batches_page"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_filters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batches_paginated"("p_store_id" "uuid", "p_page" integer, "p_page_size" integer, "p_product_id" "uuid", "p_status" character varying, "p_location_code" character varying, "p_supplier" character varying, "p_has_stock" boolean, "p_expiring_in_days" integer, "p_expiry_date_from" "date", "p_expiry_date_to" "date", "p_received_date_from" "date", "p_received_date_to" "date", "p_sort_field" character varying, "p_sort_direction" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_csv_upload_stats"("p_store_id" "uuid", "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_kpis"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_kpis"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_kpis"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_with_pin_auth"("p_user_id" "uuid", "p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_with_pin_auth"("p_user_id" "uuid", "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_with_pin_auth"("p_user_id" "uuid", "p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary_json"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_donated_items"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_donated_items"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_donated_items"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer, "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enum_values"("enum_name" "text", "schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enum_values"("enum_name" "text", "schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enum_values"("enum_name" "text", "schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_items_needing_reeval"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_items_needing_reeval"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_items_needing_reeval"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_kpi_comparison"("p_store_id" "uuid", "p_current_start" "date", "p_current_end" "date", "p_compare_start" "date", "p_compare_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_low_stock_batches"("p_store_id" "uuid", "p_threshold_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_actions"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_paginated"("p_store_id" "uuid", "p_category_code" "text", "p_brand" "text", "p_sort_field" "text", "p_sort_direction" "text", "p_page_size" integer, "p_page_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recently_discounted"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recently_expired_enhanced"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_alerts_optimized"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_alerts_optimized"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_alerts_optimized"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_analytics_overview"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_threshold" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_category_analytics"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_category_analytics"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_category_analytics"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_insights"("target_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_insights"("target_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_insights"("target_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_settings"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_settings"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_settings"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_settings_complete"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_thresholds"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_users"("input_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_users"("input_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_users"("input_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer, "page_size" integer, "role_filter" character varying, "pin_auth_filter" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer, "page_size" integer, "role_filter" character varying, "pin_auth_filter" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_users_paginated"("input_store_id" "uuid", "page_number" integer, "page_size" integer, "role_filter" character varying, "pin_auth_filter" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_waste_analytics"("p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stores_with_batch_counts"("store_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todos_counts_with_filters"("p_store_id" "uuid", "p_filters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todos_dashboard"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_todos_dashboard"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todos_dashboard"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todos_dashboard_overview"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todos_summary"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todos_with_filters"("p_store_id" "uuid", "p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_urgent_todos_count"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_preferences_fast"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_preferences_fast"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_preferences_fast"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_store_role"("p_user_id" "uuid", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stores_with_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stores_with_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stores_with_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_batches"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_batches"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_batches"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text", "p_permissions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text", "p_permissions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_user_to_store"("p_user_email" "text", "p_store_id" "uuid", "p_role_in_store" "text", "p_permissions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_product_with_cache"("barcode_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."override_batch_status"("p_batch_id" "uuid", "p_new_status" character varying, "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."override_batch_status"("p_batch_id" "uuid", "p_new_status" character varying, "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."override_batch_status"("p_batch_id" "uuid", "p_new_status" character varying, "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_user_from_store"("p_store_id" "uuid", "p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_user_from_store"("p_store_id" "uuid", "p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_pin_attempts"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_pin_attempts"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_pin_attempts"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_bulk_products"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_bulk_products_simple"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_bulk_products_simple"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_bulk_products_simple"("p_skus" "text"[], "p_barcodes" "text"[], "p_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_products_with_stock"("search_query" "text", "store_id_param" "uuid", "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products_with_stock"("search_query" "text", "store_id_param" "uuid", "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products_with_stock"("search_query" "text", "store_id_param" "uuid", "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."security_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."security_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."security_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_french_language"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_french_language"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_french_language"() TO "service_role";



GRANT ALL ON FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."simple_update_store_user_test"("input_store_id" "uuid", "input_user_id" "uuid", "input_can_use_pin_auth" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_business_schema_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_business_schema_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_business_schema_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_csv_performance"("p_store_id" "uuid", "p_item_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."test_csv_performance"("p_store_id" "uuid", "p_item_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_csv_performance"("p_store_id" "uuid", "p_item_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_batch_automation"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_batch_automation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_batch_automation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_batch_quantity"("batch_id_param" "uuid", "quantity_to_remove" numeric, "reason_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_batch_quantity"("batch_id_param" "uuid", "quantity_to_remove" numeric, "reason_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_batch_quantity"("batch_id_param" "uuid", "quantity_to_remove" numeric, "reason_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cache_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cache_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cache_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expired_batch_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expired_batch_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expired_batch_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric, "p_scoring_weights" "jsonb", "p_currency" character varying, "p_opening_hours" "jsonb", "p_peak_hours" "jsonb", "p_weather_location_lat" numeric, "p_weather_location_lon" numeric, "p_notification_preferences" "jsonb", "p_display_preferences" "jsonb", "p_backup_preferences" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric, "p_scoring_weights" "jsonb", "p_currency" character varying, "p_opening_hours" "jsonb", "p_peak_hours" "jsonb", "p_weather_location_lat" numeric, "p_weather_location_lon" numeric, "p_notification_preferences" "jsonb", "p_display_preferences" "jsonb", "p_backup_preferences" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_advanced_settings"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric, "p_scoring_weights" "jsonb", "p_currency" character varying, "p_opening_hours" "jsonb", "p_peak_hours" "jsonb", "p_weather_location_lat" numeric, "p_weather_location_lon" numeric, "p_notification_preferences" "jsonb", "p_display_preferences" "jsonb", "p_backup_preferences" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_store_settings"("store_id_param" "uuid", "store_name_param" character varying, "business_name_param" character varying, "store_code_param" character varying, "store_type_param" character varying, "size_category_param" character varying, "address_param" "text", "city_param" character varying, "postal_code_param" character varying, "country_param" character varying, "phone_param" character varying, "email_param" character varying, "website_url_param" character varying, "description_param" "text", "default_markup_percent_param" numeric, "waste_reduction_target_percent_param" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_settings"("store_id_param" "uuid", "store_name_param" character varying, "business_name_param" character varying, "store_code_param" character varying, "store_type_param" character varying, "size_category_param" character varying, "address_param" "text", "city_param" character varying, "postal_code_param" character varying, "country_param" character varying, "phone_param" character varying, "email_param" character varying, "website_url_param" character varying, "description_param" "text", "default_markup_percent_param" numeric, "waste_reduction_target_percent_param" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_settings"("store_id_param" "uuid", "store_name_param" character varying, "business_name_param" character varying, "store_code_param" character varying, "store_type_param" character varying, "size_category_param" character varying, "address_param" "text", "city_param" character varying, "postal_code_param" character varying, "country_param" character varying, "phone_param" character varying, "email_param" character varying, "website_url_param" character varying, "description_param" "text", "default_markup_percent_param" numeric, "waste_reduction_target_percent_param" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_thresholds"("p_store_id" "uuid", "p_critical_threshold" numeric, "p_warning_threshold" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying, "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" character varying, "input_pin_permissions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying, "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" character varying, "input_pin_permissions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_user_safe"("input_store_id" "uuid", "input_user_id" "uuid", "input_role_in_store" character varying, "input_permissions" "jsonb", "input_is_active" boolean, "input_can_use_pin_auth" boolean, "input_pin_access_level" character varying, "input_pin_permissions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_email"("target_user_id" "uuid", "new_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_email"("target_user_id" "uuid", "new_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_email"("target_user_id" "uuid", "new_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_language_preference"("target_user_id" "uuid", "new_language_preference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_language_preference"("target_user_id" "uuid", "new_language_preference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_language_preference"("target_user_id" "uuid", "new_language_preference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_metadata"("target_user_id" "uuid", "metadata_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_metadata"("target_user_id" "uuid", "metadata_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_metadata"("target_user_id" "uuid", "metadata_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_phone"("target_user_id" "uuid", "new_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_phone"("target_user_id" "uuid", "new_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_phone"("target_user_id" "uuid", "new_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_pin"("p_username" "text", "p_old_pin" "text", "p_new_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_pin_access"("target_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_pin_access"("target_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_pin_access"("target_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_store_access"("target_store_id" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_store_access"("target_store_id" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_store_access"("target_store_id" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pin_login"("p_username" "text", "p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "sales"."user_has_store_access"("target_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"() TO "anon";
GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"() TO "authenticated";
GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"() TO "service_role";



GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"("p_store_id" "uuid", "p_expiration_date" "date", "p_category_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"("p_store_id" "uuid", "p_expiration_date" "date", "p_category_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "scoring"."calculate_batch_score"("p_store_id" "uuid", "p_expiration_date" "date", "p_category_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "scoring"."recalculate_store_scores"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."ensure_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."ensure_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."ensure_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text", "performed_by_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text", "performed_by_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user"("target_user_id" "uuid", "deletion_type" "text", "performed_by_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean, "deletion_type" "text", "performed_by_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean, "deletion_type" "text", "performed_by_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."gdpr_delete_user_and_stores"("target_user_id" "uuid", "delete_owned_stores" boolean, "deletion_type" "text", "performed_by_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences_v2"() TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."get_current_user_preferences_v2"() TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."get_user_roles"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."get_user_roles"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."get_user_roles"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."has_role"("role_name" "text", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."has_role"("role_name" "text", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."has_role"("role_name" "text", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."has_role_cached"("role_name" "text", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."request_account_deletion"("deletion_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."update_pin_delivery_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."update_primary_store"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."user_can_access_store"("store_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "user_mgmt"."user_is_store_manager"("store_uuid" "uuid") TO "service_role";












GRANT SELECT ON TABLE "analytics"."actions" TO "anon";
GRANT SELECT,INSERT ON TABLE "analytics"."actions" TO "authenticated";
GRANT ALL ON TABLE "analytics"."actions" TO "service_role";



GRANT SELECT ON TABLE "timeseries"."inventory_snapshots" TO "anon";
GRANT SELECT ON TABLE "timeseries"."inventory_snapshots" TO "authenticated";
GRANT ALL ON TABLE "timeseries"."inventory_snapshots" TO "service_role";



GRANT ALL ON TABLE "analytics"."daily_inventory_summary" TO "service_role";



GRANT SELECT ON TABLE "timeseries"."sales_events" TO "anon";
GRANT SELECT ON TABLE "timeseries"."sales_events" TO "authenticated";
GRANT ALL ON TABLE "timeseries"."sales_events" TO "service_role";



GRANT ALL ON TABLE "analytics"."daily_sales_summary" TO "service_role";



GRANT SELECT ON TABLE "business"."store_settings" TO "anon";
GRANT SELECT ON TABLE "business"."store_settings" TO "authenticated";
GRANT ALL ON TABLE "business"."store_settings" TO "service_role";



GRANT SELECT ON TABLE "business"."store_type_reference" TO "anon";
GRANT SELECT ON TABLE "business"."store_type_reference" TO "authenticated";
GRANT ALL ON TABLE "business"."store_type_reference" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "business"."store_users" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "business"."store_users" TO "authenticated";
GRANT ALL ON TABLE "business"."store_users" TO "service_role";



GRANT SELECT ON TABLE "business"."user_store_permissions" TO "anon";
GRANT SELECT ON TABLE "business"."user_store_permissions" TO "authenticated";
GRANT ALL ON TABLE "business"."user_store_permissions" TO "service_role";















GRANT ALL ON TABLE "inventory"."products" TO "anon";
GRANT ALL ON TABLE "inventory"."products" TO "authenticated";
GRANT ALL ON TABLE "inventory"."products" TO "service_role";



GRANT ALL ON TABLE "inventory"."automation_preview" TO "anon";
GRANT ALL ON TABLE "inventory"."automation_preview" TO "authenticated";
GRANT ALL ON TABLE "inventory"."automation_preview" TO "service_role";



GRANT ALL ON TABLE "inventory"."barcode_scan_summary" TO "anon";
GRANT ALL ON TABLE "inventory"."barcode_scan_summary" TO "authenticated";
GRANT ALL ON TABLE "inventory"."barcode_scan_summary" TO "service_role";



GRANT ALL ON TABLE "inventory"."batch_actions" TO "anon";
GRANT ALL ON TABLE "inventory"."batch_actions" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batch_actions" TO "service_role";



GRANT ALL ON TABLE "inventory"."categories" TO "anon";
GRANT ALL ON TABLE "inventory"."categories" TO "authenticated";
GRANT ALL ON TABLE "inventory"."categories" TO "service_role";



GRANT ALL ON TABLE "inventory"."batch_expiry_status" TO "anon";
GRANT ALL ON TABLE "inventory"."batch_expiry_status" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batch_expiry_status" TO "service_role";



GRANT ALL ON TABLE "inventory"."batch_status" TO "anon";
GRANT ALL ON TABLE "inventory"."batch_status" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batch_status" TO "service_role";



GRANT ALL ON TABLE "inventory"."batch_status_logs" TO "anon";
GRANT ALL ON TABLE "inventory"."batch_status_logs" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batch_status_logs" TO "service_role";



GRANT ALL ON TABLE "scoring"."product_scores" TO "anon";
GRANT ALL ON TABLE "scoring"."product_scores" TO "authenticated";
GRANT ALL ON TABLE "scoring"."product_scores" TO "service_role";



GRANT ALL ON TABLE "inventory"."batch_todo_states" TO "anon";
GRANT ALL ON TABLE "inventory"."batch_todo_states" TO "authenticated";
GRANT ALL ON TABLE "inventory"."batch_todo_states" TO "service_role";



GRANT ALL ON TABLE "inventory"."donation_recipients" TO "anon";
GRANT ALL ON TABLE "inventory"."donation_recipients" TO "authenticated";
GRANT ALL ON TABLE "inventory"."donation_recipients" TO "service_role";



GRANT ALL ON TABLE "inventory"."expiring_products" TO "anon";
GRANT ALL ON TABLE "inventory"."expiring_products" TO "authenticated";
GRANT ALL ON TABLE "inventory"."expiring_products" TO "service_role";



GRANT ALL ON TABLE "inventory"."store_products" TO "anon";
GRANT ALL ON TABLE "inventory"."store_products" TO "authenticated";
GRANT ALL ON TABLE "inventory"."store_products" TO "service_role";



GRANT ALL ON TABLE "inventory"."my_store_products" TO "anon";
GRANT ALL ON TABLE "inventory"."my_store_products" TO "authenticated";
GRANT ALL ON TABLE "inventory"."my_store_products" TO "service_role";



GRANT ALL ON TABLE "inventory"."ocr_processing_batches" TO "anon";
GRANT ALL ON TABLE "inventory"."ocr_processing_batches" TO "authenticated";
GRANT ALL ON TABLE "inventory"."ocr_processing_batches" TO "service_role";



GRANT ALL ON TABLE "inventory"."product_recognition_cache" TO "anon";
GRANT ALL ON TABLE "inventory"."product_recognition_cache" TO "authenticated";
GRANT ALL ON TABLE "inventory"."product_recognition_cache" TO "service_role";



GRANT ALL ON TABLE "inventory"."products_needing_barcodes" TO "anon";
GRANT ALL ON TABLE "inventory"."products_needing_barcodes" TO "authenticated";
GRANT ALL ON TABLE "inventory"."products_needing_barcodes" TO "service_role";



GRANT ALL ON TABLE "inventory"."products_with_categories" TO "anon";
GRANT ALL ON TABLE "inventory"."products_with_categories" TO "authenticated";
GRANT ALL ON TABLE "inventory"."products_with_categories" TO "service_role";



GRANT ALL ON TABLE "inventory"."sales_summary" TO "anon";
GRANT ALL ON TABLE "inventory"."sales_summary" TO "authenticated";
GRANT ALL ON TABLE "inventory"."sales_summary" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_view_for_scoring" TO "anon";
GRANT ALL ON TABLE "public"."inventory_view_for_scoring" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_view_for_scoring" TO "service_role";



GRANT ALL ON TABLE "public"."temp_batch_actions_staging" TO "anon";
GRANT ALL ON TABLE "public"."temp_batch_actions_staging" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_batch_actions_staging" TO "service_role";



GRANT ALL ON TABLE "public"."temp_scores_staging" TO "anon";
GRANT ALL ON TABLE "public"."temp_scores_staging" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_scores_staging" TO "service_role";



GRANT SELECT ON TABLE "sales"."transactions" TO "service_role";



GRANT ALL ON TABLE "scoring"."category_weights" TO "anon";
GRANT ALL ON TABLE "scoring"."category_weights" TO "authenticated";
GRANT ALL ON TABLE "scoring"."category_weights" TO "service_role";



GRANT SELECT ON TABLE "timeseries"."external_factors" TO "anon";
GRANT SELECT ON TABLE "timeseries"."external_factors" TO "authenticated";
GRANT ALL ON TABLE "timeseries"."external_factors" TO "service_role";



GRANT ALL ON TABLE "user_mgmt"."gdpr_deletion_log" TO "anon";
GRANT ALL ON TABLE "user_mgmt"."gdpr_deletion_log" TO "authenticated";
GRANT ALL ON TABLE "user_mgmt"."gdpr_deletion_log" TO "service_role";



GRANT ALL ON TABLE "user_mgmt"."roles" TO "anon";
GRANT ALL ON TABLE "user_mgmt"."roles" TO "authenticated";
GRANT ALL ON TABLE "user_mgmt"."roles" TO "service_role";



GRANT ALL ON TABLE "user_mgmt"."user_preferences" TO "anon";
GRANT ALL ON TABLE "user_mgmt"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "user_mgmt"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "user_mgmt"."user_roles" TO "anon";
GRANT ALL ON TABLE "user_mgmt"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "user_mgmt"."user_roles" TO "service_role";



GRANT ALL ON TABLE "user_mgmt"."users" TO "anon";
GRANT ALL ON TABLE "user_mgmt"."users" TO "authenticated";
GRANT ALL ON TABLE "user_mgmt"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT SELECT ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "business" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "business" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "business" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "business" GRANT SELECT ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "business" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "inventory" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "sales" GRANT SELECT ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "scoring" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "timeseries" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "timeseries" GRANT SELECT ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "timeseries" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "user_mgmt" GRANT ALL ON TABLES TO "service_role";



























RESET ALL;
