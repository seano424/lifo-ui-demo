-- =====================================================
-- Migration: enable_rls_on_all_public_tables_v2
-- Date: 2025-11-18
-- Description: Enable RLS on all public schema tables and create policies
-- =====================================================

-- =====================================================
-- STEP 1: Enable RLS on all public schema tables
-- =====================================================

-- Reference/Configuration Tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_weights ENABLE ROW LEVEL SECURITY;

-- Core Entity Tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Relationship Tables
ALTER TABLE public.donation_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Batch/Inventory Tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_actions ENABLE ROW LEVEL SECURITY;

-- Analytics/Tracking Tables
ALTER TABLE public.product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create simplified helper function for RLS policies
-- =====================================================

CREATE OR REPLACE FUNCTION public.rls_check_store_access(check_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, business
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = check_store_id
      AND su.is_active = true
  );
$$;

COMMENT ON FUNCTION public.rls_check_store_access IS
  'RLS helper: Checks if the current authenticated user has access to a specific store via business.store_users';

-- =====================================================
-- STEP 3: Global Reference Data Policies (Read-Only)
-- =====================================================

-- Categories: Everyone can read
CREATE POLICY "categories_read_all" ON public.categories
  FOR SELECT
  USING (true);

-- Category Weights: Everyone can read
CREATE POLICY "category_weights_read_all" ON public.category_weights
  FOR SELECT
  USING (true);

-- =====================================================
-- STEP 4: Core Entity Policies
-- =====================================================

-- PRODUCTS: All authenticated users can read
-- Note: Products are global catalog items, store-specific pricing is in store_products
CREATE POLICY "products_read_authenticated" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert_authenticated" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_update_authenticated" ON public.products
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid()::varchar OR auth.uid() IS NOT NULL);

-- USERS: Users can only read/update their own records
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::varchar);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::varchar);

-- STORES: Users can only see stores they have access to
CREATE POLICY "stores_read_member" ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_users su
      WHERE su.store_id = stores.store_id
        AND su.user_id = auth.uid()::varchar
        AND su.is_active = true
    )
  );

CREATE POLICY "stores_update_owner" ON public.stores
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()::varchar
    OR EXISTS (
      SELECT 1
      FROM public.store_users su
      WHERE su.store_id = stores.store_id
        AND su.user_id = auth.uid()::varchar
        AND su.role_in_store IN ('owner', 'manager')
    )
  );

-- =====================================================
-- STEP 5: Store-Scoped Table Policies
-- =====================================================

-- DONATION RECIPIENTS: Store-scoped
CREATE POLICY "donation_recipients_store_access" ON public.donation_recipients
  FOR ALL
  TO authenticated
  USING (public.rls_check_store_access(store_id::uuid));

-- EXTERNAL FACTORS: Store-scoped
CREATE POLICY "external_factors_store_access" ON public.external_factors
  FOR ALL
  TO authenticated
  USING (
    store_id IS NULL
    OR public.rls_check_store_access(store_id::uuid)
  );

-- STORE PRODUCTS: Store-scoped
CREATE POLICY "store_products_store_access" ON public.store_products
  FOR ALL
  TO authenticated
  USING (public.rls_check_store_access(store_id::uuid));

-- BATCHES: Store-scoped
CREATE POLICY "batches_store_access" ON public.batches
  FOR ALL
  TO authenticated
  USING (public.rls_check_store_access(store_id::uuid));

-- BATCH ACTIONS: Store-scoped
CREATE POLICY "batch_actions_store_access" ON public.batch_actions
  FOR ALL
  TO authenticated
  USING (public.rls_check_store_access(store_id::uuid));

-- PRODUCT SCORES: Store-scoped
CREATE POLICY "product_scores_store_access" ON public.product_scores
  FOR ALL
  TO authenticated
  USING (
    store_id IS NULL
    OR public.rls_check_store_access(store_id::uuid)
  );

-- ACTIONS: Store-scoped
CREATE POLICY "actions_store_access" ON public.actions
  FOR ALL
  TO authenticated
  USING (
    store_id IS NULL
    OR public.rls_check_store_access(store_id::uuid)
  );

-- INVENTORY SNAPSHOTS: Store-scoped
CREATE POLICY "inventory_snapshots_store_access" ON public.inventory_snapshots
  FOR ALL
  TO authenticated
  USING (
    store_id IS NULL
    OR public.rls_check_store_access(store_id::uuid)
  );

-- SALES EVENTS: Store-scoped
CREATE POLICY "sales_events_store_access" ON public.sales_events
  FOR ALL
  TO authenticated
  USING (
    store_id IS NULL
    OR public.rls_check_store_access(store_id::uuid)
  );

-- =====================================================
-- STEP 6: User/Role Management Policies
-- =====================================================

-- ROLES: Read-only for all authenticated users
CREATE POLICY "roles_read_authenticated" ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- USER ROLES: Users can see their own roles
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::varchar);

-- STORE USERS: Users can see store user relationships for their stores
CREATE POLICY "store_users_read_member" ON public.store_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::varchar
    OR public.rls_check_store_access(store_id::uuid)
  );

-- Store owners/managers can manage store users
CREATE POLICY "store_users_manage_owner" ON public.store_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.store_users su
      WHERE su.store_id = store_users.store_id
        AND su.user_id = auth.uid()::varchar
        AND su.role_in_store IN ('owner', 'manager')
    )
  );

CREATE POLICY "store_users_update_owner" ON public.store_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_users su
      WHERE su.store_id = store_users.store_id
        AND su.user_id = auth.uid()::varchar
        AND su.role_in_store IN ('owner', 'manager')
    )
  );

CREATE POLICY "store_users_delete_owner" ON public.store_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_users su
      WHERE su.store_id = store_users.store_id
        AND su.user_id = auth.uid()::varchar
        AND su.role_in_store IN ('owner', 'manager')
    )
  );

-- STORE SETTINGS: Store-scoped
CREATE POLICY "store_settings_store_access" ON public.store_settings
  FOR ALL
  TO authenticated
  USING (public.rls_check_store_access(store_id::uuid));

-- =====================================================
-- STEP 7: Grant necessary permissions
-- =====================================================

-- Ensure authenticated users can use the helper function
GRANT EXECUTE ON FUNCTION public.rls_check_store_access(uuid) TO authenticated;

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete where appropriate (RLS will enforce)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
