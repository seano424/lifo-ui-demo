-- Migration: 019_update_batches_global_product_reference.sql
-- Phase 2: Update inventory.batches to reference global products
-- This migration maintains backward compatibility while adding global product support

BEGIN;

-- =============================================
-- UPDATE INVENTORY.BATCHES TABLE STRUCTURE
-- =============================================

-- Add global product reference and pricing inheritance flags
ALTER TABLE inventory.batches 
    ADD COLUMN global_product_id UUID REFERENCES global.products(product_id),
    ADD COLUMN inherited_from_store_product BOOLEAN DEFAULT TRUE;

-- Update existing pricing columns to be optional (can inherit from store_product)
ALTER TABLE inventory.batches 
    ALTER COLUMN cost_price DROP NOT NULL,
    ALTER COLUMN selling_price DROP NOT NULL;

-- Add new columns for enhanced batch tracking
ALTER TABLE inventory.batches
    ADD COLUMN batch_source VARCHAR(50) DEFAULT 'manual',  -- manual, ocr, barcode, import
    ADD COLUMN recognition_confidence DECIMAL(3,2),        -- For OCR/barcode recognized batches
    ADD COLUMN verification_status VARCHAR(20) DEFAULT 'verified', -- verified, pending, flagged
    ADD COLUMN barcode_scanned VARCHAR(50),                -- Barcode used to create this batch
    ADD COLUMN ocr_session_id UUID REFERENCES global.ocr_extraction_log(log_id);

-- =============================================
-- ADD CONSTRAINTS AND CHECKS
-- =============================================

-- Ensure batch has either legacy product_id or new global_product_id
ALTER TABLE inventory.batches
    ADD CONSTRAINT batches_product_reference_check 
    CHECK (product_id IS NOT NULL OR global_product_id IS NOT NULL);

-- Ensure pricing is available either directly or through inheritance
ALTER TABLE inventory.batches
    ADD CONSTRAINT batches_pricing_availability_check
    CHECK (
        (cost_price IS NOT NULL AND selling_price IS NOT NULL) OR
        (inherited_from_store_product = TRUE AND global_product_id IS NOT NULL)
    );

-- Validation constraints
ALTER TABLE inventory.batches
    ADD CONSTRAINT batches_source_check 
    CHECK (batch_source IN ('manual', 'ocr', 'barcode', 'import', 'api')),
    
    ADD CONSTRAINT batches_verification_check
    CHECK (verification_status IN ('verified', 'pending', 'flagged', 'rejected')),
    
    ADD CONSTRAINT batches_confidence_range_check
    CHECK (recognition_confidence IS NULL OR (recognition_confidence >= 0.0 AND recognition_confidence <= 1.0));

-- =============================================
-- NEW INDEXES FOR PERFORMANCE
-- =============================================

-- Core global product lookups
CREATE INDEX idx_batches_global_product ON inventory.batches(global_product_id);
CREATE INDEX idx_batches_store_global ON inventory.batches(store_id, global_product_id);

-- Source and verification tracking
CREATE INDEX idx_batches_source ON inventory.batches(batch_source);
CREATE INDEX idx_batches_verification ON inventory.batches(verification_status) WHERE verification_status != 'verified';
CREATE INDEX idx_batches_barcode ON inventory.batches(barcode_scanned) WHERE barcode_scanned IS NOT NULL;

-- Pricing inheritance tracking
CREATE INDEX idx_batches_inherited_pricing ON inventory.batches(inherited_from_store_product, global_product_id)
    WHERE inherited_from_store_product = TRUE;

-- OCR session tracking
CREATE INDEX idx_batches_ocr_session ON inventory.batches(ocr_session_id) WHERE ocr_session_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_batches_store_global_status ON inventory.batches(store_id, global_product_id, status)
    WHERE global_product_id IS NOT NULL;

-- =============================================
-- CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get effective product pricing (store default or batch override)
CREATE OR REPLACE FUNCTION get_effective_batch_pricing(p_batch_id UUID)
RETURNS TABLE(
    cost_price DECIMAL(12,4), 
    selling_price DECIMAL(12,4),
    source VARCHAR(20)
) 
SECURITY DEFINER
SET search_path = public, inventory, business
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN b.cost_price IS NOT NULL THEN b.cost_price
            WHEN sp.default_cost_price IS NOT NULL THEN sp.default_cost_price
            ELSE 0::DECIMAL(12,4)
        END as cost_price,
        CASE 
            WHEN b.selling_price IS NOT NULL THEN b.selling_price
            WHEN sp.default_selling_price IS NOT NULL THEN sp.default_selling_price
            ELSE 0::DECIMAL(12,4)
        END as selling_price,
        CASE 
            WHEN b.cost_price IS NOT NULL AND b.selling_price IS NOT NULL THEN 'batch_override'
            WHEN sp.default_cost_price IS NOT NULL THEN 'store_default'
            ELSE 'fallback'
        END as source
    FROM inventory.batches b
    LEFT JOIN business.store_product sp ON sp.store_id = b.store_id AND sp.product_id = b.global_product_id
    WHERE b.batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch with product information (supports both legacy and global products)
CREATE OR REPLACE FUNCTION get_batch_with_product_info(p_batch_id UUID)
RETURNS TABLE(
    batch_id UUID,
    batch_number VARCHAR,
    store_id UUID,
    product_name VARCHAR,
    brand VARCHAR,
    category VARCHAR,
    expiry_date DATE,
    current_quantity DECIMAL,
    cost_price DECIMAL,
    selling_price DECIMAL,
    pricing_source VARCHAR,
    is_global_product BOOLEAN
)
SECURITY DEFINER
SET search_path = public, inventory, business, global
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.batch_id,
        b.batch_number,
        b.store_id,
        COALESCE(gp.name, lp.name) as product_name,
        COALESCE(gp.brand, lp.brand) as brand,
        COALESCE(gp.primary_category, lp.category) as category,
        b.expiry_date,
        b.current_quantity,
        pricing.cost_price,
        pricing.selling_price,
        pricing.source as pricing_source,
        (b.global_product_id IS NOT NULL) as is_global_product
    FROM inventory.batches b
    LEFT JOIN global.products gp ON gp.product_id = b.global_product_id
    LEFT JOIN inventory.products lp ON lp.product_id = b.product_id
    LEFT JOIN LATERAL get_effective_batch_pricing(b.batch_id) pricing ON true
    WHERE b.batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search global products with fuzzy matching
CREATE OR REPLACE FUNCTION search_global_products_fuzzy(
    search_term TEXT,
    p_store_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20
) RETURNS TABLE(
    product_id UUID,
    name VARCHAR,
    brand VARCHAR,
    category VARCHAR,
    barcode VARCHAR,
    similarity_score REAL,
    available_in_store BOOLEAN,
    store_cost_price DECIMAL,
    store_selling_price DECIMAL
) 
SECURITY DEFINER
SET search_path = public, global, business
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id,
        p.name,
        p.brand,
        p.primary_category,
        p.barcode,
        GREATEST(
            ts_rank(p.search_vector, plainto_tsquery('english', search_term)),
            CASE 
                WHEN p.name ILIKE '%' || search_term || '%' THEN 0.8
                WHEN p.brand ILIKE '%' || search_term || '%' THEN 0.6
                ELSE 0.0
            END
        ) as similarity_score,
        (sp.store_id IS NOT NULL) as available_in_store,
        sp.default_cost_price as store_cost_price,
        sp.default_selling_price as store_selling_price
    FROM global.products p
    LEFT JOIN business.store_product sp ON sp.product_id = p.product_id AND sp.store_id = p_store_id
    WHERE p.is_active = TRUE
      AND (
          p.search_vector @@ plainto_tsquery('english', search_term)
          OR p.name ILIKE '%' || search_term || '%'
          OR p.brand ILIKE '%' || search_term || '%'
          OR p.barcode = search_term
      )
    ORDER BY similarity_score DESC, p.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find product by barcode
CREATE OR REPLACE FUNCTION find_product_by_barcode(
    p_barcode VARCHAR,
    p_store_id UUID DEFAULT NULL
) RETURNS TABLE(
    product_id UUID,
    name VARCHAR,
    brand VARCHAR,
    category VARCHAR,
    typical_shelf_life_days INTEGER,
    available_in_store BOOLEAN,
    store_cost_price DECIMAL,
    store_selling_price DECIMAL
)
SECURITY DEFINER
SET search_path = public, global, business
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id,
        p.name,
        p.brand,
        p.primary_category,
        p.typical_shelf_life_days,
        (sp.store_id IS NOT NULL) as available_in_store,
        sp.default_cost_price as store_cost_price,
        sp.default_selling_price as store_selling_price
    FROM global.products p
    LEFT JOIN business.store_product sp ON sp.product_id = p.product_id AND sp.store_id = p_store_id
    WHERE p.barcode = p_barcode AND p.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE VIEW FOR BACKWARD COMPATIBILITY
-- =============================================

-- View that provides unified access to both legacy and global products in batches
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
    b.verification_status,
    b.inherited_from_store_product
    
FROM inventory.batches b
LEFT JOIN global.products gp ON gp.product_id = b.global_product_id
LEFT JOIN inventory.products lp ON lp.product_id = b.product_id
LEFT JOIN business.store_product sp ON sp.store_id = b.store_id AND sp.product_id = b.global_product_id;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN inventory.batches.global_product_id IS 'Reference to global product catalog (new normalized approach)';
COMMENT ON COLUMN inventory.batches.inherited_from_store_product IS 'True if prices are inherited from store_product defaults';
COMMENT ON COLUMN inventory.batches.batch_source IS 'How this batch was created: manual, ocr, barcode, import, api';
COMMENT ON COLUMN inventory.batches.recognition_confidence IS 'Confidence score for OCR/barcode recognition (0.0-1.0)';
COMMENT ON COLUMN inventory.batches.verification_status IS 'Verification status: verified, pending, flagged, rejected';
COMMENT ON COLUMN inventory.batches.barcode_scanned IS 'Barcode used to identify product when creating this batch';
COMMENT ON COLUMN inventory.batches.ocr_session_id IS 'Reference to OCR session that created this batch';

COMMENT ON FUNCTION get_effective_batch_pricing(UUID) IS 'Returns effective pricing for a batch (batch override or store default)';
COMMENT ON FUNCTION get_batch_with_product_info(UUID) IS 'Returns batch with complete product information from global or legacy sources';
COMMENT ON FUNCTION search_global_products_fuzzy(TEXT, UUID, INTEGER) IS 'Fuzzy search for global products with store availability info';
COMMENT ON FUNCTION find_product_by_barcode(VARCHAR, UUID) IS 'Find product by barcode with store-specific pricing';

COMMENT ON VIEW inventory.batches_with_products IS 'Unified view of batches with product info supporting both legacy and global products';

COMMIT;