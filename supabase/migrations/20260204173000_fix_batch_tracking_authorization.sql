-- Migration: Fix Authorization Checks in Batch Tracking Onboarding RPCs
--
-- CRITICAL SECURITY FIX: The remote schema migration (20260204172142) contained
-- versions of the batch tracking RPC functions WITHOUT proper authorization checks.
-- These functions use SECURITY DEFINER (elevated privileges) so MUST verify user
-- access to the store before performing operations.
--
-- This migration adds proper authorization checks to all three functions:
-- 1. get_categories_with_tracking_settings
-- 2. get_products_for_tracking_setup  
-- 3. save_batch_tracking_setup
--
-- Date: February 4, 2026

SET check_function_bodies = off;

-- ============================================================================
-- 1. Fix: get_categories_with_tracking_settings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_categories_with_tracking_settings(p_store_id uuid)
 RETURNS TABLE(
   category_id uuid, 
   category_code text, 
   display_name_en text, 
   display_name_fr text, 
   typical_shelf_life_days integer, 
   is_tracked boolean, 
   auto_create_batches boolean, 
   default_shelf_life_days integer, 
   product_count bigint
 )
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
$function$;

COMMENT ON FUNCTION public.get_categories_with_tracking_settings(uuid) IS
'Returns all active categories with their current tracking settings for a store. SECURITY DEFINER with proper authorization check. Used in onboarding step 3 (automation preferences).';

-- ============================================================================
-- 2. Fix: get_products_for_tracking_setup
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_products_for_tracking_setup(
  uuid, uuid, text, boolean, integer, integer
);

CREATE OR REPLACE FUNCTION public.get_products_for_tracking_setup(
  p_store_id uuid, 
  p_category_id uuid DEFAULT NULL::uuid, 
  p_search_term text DEFAULT NULL::text, 
  p_only_tracked boolean DEFAULT NULL::boolean, 
  p_page_size integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   product_id uuid, 
   name text, 
   brand text, 
   barcode text, 
   image_url text, 
   category_id uuid, 
   category_name text, 
   typical_shelf_life_days integer, 
   is_tracked_for_batches boolean, 
   shelf_life_override_days integer, 
   auto_create_batches boolean, 
   inherited_auto_create boolean, 
   inherited_shelf_life_days integer, 
   total_count bigint
 )
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
$function$;

COMMENT ON FUNCTION public.get_products_for_tracking_setup(uuid, uuid, text, boolean, integer, integer) IS
'Returns paginated products with their tracking settings for fine-tuning. SECURITY DEFINER with proper authorization check. Supports filtering by category, search term, and tracking status.';

-- ============================================================================
-- 3. Fix: save_batch_tracking_setup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_batch_tracking_setup(
  p_store_id uuid, 
  p_config jsonb, 
  p_category_settings jsonb DEFAULT '[]'::jsonb, 
  p_product_overrides jsonb DEFAULT '[]'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_categories_updated integer := 0;
  v_products_updated integer := 0;
  v_category jsonb;
  v_product jsonb;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- CRITICAL: Verify user has manager/owner access to this store
  SELECT role_in_store INTO v_user_role
  FROM business.store_users
  WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND is_active = true;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: User does not have access to this store'
    );
  END IF;

  IF v_user_role NOT IN ('owner', 'manager') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only owners and managers can configure batch tracking'
    );
  END IF;

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
  -- Don't hardcode currency - let default or existing value handle it
  INSERT INTO business.store_settings (
    store_id, 
    batch_tracking_config
  )
  VALUES (
    p_store_id, 
    p_config
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
$function$;

COMMENT ON FUNCTION public.save_batch_tracking_setup(uuid, jsonb, jsonb, jsonb) IS
'Saves the complete batch tracking configuration from the onboarding wizard. SECURITY DEFINER with proper authorization check (requires manager/owner role). Updates store settings, category settings, and product overrides.';

-- ============================================================================
-- End of migration
-- ============================================================================
