-- Migration: 020_implement_inventory_rls_policies.sql
-- Implement Row Level Security policies for normalized inventory schema
-- Covers inventory.products, inventory.store_products, and updated inventory.batches

BEGIN;

-- =============================================
-- ENABLE RLS ON TABLES
-- =============================================

-- Enable RLS on new/updated tables
ALTER TABLE inventory.store_products ENABLE ROW LEVEL SECURITY;

-- RLS should already be enabled on inventory.products and inventory.batches
-- but let's ensure it
ALTER TABLE inventory.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.batches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INVENTORY.PRODUCTS RLS POLICIES
-- =============================================

-- Products are readable by all authenticated users (for search/discovery)
DROP POLICY IF EXISTS "Products are readable by authenticated users" ON inventory.products;
CREATE POLICY "Products are readable by authenticated users" ON inventory.products
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create new products (with proper verification)
DROP POLICY IF EXISTS "Users can create products" ON inventory.products;
CREATE POLICY "Users can create products" ON inventory.products
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid()
    );

-- Users can update products they created or if they have store manager permissions
DROP POLICY IF EXISTS "Users can update products with permissions" ON inventory.products;
CREATE POLICY "Users can update products with permissions" ON inventory.products
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business.store_users su
                WHERE su.user_id = auth.uid()
                AND su.role_in_store IN ('owner', 'manager')
                AND su.is_active = TRUE
            )
        )
    );

-- =============================================
-- INVENTORY.STORE_PRODUCTS RLS POLICIES
-- =============================================

-- Store users can view products for their stores
CREATE POLICY "Users can view store products for accessible stores" ON inventory.store_products
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_products.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
        )
    );

-- Store users can add products to their stores
CREATE POLICY "Store users can add products to their stores" ON inventory.store_products
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_products.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager', 'employee')
            AND su.is_active = TRUE
        ) AND
        added_by = auth.uid()
    );

-- Store users can update products in their stores (with role restrictions)
CREATE POLICY "Store users can update products in their stores" ON inventory.store_products
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_products.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
            AND (
                su.role_in_store IN ('owner', 'manager') OR
                (su.role_in_store = 'employee' AND su.permissions ? 'can_edit_products')
            )
        )
    ) WITH CHECK (
        updated_by = auth.uid()
    );

-- Store owners/managers can delete products from their stores
CREATE POLICY "Store managers can remove products from stores" ON inventory.store_products
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_products.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager')
            AND su.is_active = TRUE
        )
    );

-- =============================================
-- UPDATE INVENTORY.BATCHES RLS POLICIES
-- =============================================

-- Update existing batch policies to work with normalized products
-- Users can view batches for stores they have access to
DROP POLICY IF EXISTS "Users can view batches for accessible stores" ON inventory.batches;
CREATE POLICY "Users can view batches for accessible stores" ON inventory.batches
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = batches.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
        )
    );

-- Users can create batches for stores they have access to
DROP POLICY IF EXISTS "Users can create batches for accessible stores" ON inventory.batches;
CREATE POLICY "Users can create batches for accessible stores" ON inventory.batches
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = batches.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager', 'employee')
            AND su.is_active = TRUE
        ) AND
        created_by = auth.uid() AND
        -- Ensure the product exists and is available to this store
        EXISTS (
            SELECT 1 FROM inventory.store_products sp
            WHERE sp.store_id = batches.store_id
            AND sp.product_id = batches.product_id
            AND sp.is_active = TRUE
        )
    );

-- Users can update batches for stores they have access to
DROP POLICY IF EXISTS "Users can update batches for accessible stores" ON inventory.batches;
CREATE POLICY "Users can update batches for accessible stores" ON inventory.batches
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = batches.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
            AND (
                su.role_in_store IN ('owner', 'manager') OR
                (su.role_in_store = 'employee' AND su.permissions ? 'can_edit_inventory')
            )
        )
    );

-- =============================================
-- HELPER FUNCTIONS FOR COMMON OPERATIONS
-- =============================================

-- Function to check if user can access store
CREATE OR REPLACE FUNCTION inventory.user_can_access_store(store_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = store_uuid
        AND su.user_id = auth.uid()
        AND su.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage store (owner/manager)
CREATE OR REPLACE FUNCTION inventory.user_can_manage_store(store_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = store_uuid
        AND su.user_id = auth.uid()
        AND su.role_in_store IN ('owner', 'manager')
        AND su.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible stores
CREATE OR REPLACE FUNCTION inventory.get_user_stores()
RETURNS TABLE(store_id UUID, store_name TEXT, role_in_store TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.store_id, s.store_name::TEXT, su.role_in_store::TEXT
    FROM business.stores s
    JOIN business.store_users su ON s.store_id = su.store_id
    WHERE su.user_id = auth.uid()
    AND su.is_active = TRUE
    AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for products available in user's stores
CREATE OR REPLACE VIEW inventory.my_store_products AS
SELECT 
    sp.*,
    p.name,
    p.brand,
    p.category,
    p.barcode,
    s.store_name
FROM inventory.store_products sp
JOIN inventory.products p ON sp.product_id = p.product_id
JOIN business.stores s ON sp.store_id = s.store_id
WHERE inventory.user_can_access_store(sp.store_id)
AND sp.is_active = TRUE;

-- View for batches in user's stores with product info
CREATE OR REPLACE VIEW inventory.my_store_batches AS
SELECT 
    b.*,
    p.name as product_name,
    p.brand,
    p.category,
    p.barcode,
    sp.cost_price as store_cost_price,
    sp.selling_price as store_selling_price,
    s.store_name
FROM inventory.batches b
JOIN inventory.products p ON b.product_id = p.product_id
JOIN inventory.store_products sp ON (b.store_id = sp.store_id AND b.product_id = sp.product_id)
JOIN business.stores s ON b.store_id = s.store_id
WHERE inventory.user_can_access_store(b.store_id);

COMMIT;

-- =============================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================

-- Test RLS policies are working
-- SELECT inventory.user_can_access_store('some-store-uuid');
-- SELECT * FROM inventory.my_store_products LIMIT 5;
-- SELECT * FROM inventory.my_store_batches LIMIT 5;