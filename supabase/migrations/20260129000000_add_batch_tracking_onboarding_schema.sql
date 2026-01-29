-- Migration: Batch Tracking Onboarding Schema Support
--
-- Context: Add database schema support for the batch tracking onboarding wizard.
-- This enables store owners to configure which products to track for expiration
-- management and whether to auto-create batches on delivery.
--
-- Key Concepts:
--   - TRACKED: Product/category appears in expiry dashboard, manual batch creation allowed
--   - AUTO-CREATE: System automatically creates batches on delivery scan
--   These are independent: you can track without auto-creating, or vice versa.
--
-- Changes:
--   1. Add batch_tracking_config JSONB column to business.store_settings
--   2. Add tracking/automation columns to inventory.store_products
--   3. Create inventory.store_category_settings table for category-level config
--   4. Add RLS policies for new table
--   5. Create RPC functions for onboarding wizard
--   6. Add indexes for performance
--
-- Date: January 29, 2026

-- ============================================================================
-- 1. Add batch_tracking_config to business.store_settings
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'business'
    AND table_name = 'store_settings'
    AND column_name = 'batch_tracking_config'
  ) THEN
    ALTER TABLE business.store_settings
      ADD COLUMN batch_tracking_config jsonb DEFAULT jsonb_build_object(
        'enabled', false,
        'setup_completed', false,
        'setup_completed_at', null,
        'product_selection_mode', null,
        'selected_category_ids', '[]'::jsonb,
        'selected_product_ids', '[]'::jsonb,
        'automation_schedule', jsonb_build_object(
          'enabled', false,
          'run_time', '08:30',
          'days', '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]'::jsonb
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN business.store_settings.batch_tracking_config IS
'Batch tracking onboarding configuration. Contains enabled status, setup completion, product selection mode (all/by_category/individual), selected categories/products, and automation schedule settings.';

-- ============================================================================
-- 2. Add tracking and automation columns to inventory.store_products
-- ============================================================================

-- Add is_tracked_for_batches column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'inventory'
    AND table_name = 'store_products'
    AND column_name = 'is_tracked_for_batches'
  ) THEN
    ALTER TABLE inventory.store_products
      ADD COLUMN is_tracked_for_batches boolean DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN inventory.store_products.is_tracked_for_batches IS
'Whether this product is included in batch tracking and expiry management. Default true. When false, product is excluded from expiry dashboard and batch creation flows.';

-- Add shelf_life_override_days column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'inventory'
    AND table_name = 'store_products'
    AND column_name = 'shelf_life_override_days'
  ) THEN
    ALTER TABLE inventory.store_products
      ADD COLUMN shelf_life_override_days integer;
  END IF;
END $$;

COMMENT ON COLUMN inventory.store_products.shelf_life_override_days IS
'Product-specific shelf life override in days. When set, this value is used instead of the category default or product typical_shelf_life_days. Must be positive if set.';

-- Add auto_create_batches column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'inventory'
    AND table_name = 'store_products'
    AND column_name = 'auto_create_batches'
  ) THEN
    ALTER TABLE inventory.store_products
      ADD COLUMN auto_create_batches boolean;
  END IF;
END $$;

COMMENT ON COLUMN inventory.store_products.auto_create_batches IS
'Product-level automation override. NULL means inherit from category settings in store_category_settings. TRUE enables auto-batch creation on delivery scan. FALSE disables it for this specific product.';

-- Add constraint for positive shelf_life_override_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'inventory'
    AND table_name = 'store_products'
    AND constraint_name = 'store_products_shelf_life_override_positive'
  ) THEN
    ALTER TABLE inventory.store_products
      ADD CONSTRAINT store_products_shelf_life_override_positive
      CHECK (shelf_life_override_days IS NULL OR shelf_life_override_days > 0);
  END IF;
END $$;

-- ============================================================================
-- 3. Create inventory.store_category_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory.store_category_settings (
  store_id uuid NOT NULL,
  category_id uuid NOT NULL,
  is_tracked boolean DEFAULT true NOT NULL,
  auto_create_batches boolean DEFAULT false NOT NULL,
  default_shelf_life_days integer,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,

  -- Primary key
  CONSTRAINT store_category_settings_pkey PRIMARY KEY (store_id, category_id),

  -- Foreign keys
  CONSTRAINT store_category_settings_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES business.stores(store_id) ON DELETE CASCADE,
  CONSTRAINT store_category_settings_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES inventory.categories(category_id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT store_category_settings_shelf_life_positive
    CHECK (default_shelf_life_days IS NULL OR default_shelf_life_days > 0)
);

ALTER TABLE inventory.store_category_settings OWNER TO postgres;

COMMENT ON TABLE inventory.store_category_settings IS
'Store-specific category configuration for batch tracking and automation. Two independent concepts: (1) IS_TRACKED determines if category products appear in expiry dashboard and allow manual batch creation. (2) AUTO_CREATE_BATCHES determines if batches are automatically created on delivery scan. Examples: Track dairy but create batches manually (is_tracked=true, auto_create_batches=false), Auto-create batches for produce (both true), Don''t track alcohol (is_tracked=false).';

COMMENT ON COLUMN inventory.store_category_settings.is_tracked IS
'Whether this category is tracked for expiration management. When true, category products appear in expiry dashboard and users can manually create batches.';

COMMENT ON COLUMN inventory.store_category_settings.auto_create_batches IS
'Whether to automatically create batches for this category on delivery scan. Independent from is_tracked - you can track without auto-creating.';

COMMENT ON COLUMN inventory.store_category_settings.default_shelf_life_days IS
'Category-level shelf life override for this store. When set, overrides the typical_shelf_life_days from inventory.categories for all products in this category (unless product has its own override).';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS trigger_store_category_settings_updated_at ON inventory.store_category_settings;
CREATE TRIGGER trigger_store_category_settings_updated_at
  BEFORE UPDATE ON inventory.store_category_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_store_category_settings_store_id
  ON inventory.store_category_settings(store_id);

CREATE INDEX IF NOT EXISTS idx_store_category_settings_category_id
  ON inventory.store_category_settings(category_id);

CREATE INDEX IF NOT EXISTS idx_store_category_settings_tracked
  ON inventory.store_category_settings(store_id, is_tracked)
  WHERE is_tracked = true;

CREATE INDEX IF NOT EXISTS idx_store_category_settings_auto_create
  ON inventory.store_category_settings(store_id, auto_create_batches)
  WHERE auto_create_batches = true;

-- ============================================================================
-- 4. Add RLS policies for inventory.store_category_settings
-- ============================================================================

ALTER TABLE inventory.store_category_settings ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can view settings for stores they have access to
DROP POLICY IF EXISTS store_category_settings_select_policy ON inventory.store_category_settings;
CREATE POLICY store_category_settings_select_policy
  ON inventory.store_category_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business.store_users
      WHERE store_users.store_id = store_category_settings.store_id
        AND store_users.user_id = auth.uid()
        AND store_users.is_active = true
    )
  );

-- INSERT policy: Only owners and managers can create settings
DROP POLICY IF EXISTS store_category_settings_insert_policy ON inventory.store_category_settings;
CREATE POLICY store_category_settings_insert_policy
  ON inventory.store_category_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business.store_users
      WHERE store_users.store_id = store_category_settings.store_id
        AND store_users.user_id = auth.uid()
        AND store_users.is_active = true
        AND store_users.role_in_store IN ('owner', 'manager')
    )
  );

-- UPDATE policy: Only owners and managers can modify settings
DROP POLICY IF EXISTS store_category_settings_update_policy ON inventory.store_category_settings;
CREATE POLICY store_category_settings_update_policy
  ON inventory.store_category_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business.store_users
      WHERE store_users.store_id = store_category_settings.store_id
        AND store_users.user_id = auth.uid()
        AND store_users.is_active = true
        AND store_users.role_in_store IN ('owner', 'manager')
    )
  );

-- DELETE policy: Only owners and managers can delete settings
DROP POLICY IF EXISTS store_category_settings_delete_policy ON inventory.store_category_settings;
CREATE POLICY store_category_settings_delete_policy
  ON inventory.store_category_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business.store_users
      WHERE store_users.store_id = store_category_settings.store_id
        AND store_users.user_id = auth.uid()
        AND store_users.is_active = true
        AND store_users.role_in_store IN ('owner', 'manager')
    )
  );

-- ============================================================================
-- 5. Create RPC function: save_batch_tracking_setup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_batch_tracking_setup(
  p_store_id uuid,
  p_config jsonb,
  p_category_settings jsonb[] DEFAULT '{}',
  p_product_overrides jsonb[] DEFAULT '{}'
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_category_setting jsonb;
  v_product_override jsonb;
  v_categories_updated integer := 0;
  v_products_updated integer := 0;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has manager/owner access to store
  SELECT role_in_store INTO v_user_role
  FROM business.store_users
  WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND is_active = true;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to store %', p_store_id;
  END IF;

  IF v_user_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: Only owners and managers can configure batch tracking';
  END IF;

  -- Update store_settings.batch_tracking_config
  -- Merge with existing config, set setup_completed = true and setup_completed_at = now()
  UPDATE business.store_settings
  SET batch_tracking_config = jsonb_build_object(
    'enabled', COALESCE((p_config->>'enabled')::boolean, true),
    'setup_completed', true,
    'setup_completed_at', to_jsonb(now()),
    'product_selection_mode', p_config->>'product_selection_mode',
    'selected_category_ids', COALESCE(p_config->'selected_category_ids', '[]'::jsonb),
    'selected_product_ids', COALESCE(p_config->'selected_product_ids', '[]'::jsonb),
    'automation_schedule', COALESCE(
      p_config->'automation_schedule',
      jsonb_build_object(
        'enabled', false,
        'run_time', '08:30',
        'days', '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]'::jsonb
      )
    )
  ),
  updated_at = now()
  WHERE store_id = p_store_id;

  -- Upsert category settings
  FOREACH v_category_setting IN ARRAY p_category_settings
  LOOP
    INSERT INTO inventory.store_category_settings (
      store_id,
      category_id,
      is_tracked,
      auto_create_batches,
      default_shelf_life_days
    ) VALUES (
      p_store_id,
      (v_category_setting->>'category_id')::uuid,
      COALESCE((v_category_setting->>'is_tracked')::boolean, true),
      COALESCE((v_category_setting->>'auto_create_batches')::boolean, false),
      (v_category_setting->>'default_shelf_life_days')::integer
    )
    ON CONFLICT (store_id, category_id)
    DO UPDATE SET
      is_tracked = COALESCE((v_category_setting->>'is_tracked')::boolean, true),
      auto_create_batches = COALESCE((v_category_setting->>'auto_create_batches')::boolean, false),
      default_shelf_life_days = (v_category_setting->>'default_shelf_life_days')::integer,
      updated_at = now();

    v_categories_updated := v_categories_updated + 1;
  END LOOP;

  -- Update product overrides
  FOREACH v_product_override IN ARRAY p_product_overrides
  LOOP
    UPDATE inventory.store_products
    SET
      is_tracked_for_batches = COALESCE((v_product_override->>'is_tracked_for_batches')::boolean, is_tracked_for_batches),
      shelf_life_override_days = (v_product_override->>'shelf_life_override_days')::integer,
      auto_create_batches = (v_product_override->>'auto_create_batches')::boolean,
      updated_at = now()
    WHERE store_id = p_store_id
      AND product_id = (v_product_override->>'product_id')::uuid;

    IF FOUND THEN
      v_products_updated := v_products_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'setup_completed', true,
    'categories_updated', v_categories_updated,
    'products_updated', v_products_updated
  );
END;
$$;

COMMENT ON FUNCTION public.save_batch_tracking_setup(uuid, jsonb, jsonb[], jsonb[]) IS
'Saves the complete batch tracking configuration from the onboarding wizard. Validates user has manager/owner access, updates store_settings.batch_tracking_config, upserts category settings, and applies product overrides. Sets setup_completed=true on success.';

-- ============================================================================
-- 6. Create RPC function: get_batch_tracking_setup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_batch_tracking_setup(
  p_store_id uuid
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
  v_config jsonb;
  v_category_settings jsonb;
  v_product_override_count integer;
  v_tracked_product_count integer;
  v_automated_product_count integer;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
      AND user_id = v_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to store %', p_store_id;
  END IF;

  -- Get batch_tracking_config from store_settings
  SELECT batch_tracking_config INTO v_config
  FROM business.store_settings
  WHERE store_id = p_store_id;

  -- Get category settings
  SELECT jsonb_agg(
    jsonb_build_object(
      'category_id', category_id,
      'is_tracked', is_tracked,
      'auto_create_batches', auto_create_batches,
      'default_shelf_life_days', default_shelf_life_days
    )
  ) INTO v_category_settings
  FROM inventory.store_category_settings
  WHERE store_id = p_store_id;

  -- Count product overrides (products with custom settings)
  SELECT COUNT(*) INTO v_product_override_count
  FROM inventory.store_products
  WHERE store_id = p_store_id
    AND (
      shelf_life_override_days IS NOT NULL
      OR auto_create_batches IS NOT NULL
      OR is_tracked_for_batches = false
    );

  -- Count tracked products
  SELECT COUNT(*) INTO v_tracked_product_count
  FROM inventory.store_products
  WHERE store_id = p_store_id
    AND is_tracked_for_batches = true;

  -- Count automated products (products with auto_create enabled at product or category level)
  SELECT COUNT(DISTINCT sp.product_id) INTO v_automated_product_count
  FROM inventory.store_products sp
  LEFT JOIN inventory.products p ON sp.product_id = p.product_id
  LEFT JOIN inventory.store_category_settings scs ON scs.store_id = sp.store_id AND scs.category_id = p.category_id
  WHERE sp.store_id = p_store_id
    AND sp.is_tracked_for_batches = true
    AND (
      sp.auto_create_batches = true
      OR (sp.auto_create_batches IS NULL AND COALESCE(scs.auto_create_batches, false) = true)
    );

  RETURN jsonb_build_object(
    'config', COALESCE(v_config, jsonb_build_object('enabled', false, 'setup_completed', false)),
    'category_settings', COALESCE(v_category_settings, '[]'::jsonb),
    'product_override_count', v_product_override_count,
    'tracked_product_count', v_tracked_product_count,
    'automated_product_count', v_automated_product_count
  );
END;
$$;

COMMENT ON FUNCTION public.get_batch_tracking_setup(uuid) IS
'Returns the complete batch tracking configuration for a store. Includes config object, category settings array, and summary counts for products with overrides, tracked products, and automated products. Used for review screen in onboarding wizard.';

-- ============================================================================
-- 7. Create RPC function: get_categories_with_tracking_settings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_categories_with_tracking_settings(
  p_store_id uuid
) RETURNS TABLE(
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
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
      AND user_id = v_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to store %', p_store_id;
  END IF;

  RETURN QUERY
  SELECT
    c.category_id,
    c.category_code,
    c.display_name_en,
    c.display_name_fr,
    c.typical_shelf_life_days,
    COALESCE(scs.is_tracked, true) as is_tracked,
    COALESCE(scs.auto_create_batches, false) as auto_create_batches,
    scs.default_shelf_life_days,
    COUNT(DISTINCT sp.product_id) as product_count
  FROM inventory.categories c
  LEFT JOIN inventory.store_category_settings scs
    ON scs.category_id = c.category_id
    AND scs.store_id = p_store_id
  LEFT JOIN inventory.products p ON p.category_id = c.category_id
  LEFT JOIN inventory.store_products sp
    ON sp.product_id = p.product_id
    AND sp.store_id = p_store_id
  WHERE c.is_active = true
  GROUP BY
    c.category_id,
    c.category_code,
    c.display_name_en,
    c.display_name_fr,
    c.typical_shelf_life_days,
    c.sort_order,
    scs.is_tracked,
    scs.auto_create_batches,
    scs.default_shelf_life_days
  ORDER BY c.sort_order, c.display_name_en;
END;
$$;

COMMENT ON FUNCTION public.get_categories_with_tracking_settings(uuid) IS
'Returns all active categories with their current tracking settings for a store. Used in onboarding step 3 (automation preferences). Includes category details, tracking/automation flags (defaults to true/false if no settings exist), and product count per category.';

-- ============================================================================
-- 8. Create RPC function: get_products_for_tracking_setup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_products_for_tracking_setup(
  p_store_id uuid,
  p_category_id uuid DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_only_tracked boolean DEFAULT NULL,
  p_page_size integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
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
  total_count bigint
)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
  v_total_count bigint;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has access to store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
      AND user_id = v_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to store %', p_store_id;
  END IF;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total_count
  FROM inventory.store_products sp
  INNER JOIN inventory.products p ON sp.product_id = p.product_id
  INNER JOIN inventory.categories c ON p.category_id = c.category_id
  WHERE sp.store_id = p_store_id
    AND sp.is_active = true
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_only_tracked IS NULL OR sp.is_tracked_for_batches = p_only_tracked)
    AND (
      p_search_term IS NULL
      OR p.name ILIKE '%' || p_search_term || '%'
      OR p.brand ILIKE '%' || p_search_term || '%'
      OR p.barcode ILIKE '%' || p_search_term || '%'
    );

  RETURN QUERY
  SELECT
    p.product_id,
    p.name,
    p.brand,
    p.barcode,
    sp.image_url,
    c.category_id,
    c.display_name_en as category_name,
    p.typical_shelf_life_days,
    sp.is_tracked_for_batches,
    sp.shelf_life_override_days,
    sp.auto_create_batches,
    COALESCE(scs.auto_create_batches, false) as inherited_auto_create,
    v_total_count as total_count
  FROM inventory.store_products sp
  INNER JOIN inventory.products p ON sp.product_id = p.product_id
  INNER JOIN inventory.categories c ON p.category_id = c.category_id
  LEFT JOIN inventory.store_category_settings scs
    ON scs.store_id = sp.store_id
    AND scs.category_id = c.category_id
  WHERE sp.store_id = p_store_id
    AND sp.is_active = true
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_only_tracked IS NULL OR sp.is_tracked_for_batches = p_only_tracked)
    AND (
      p_search_term IS NULL
      OR p.name ILIKE '%' || p_search_term || '%'
      OR p.brand ILIKE '%' || p_search_term || '%'
      OR p.barcode ILIKE '%' || p_search_term || '%'
    )
  ORDER BY p.name
  LIMIT p_page_size
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_products_for_tracking_setup(uuid, uuid, text, boolean, integer, integer) IS
'Returns paginated products with their tracking settings for fine-tuning (onboarding step 4). Supports filtering by category, search term, and tracking status. Returns product details, current tracking/automation settings, inherited automation from category, and total count for pagination.';

-- ============================================================================
-- 9. Grant permissions on new table
-- ============================================================================

GRANT ALL ON TABLE inventory.store_category_settings TO anon;
GRANT ALL ON TABLE inventory.store_category_settings TO authenticated;
GRANT ALL ON TABLE inventory.store_category_settings TO service_role;

-- ============================================================================
-- End of migration
-- ============================================================================
