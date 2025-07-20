-- Migration: 018_create_global_product_schema.sql
-- Phase 1: Create new global schema foundation for normalized products
-- This migration creates the foundation without breaking existing functionality

BEGIN;

-- =============================================
-- CREATE GLOBAL SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS global;

-- Enable UUID extension for global schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- GLOBAL PRODUCTS TABLE
-- =============================================

CREATE TABLE global.products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification fields (prepared for OCR/barcode)
    barcode VARCHAR(20) UNIQUE,              -- EAN13, UPC, Code128, etc.
    sku VARCHAR(100),                        -- Global SKU (optional)
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(50),
    
    -- OCR and Image Recognition fields
    image_url VARCHAR(500),                  -- Product image for recognition training
    ocr_keywords TEXT[],                     -- Keywords for OCR matching
    alternative_names TEXT[],                -- Common name variations
    
    -- Product characteristics
    typical_shelf_life_days INTEGER,
    unit_type VARCHAR(20) DEFAULT 'pcs',
    standard_weight_grams INTEGER,           -- For weight-based calculations
    standard_volume_ml INTEGER,              -- For volume-based calculations
    
    -- Categorization (enhanced for AI scoring)
    primary_category VARCHAR(50),            -- Maps to existing scoring categories
    sub_category VARCHAR(50),
    dietary_attributes JSONB DEFAULT '{}',   -- {"vegan": true, "gluten_free": false}
    
    -- Metadata for OCR/Barcode functionality
    manufacturer VARCHAR(100),
    country_of_origin VARCHAR(50),
    product_description TEXT,
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(name, '') || ' ' || 
            COALESCE(brand, '') || ' ' || 
            COALESCE(manufacturer, '') || ' ' ||
            array_to_string(COALESCE(alternative_names, ARRAY[]::TEXT[]), ' ')
        )
    ) STORED,
    
    -- Global product status
    is_active BOOLEAN DEFAULT TRUE,
    verification_status VARCHAR(20) DEFAULT 'pending',  -- pending, verified, flagged
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),         -- First user who added this product
    
    -- Constraints
    CONSTRAINT global_products_category_check CHECK (primary_category IN (
        'fresh_produce', 'fresh_meat_fish', 'dairy', 'bakery_fresh',
        'deli_prepared', 'frozen', 'chilled_packaged', 'pantry_staples',
        'canned_jarred', 'dry_goods', 'beverages', 'spices_condiments'
    )),
    
    CONSTRAINT global_products_verification_check CHECK (verification_status IN (
        'pending', 'verified', 'flagged', 'rejected'
    )),
    
    CONSTRAINT global_products_shelf_life_check CHECK (
        typical_shelf_life_days IS NULL OR typical_shelf_life_days > 0
    )
);

-- =============================================
-- GLOBAL PRODUCTS INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX idx_global_products_barcode ON global.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_global_products_search ON global.products USING GIN(search_vector);
CREATE INDEX idx_global_products_category ON global.products(primary_category);
CREATE INDEX idx_global_products_brand ON global.products(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_global_products_active ON global.products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_global_products_name ON global.products(name);
CREATE INDEX idx_global_products_created ON global.products(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_global_products_category_active ON global.products(primary_category, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_global_products_brand_category ON global.products(brand, primary_category) 
    WHERE brand IS NOT NULL;

-- =============================================
-- BUSINESS.STORE_PRODUCT JUNCTION TABLE
-- =============================================

CREATE TABLE business.store_product (
    store_id UUID REFERENCES business.stores(store_id) ON DELETE CASCADE,
    product_id UUID REFERENCES global.products(product_id) ON DELETE CASCADE,
    
    -- Store-specific pricing (replaces product-level pricing)
    default_cost_price DECIMAL(12,4) NOT NULL,
    default_selling_price DECIMAL(12,4) NOT NULL,
    
    -- Store-specific inventory management
    is_active BOOLEAN DEFAULT TRUE,
    minimum_stock_level INTEGER DEFAULT 0,
    maximum_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 5,
    
    -- Store-specific product settings
    store_specific_sku VARCHAR(100),         -- Store's internal SKU if different
    supplier_code VARCHAR(50),               -- Store's supplier reference
    storage_location VARCHAR(50),            -- Default storage location in store
    
    -- Pricing history and markup
    markup_percentage DECIMAL(5,2),          -- Store's typical markup for this product
    last_cost_update TIMESTAMP WITH TIME ZONE,   -- When cost price was last updated
    price_change_reason VARCHAR(100),        -- Reason for last price change
    
    -- Store performance metrics for this product
    total_sold_units INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,4) DEFAULT 0,
    last_sale_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit and tracking
    added_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (store_id, product_id),
    
    -- Constraints
    CONSTRAINT store_product_cost_price_positive CHECK (default_cost_price > 0),
    CONSTRAINT store_product_selling_price_positive CHECK (default_selling_price > 0),
    CONSTRAINT store_product_margin_sensible CHECK (default_selling_price >= default_cost_price),
    CONSTRAINT store_product_stock_levels_logical CHECK (
        minimum_stock_level >= 0 AND 
        (maximum_stock_level IS NULL OR maximum_stock_level >= minimum_stock_level) AND
        reorder_point >= 0
    )
);

-- =============================================
-- STORE_PRODUCT INDEXES
-- =============================================

CREATE INDEX idx_store_product_store ON business.store_product(store_id);
CREATE INDEX idx_store_product_product ON business.store_product(product_id);
CREATE INDEX idx_store_product_active ON business.store_product(store_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_store_product_prices ON business.store_product(store_id, default_cost_price, default_selling_price);
CREATE INDEX idx_store_product_reorder ON business.store_product(store_id, reorder_point) WHERE is_active = TRUE;
CREATE INDEX idx_store_product_sku ON business.store_product(store_specific_sku) WHERE store_specific_sku IS NOT NULL;

-- =============================================
-- PRODUCT CATEGORIES REFERENCE TABLE
-- =============================================

CREATE TABLE global.product_categories (
    category_code VARCHAR(50) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT,
    
    -- OCR Recognition hints
    common_keywords TEXT[],                  -- Keywords commonly found on packages
    typical_shelf_life_range JSONB,          -- {"min_days": 1, "max_days": 7}
    
    -- Scoring defaults (links to existing scoring.category_weights)
    default_spoilage_risk_weight DECIMAL(3,2) DEFAULT 0.5,
    default_turnover_speed_weight DECIMAL(3,2) DEFAULT 0.3,
    default_value_impact_weight DECIMAL(3,2) DEFAULT 0.2,
    
    -- Storage and handling
    requires_refrigeration BOOLEAN DEFAULT FALSE,
    requires_freezing BOOLEAN DEFAULT FALSE,
    typical_storage_temp_min DECIMAL(4,1),
    typical_storage_temp_max DECIMAL(4,1),
    
    -- Regulatory and compliance
    requires_expiry_date BOOLEAN DEFAULT TRUE,
    allows_donation BOOLEAN DEFAULT TRUE,
    high_risk_category BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT category_weights_sum_check CHECK (
        default_spoilage_risk_weight + default_turnover_speed_weight + default_value_impact_weight <= 1.0
    ),
    CONSTRAINT category_weights_positive CHECK (
        default_spoilage_risk_weight >= 0 AND 
        default_turnover_speed_weight >= 0 AND 
        default_value_impact_weight >= 0
    )
);

-- =============================================
-- INSERT PRODUCT CATEGORIES DATA
-- =============================================

INSERT INTO global.product_categories (
    category_code, category_name, category_description, common_keywords, typical_shelf_life_range,
    requires_refrigeration, requires_expiry_date, allows_donation, high_risk_category,
    default_spoilage_risk_weight, default_turnover_speed_weight, default_value_impact_weight
) VALUES 
(
    'fresh_produce', 'Fresh Produce', 
    'Fresh fruits, vegetables, herbs, and salads requiring careful handling and quick turnover',
    ARRAY['fresh', 'organic', 'fruit', 'vegetable', 'salad', 'herbs', 'produce'],
    '{"min_days": 1, "max_days": 14}',
    FALSE, TRUE, TRUE, FALSE,
    0.6, 0.3, 0.1
),
(
    'fresh_meat_fish', 'Fresh Meat & Fish',
    'Fresh meat, poultry, and fish products with high spoilage risk',
    ARRAY['fresh', 'meat', 'fish', 'poultry', 'beef', 'chicken', 'salmon', 'pork'],
    '{"min_days": 1, "max_days": 5}',
    TRUE, TRUE, FALSE, TRUE,
    0.7, 0.2, 0.1
),
(
    'dairy', 'Dairy Products',
    'Milk, cheese, yogurt, and other dairy products requiring refrigeration',
    ARRAY['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy'],
    '{"min_days": 3, "max_days": 21}',
    TRUE, TRUE, TRUE, FALSE,
    0.5, 0.3, 0.2
),
(
    'bakery_fresh', 'Fresh Bakery',
    'Fresh bread, pastries, and baked goods with short shelf life',
    ARRAY['bread', 'bakery', 'fresh', 'baked', 'croissant', 'pastry', 'baguette'],
    '{"min_days": 1, "max_days": 7}',
    FALSE, TRUE, TRUE, FALSE,
    0.6, 0.3, 0.1
),
(
    'deli_prepared', 'Deli & Prepared Foods',
    'Ready-to-eat prepared foods and deli items',
    ARRAY['deli', 'prepared', 'ready', 'sandwich', 'salad'],
    '{"min_days": 1, "max_days": 3}',
    TRUE, TRUE, TRUE, TRUE,
    0.7, 0.2, 0.1
),
(
    'frozen', 'Frozen Products',
    'Frozen foods with extended shelf life when properly stored',
    ARRAY['frozen', 'ice', 'gelato', 'ice cream'],
    '{"min_days": 30, "max_days": 730}',
    FALSE, TRUE, TRUE, FALSE,
    0.2, 0.4, 0.4
),
(
    'chilled_packaged', 'Chilled Packaged Foods',
    'Packaged foods requiring refrigeration but with moderate shelf life',
    ARRAY['chilled', 'refrigerated', 'packaged'],
    '{"min_days": 7, "max_days": 30}',
    TRUE, TRUE, TRUE, FALSE,
    0.4, 0.3, 0.3
),
(
    'pantry_staples', 'Pantry Staples',
    'Dry goods, grains, and shelf-stable pantry items',
    ARRAY['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar'],
    '{"min_days": 180, "max_days": 1095}',
    FALSE, TRUE, TRUE, FALSE,
    0.1, 0.3, 0.6
),
(
    'canned_jarred', 'Canned & Jarred',
    'Canned goods, jars, and preserved foods with long shelf life',
    ARRAY['canned', 'jar', 'conserve', 'preserve', 'tin'],
    '{"min_days": 365, "max_days": 1825}',
    FALSE, TRUE, TRUE, FALSE,
    0.1, 0.2, 0.7
),
(
    'dry_goods', 'Dry Goods',
    'Dried foods, nuts, snacks, and shelf-stable items',
    ARRAY['dried', 'nuts', 'snacks', 'cereal', 'crackers'],
    '{"min_days": 90, "max_days": 545}',
    FALSE, TRUE, TRUE, FALSE,
    0.2, 0.3, 0.5
),
(
    'beverages', 'Beverages',
    'Drinks, juices, and liquid refreshments',
    ARRAY['drink', 'juice', 'water', 'soda', 'beverage', 'wine', 'beer'],
    '{"min_days": 30, "max_days": 730}',
    FALSE, TRUE, TRUE, FALSE,
    0.2, 0.4, 0.4
),
(
    'spices_condiments', 'Spices & Condiments',
    'Spices, seasonings, sauces, and condiments',
    ARRAY['spice', 'sauce', 'condiment', 'seasoning', 'herb'],
    '{"min_days": 365, "max_days": 1095}',
    FALSE, TRUE, TRUE, FALSE,
    0.1, 0.2, 0.7
);

-- =============================================
-- BARCODE AND OCR SUPPORT TABLES
-- =============================================

-- Barcode format reference
CREATE TABLE global.barcode_formats (
    format_code VARCHAR(20) PRIMARY KEY,
    format_name VARCHAR(50) NOT NULL,
    format_description TEXT,
    regex_pattern VARCHAR(100),              -- Validation pattern
    typical_length INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO global.barcode_formats VALUES
('EAN13', 'European Article Number 13', 'Most common barcode format in Europe', '^[0-9]{13}$', 13, TRUE, NOW()),
('UPC', 'Universal Product Code', 'Common in North America', '^[0-9]{12}$', 12, TRUE, NOW()),
('EAN8', 'European Article Number 8', 'Short format for small packages', '^[0-9]{8}$', 8, TRUE, NOW()),
('CODE128', 'Code 128', 'High-density linear barcode', NULL, NULL, TRUE, NOW()),
('QR', 'QR Code', '2D matrix barcode', NULL, NULL, TRUE, NOW());

-- OCR extraction log (for training and improvement)
CREATE TABLE global.ocr_extraction_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES global.products(product_id),
    
    -- OCR session details
    image_url VARCHAR(500),
    extracted_text TEXT,
    confidence_score DECIMAL(3,2),           -- 0.00 to 1.00
    processing_time_ms INTEGER,
    
    -- Extracted data
    detected_barcode VARCHAR(50),
    detected_expiry_date DATE,
    detected_product_name VARCHAR(255),
    detected_brand VARCHAR(100),
    
    -- Validation results
    barcode_match BOOLEAN,
    name_match_score DECIMAL(3,2),
    manual_verification BOOLEAN,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Context
    store_id UUID REFERENCES business.stores(store_id),
    extracted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ocr_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CONSTRAINT ocr_match_score_range CHECK (name_match_score IS NULL OR (name_match_score >= 0.0 AND name_match_score <= 1.0))
);

-- =============================================
-- OCR LOG INDEXES
-- =============================================

CREATE INDEX idx_ocr_log_product ON global.ocr_extraction_log(product_id);
CREATE INDEX idx_ocr_log_store ON global.ocr_extraction_log(store_id);
CREATE INDEX idx_ocr_log_confidence ON global.ocr_extraction_log(confidence_score);
CREATE INDEX idx_ocr_log_created ON global.ocr_extraction_log(created_at);
CREATE INDEX idx_ocr_log_barcode ON global.ocr_extraction_log(detected_barcode) WHERE detected_barcode IS NOT NULL;

-- =============================================
-- AUTOMATIC TIMESTAMPS TRIGGERS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_global_products_updated_at
    BEFORE UPDATE ON global.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_product_updated_at
    BEFORE UPDATE ON business.store_product
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON global.product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON SCHEMA global IS 'Global product catalog and shared resources for all stores';
COMMENT ON TABLE global.products IS 'Centralized product catalog with OCR and barcode support';
COMMENT ON TABLE business.store_product IS 'Store-specific product pricing and inventory settings';
COMMENT ON TABLE global.product_categories IS 'Enhanced product categories with OCR hints and scoring defaults';
COMMENT ON TABLE global.barcode_formats IS 'Supported barcode formats for product identification';
COMMENT ON TABLE global.ocr_extraction_log IS 'OCR processing history for training and improvement';

COMMENT ON COLUMN global.products.search_vector IS 'Full-text search index for product discovery';
COMMENT ON COLUMN global.products.verification_status IS 'Product verification status: pending, verified, flagged, rejected';
COMMENT ON COLUMN global.products.dietary_attributes IS 'JSON object with dietary attributes like vegan, gluten_free, etc.';

COMMIT;