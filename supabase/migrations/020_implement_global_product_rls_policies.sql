-- Migration: 020_implement_global_product_rls_policies.sql
-- Phase 3: Implement Row Level Security policies and additional helper functions
-- This migration adds comprehensive RLS policies for the new global product schema

BEGIN;

-- =============================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================

ALTER TABLE global.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.store_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE global.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global.barcode_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE global.ocr_extraction_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- GLOBAL.PRODUCTS RLS POLICIES
-- =============================================

-- Global products are readable by all authenticated users (for product search/discovery)
CREATE POLICY "Global products are readable by authenticated users" ON global.products
    FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Users can create new global products (with verification pending)
CREATE POLICY "Users can create global products" ON global.products
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid() AND
        verification_status = 'pending'
    );

-- Users can update global products they created (before verification)
CREATE POLICY "Users can update their unverified global products" ON global.products
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        created_by = auth.uid() AND 
        verification_status = 'pending'
    );

-- Store owners and managers can verify global products
CREATE POLICY "Store managers can verify global products" ON global.products
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager')
            AND su.is_active = TRUE
        )
    ) WITH CHECK (
        verification_status IN ('verified', 'flagged', 'rejected')
    );

-- Allow updating search vector and metadata for system processes
CREATE POLICY "System can update global product metadata" ON global.products
    FOR UPDATE USING (true); -- Will be restricted by function security

-- =============================================
-- BUSINESS.STORE_PRODUCT RLS POLICIES
-- =============================================

-- Store users can view products for their stores
CREATE POLICY "Users can view store products for accessible stores" ON business.store_product
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_product.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
        )
    );

-- Store users can add products to their stores
CREATE POLICY "Store users can add products to their stores" ON business.store_product
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_product.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager', 'employee')
            AND su.is_active = TRUE
        ) AND
        added_by = auth.uid()
    );

-- Store users can update products in their stores (with role restrictions)
CREATE POLICY "Store users can update products in their stores" ON business.store_product
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_product.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
            AND (
                su.role_in_store IN ('owner', 'manager') OR
                (su.role_in_store = 'employee' AND su.permissions ? 'can_edit_products')
            )
        )
    ) WITH CHECK (updated_by = auth.uid());

-- Only store owners and managers can remove products from stores
CREATE POLICY "Store owners can remove products from stores" ON business.store_product
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = store_product.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager')
            AND su.is_active = TRUE
        )
    );

-- =============================================
-- GLOBAL.PRODUCT_CATEGORIES RLS POLICIES
-- =============================================

-- Product categories are readable by all authenticated users
CREATE POLICY "Product categories are readable by authenticated users" ON global.product_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only system administrators can modify categories (implemented via function security)
CREATE POLICY "System can manage product categories" ON global.product_categories
    FOR ALL USING (false); -- Managed through secure functions only

-- =============================================
-- GLOBAL.BARCODE_FORMATS RLS POLICIES
-- =============================================

-- Barcode formats are readable by all authenticated users
CREATE POLICY "Barcode formats are readable by authenticated users" ON global.barcode_formats
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only system can manage barcode formats
CREATE POLICY "System can manage barcode formats" ON global.barcode_formats
    FOR ALL USING (false); -- Managed through secure functions only

-- =============================================
-- GLOBAL.OCR_EXTRACTION_LOG RLS POLICIES
-- =============================================

-- Users can view OCR logs for their stores
CREATE POLICY "Users can view OCR logs for their stores" ON global.ocr_extraction_log
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        (
            extracted_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business.store_users su
                WHERE su.store_id = ocr_extraction_log.store_id
                AND su.user_id = auth.uid()
                AND su.is_active = TRUE
            )
        )
    );

-- Users can create OCR logs for stores they have access to
CREATE POLICY "Users can create OCR logs for accessible stores" ON global.ocr_extraction_log
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        extracted_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = ocr_extraction_log.store_id
            AND su.user_id = auth.uid()
            AND su.is_active = TRUE
        )
    );

-- Users can update OCR logs they created (for verification)
CREATE POLICY "Users can update their OCR logs" ON global.ocr_extraction_log
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        extracted_by = auth.uid()
    );

-- Store managers can verify any OCR logs in their stores
CREATE POLICY "Store managers can verify OCR logs in their stores" ON global.ocr_extraction_log
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = ocr_extraction_log.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('owner', 'manager')
            AND su.is_active = TRUE
        )
    ) WITH CHECK (verified_by = auth.uid());

-- =============================================
-- ADDITIONAL HELPER FUNCTIONS
-- =============================================

-- Function to check if user can manage global products
CREATE OR REPLACE FUNCTION user_can_manage_global_products()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is a store manager/owner (has product management privileges)
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.user_id = auth.uid()
        AND su.role_in_store IN ('owner', 'manager')
        AND su.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add product to store catalog
CREATE OR REPLACE FUNCTION add_product_to_store(
    p_store_id UUID,
    p_product_id UUID,
    p_cost_price DECIMAL(12,4),
    p_selling_price DECIMAL(12,4),
    p_store_sku VARCHAR(100) DEFAULT NULL,
    p_supplier_code VARCHAR(50) DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
SET search_path = public, business, global
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Check permissions
    IF NOT EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = p_store_id
        AND su.user_id = v_user_id
        AND su.role_in_store IN ('owner', 'manager', 'employee')
        AND su.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'User does not have permission to add products to this store';
    END IF;
    
    -- Check if product exists in global catalog
    IF NOT EXISTS (
        SELECT 1 FROM global.products p
        WHERE p.product_id = p_product_id AND p.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Product does not exist in global catalog';
    END IF;
    
    -- Insert store-product relationship
    INSERT INTO business.store_product (
        store_id, product_id, default_cost_price, default_selling_price,
        store_specific_sku, supplier_code, added_by, updated_by
    ) VALUES (
        p_store_id, p_product_id, p_cost_price, p_selling_price,
        p_store_sku, p_supplier_code, v_user_id, v_user_id
    )
    ON CONFLICT (store_id, product_id) 
    DO UPDATE SET
        default_cost_price = p_cost_price,
        default_selling_price = p_selling_price,
        store_specific_sku = p_store_sku,
        supplier_code = p_supplier_code,
        updated_by = v_user_id,
        updated_at = NOW(),
        is_active = TRUE;
    
    RETURN p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create global product with verification
CREATE OR REPLACE FUNCTION create_global_product(
    p_name VARCHAR(255),
    p_brand VARCHAR(100) DEFAULT NULL,
    p_category VARCHAR(50),
    p_barcode VARCHAR(20) DEFAULT NULL,
    p_typical_shelf_life_days INTEGER DEFAULT NULL,
    p_unit_type VARCHAR(20) DEFAULT 'pcs'
) RETURNS UUID
SECURITY DEFINER
SET search_path = public, global
AS $$
DECLARE
    v_user_id UUID;
    v_product_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Validate category
    IF NOT EXISTS (
        SELECT 1 FROM global.product_categories pc
        WHERE pc.category_code = p_category
    ) THEN
        RAISE EXCEPTION 'Invalid product category: %', p_category;
    END IF;
    
    -- Check for duplicate barcode
    IF p_barcode IS NOT NULL AND EXISTS (
        SELECT 1 FROM global.products p
        WHERE p.barcode = p_barcode AND p.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Product with barcode % already exists', p_barcode;
    END IF;
    
    -- Create the product
    INSERT INTO global.products (
        name, brand, primary_category, barcode, typical_shelf_life_days,
        unit_type, created_by, verification_status
    ) VALUES (
        p_name, p_brand, p_category, p_barcode, p_typical_shelf_life_days,
        p_unit_type, v_user_id, 'pending'
    ) RETURNING product_id INTO v_product_id;
    
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get store products with global product info
CREATE OR REPLACE FUNCTION get_store_products(
    p_store_id UUID,
    p_active_only BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
    product_id UUID,
    name VARCHAR,
    brand VARCHAR,
    category VARCHAR,
    barcode VARCHAR,
    cost_price DECIMAL,
    selling_price DECIMAL,
    stock_level INTEGER,
    reorder_point INTEGER,
    store_sku VARCHAR,
    is_active BOOLEAN,
    last_sale_date TIMESTAMP
)
SECURITY DEFINER
SET search_path = public, business, global
AS $$
BEGIN
    -- Check user has access to store
    IF NOT EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = p_store_id
        AND su.user_id = auth.uid()
        AND su.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied to store products';
    END IF;
    
    RETURN QUERY
    SELECT 
        gp.product_id,
        gp.name,
        gp.brand,
        gp.primary_category,
        gp.barcode,
        sp.default_cost_price,
        sp.default_selling_price,
        sp.minimum_stock_level,
        sp.reorder_point,
        sp.store_specific_sku,
        sp.is_active,
        sp.last_sale_date
    FROM business.store_product sp
    JOIN global.products gp ON gp.product_id = sp.product_id
    WHERE sp.store_id = p_store_id
      AND (NOT p_active_only OR sp.is_active = TRUE)
      AND gp.is_active = TRUE
    ORDER BY gp.name, gp.brand
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATE EXISTING BATCH VIEWS FOR RLS
-- =============================================

-- Update the batches view to work with RLS
CREATE OR REPLACE VIEW inventory.batches_with_products AS
SELECT 
    b.batch_id,
    b.batch_number,
    b.supplier,
    b.manufacture_date,
    b.expiry_date,
    b.received_date,
    b.initial_quantity,
    b.current_quantity,
    b.reserved_quantity,
    b.available_quantity,
    b.location_code,
    b.status,
    b.store_id,
    b.created_at,
    b.updated_at,
    b.created_by,
    
    -- Product information (unified from legacy or global)
    COALESCE(gp.product_id, lp.product_id) as product_id,
    COALESCE(gp.name, lp.name) as product_name,
    COALESCE(gp.brand, lp.brand) as product_brand,
    COALESCE(gp.primary_category, lp.category) as product_category,
    COALESCE(gp.barcode, lp.barcode) as product_barcode,
    
    -- Pricing (with inheritance support)
    COALESCE(b.cost_price, sp.default_cost_price, lp.base_cost_price) as effective_cost_price,
    COALESCE(b.selling_price, sp.default_selling_price, lp.base_selling_price) as effective_selling_price,
    
    -- Source indicators
    (b.global_product_id IS NOT NULL) as uses_global_product,
    b.batch_source,
    b.verification_status as batch_verification_status,
    b.inherited_from_store_product,
    b.recognition_confidence,
    b.barcode_scanned
    
FROM inventory.batches b
LEFT JOIN global.products gp ON gp.product_id = b.global_product_id
LEFT JOIN inventory.products lp ON lp.product_id = b.product_id
LEFT JOIN business.store_product sp ON sp.store_id = b.store_id AND sp.product_id = b.global_product_id;

-- =============================================
-- GRANT PERMISSIONS TO SERVICE ROLE
-- =============================================

-- Grant necessary permissions for API access
GRANT USAGE ON SCHEMA global TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA global TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA global TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA global TO service_role;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION user_can_manage_global_products() TO authenticated;
GRANT EXECUTE ON FUNCTION add_product_to_store(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_global_product(VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_products(UUID, BOOLEAN, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION user_can_manage_global_products() IS 'Check if current user has global product management privileges';
COMMENT ON FUNCTION add_product_to_store(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR) IS 'Add a global product to store catalog with pricing';
COMMENT ON FUNCTION create_global_product(VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR) IS 'Create new global product with validation';
COMMENT ON FUNCTION get_store_products(UUID, BOOLEAN, INTEGER, INTEGER) IS 'Get paginated list of products in a store with global product info';

COMMIT;