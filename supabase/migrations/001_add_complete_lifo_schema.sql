-- =============================================
-- LIFO.AI Complete Database Schema Migration
-- Extends existing user_mgmt, inventory, scoring schemas
-- Adds business schema, time series, analytics
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BUSINESS/STORES SCHEMA - CRITICAL FOUNDATION
-- =============================================
CREATE SCHEMA IF NOT EXISTS business;

-- Core stores table (multi-tenant foundation)
CREATE TABLE IF NOT EXISTS business.stores (
    store_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(255) NOT NULL,
    store_code VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255),
    
    -- Location
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    
    -- Business details
    store_type VARCHAR(50) CHECK (store_type IN ('supermarket', 'convenience', 'restaurant', 'bakery', 'butcher', 'organic')),
    size_category VARCHAR(20) CHECK (size_category IN ('small', 'medium', 'large', 'hypermarket')),
    
    -- Configuration
    default_markup_percent DECIMAL(5,2) DEFAULT 30.00,
    waste_reduction_target_percent DECIMAL(5,2) DEFAULT 25.00,
    
    -- Ownership & Access
    owner_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Store staff access and permissions
CREATE TABLE IF NOT EXISTS business.store_users (
    store_id UUID REFERENCES business.stores(store_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_in_store VARCHAR(50) CHECK (role_in_store IN ('owner', 'manager', 'staff', 'viewer')) DEFAULT 'staff',
    permissions JSONB DEFAULT '{"can_upload_inventory": true, "can_apply_discounts": false, "can_view_analytics": true}',
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (store_id, user_id)
);

-- Store configuration
CREATE TABLE IF NOT EXISTS business.store_settings (
    store_id UUID PRIMARY KEY REFERENCES business.stores(store_id) ON DELETE CASCADE,
    scoring_weights JSONB DEFAULT '{"expiry": 0.5, "velocity": 0.3, "margin": 0.2}',
    critical_threshold DECIMAL(3,2) DEFAULT 0.80,
    warning_threshold DECIMAL(3,2) DEFAULT 0.60,
    opening_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "20:00"}}',
    peak_hours JSONB DEFAULT '{"morning": "08:00-10:00", "evening": "17:00-19:00"}',
    weather_location_lat DECIMAL(10,8),
    weather_location_lon DECIMAL(11,8),
    currency VARCHAR(3) DEFAULT 'EUR',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ADD STORE_ID TO EXISTING TABLES (preserve existing data)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE inventory.products ADD COLUMN store_id UUID REFERENCES business.stores(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'batches' AND column_name = 'store_id') THEN
        ALTER TABLE inventory.batches ADD COLUMN store_id UUID REFERENCES business.stores(store_id);
    END IF;
END $$;

-- =============================================
-- TIME SERIES SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS timeseries;

-- Inventory snapshots for pattern analysis
CREATE TABLE IF NOT EXISTS timeseries.inventory_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id),
    store_id UUID REFERENCES business.stores(store_id),
    sku VARCHAR(100),
    quantity DECIMAL(12,4),
    price DECIMAL(12,4),
    days_to_expiry INTEGER,
    snapshot_timestamp TIMESTAMP DEFAULT NOW(),
    day_of_week INTEGER,
    hour_of_day INTEGER,
    is_weekend BOOLEAN,
    temperature DECIMAL(5,2),
    is_holiday BOOLEAN
);

-- Sales events tracking
CREATE TABLE IF NOT EXISTS timeseries.sales_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id),
    store_id UUID REFERENCES business.stores(store_id),
    sku VARCHAR(100),
    quantity_sold DECIMAL(12,4),
    sale_price DECIMAL(12,4),
    sale_timestamp TIMESTAMP DEFAULT NOW(),
    channel VARCHAR(50) DEFAULT 'in_store',
    customer_type VARCHAR(50) DEFAULT 'regular'
);

-- External factors for correlation analysis
CREATE TABLE IF NOT EXISTS timeseries.external_factors (
    factor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES business.stores(store_id),
    recorded_at TIMESTAMP DEFAULT NOW(),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    is_rainy BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    local_events TEXT[],
    day_of_week INTEGER,
    hour_of_day INTEGER,
    week_of_year INTEGER
);

-- Standard PostgreSQL time series optimizations
-- Using proper indexing strategies for time-based queries
-- For time series aggregations, use standard PostgreSQL functions:
-- - date_trunc() instead of time_bucket()
-- - window functions instead of continuous aggregates
-- - regular views/materialized views for pre-computed aggregations

-- =============================================
-- SCORING & ANALYTICS SCHEMA
-- =============================================

-- Product scores results
CREATE TABLE IF NOT EXISTS scoring.product_scores (
    score_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id),
    store_id UUID REFERENCES business.stores(store_id),
    expiry_score DECIMAL(3,2),
    velocity_score DECIMAL(3,2),
    margin_score DECIMAL(3,2),
    composite_score DECIMAL(3,2),
    recommendation VARCHAR(50),
    ml_enhanced BOOLEAN DEFAULT FALSE,
    confidence_level DECIMAL(3,2),
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(batch_id)
);

CREATE SCHEMA IF NOT EXISTS analytics;

-- Actions taken and their results
CREATE TABLE IF NOT EXISTS analytics.actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id),
    store_id UUID REFERENCES business.stores(store_id),
    action_type VARCHAR(50), -- discount_aggressive, discount_moderate, alert, remove
    original_price DECIMAL(12,4),
    new_price DECIMAL(12,4),
    discount_percent DECIMAL(5,2),
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by UUID REFERENCES auth.users(id),
    
    -- Results tracking (updated later)
    quantity_sold_24h DECIMAL(12,4),
    quantity_sold_48h DECIMAL(12,4),
    revenue_recovered DECIMAL(12,4),
    effectiveness_score DECIMAL(3,2)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Business indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner ON business.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_active ON business.stores(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_store_users_store ON business.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON business.store_users(user_id);

-- Multi-tenant inventory indexes
CREATE INDEX IF NOT EXISTS idx_products_store ON inventory.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON inventory.products(store_id, category);
CREATE INDEX IF NOT EXISTS idx_batches_store ON inventory.batches(store_id);
CREATE INDEX IF NOT EXISTS idx_batches_store_status ON inventory.batches(store_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_store_expiry ON inventory.batches(store_id, expiry_date) WHERE status = 'active';

-- Time series indexes (Standard PostgreSQL optimization)
CREATE INDEX IF NOT EXISTS idx_snapshots_store_time ON timeseries.inventory_snapshots(store_id, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_store_time ON timeseries.sales_events(store_id, sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_factors_store_time ON timeseries.external_factors(store_id, recorded_at);

-- Additional time series performance indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON timeseries.inventory_snapshots(snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON timeseries.sales_events(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_factors_timestamp ON timeseries.external_factors(recorded_at);

-- Composite indexes for common time series queries
CREATE INDEX IF NOT EXISTS idx_snapshots_sku_time ON timeseries.inventory_snapshots(sku, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_sku_time ON timeseries.sales_events(sku, sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_batch_time ON timeseries.inventory_snapshots(batch_id, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_batch_time ON timeseries.sales_events(batch_id, sale_timestamp);

-- Scoring indexes
CREATE INDEX IF NOT EXISTS idx_scores_store_batch ON scoring.product_scores(store_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_scores_composite ON scoring.product_scores(composite_score) WHERE composite_score >= 0.6;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_actions_store_time ON analytics.actions(store_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_actions_batch ON analytics.actions(batch_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE business.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.store_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'products') THEN
        ALTER TABLE inventory.products ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'batches') THEN
        ALTER TABLE inventory.batches ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

ALTER TABLE scoring.product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.actions ENABLE ROW LEVEL SECURITY;

-- Helper function for store access
CREATE OR REPLACE FUNCTION user_has_store_access(target_store_id UUID, required_role TEXT DEFAULT 'staff')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = target_store_id
        AND su.user_id = auth.uid()
        AND su.is_active = TRUE
        AND (
            su.role_in_store = 'owner' OR
            su.role_in_store = 'manager' OR
            (required_role = 'staff' AND su.role_in_store IN ('staff', 'viewer'))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view stores they have access to" ON business.stores
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert stores they own" ON business.stores
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update stores they own" ON business.stores
    FOR UPDATE USING (owner_id = auth.uid());

-- Store users policies
CREATE POLICY "Users can view store_users for their stores" ON business.store_users
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store owners can manage store_users" ON business.store_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business.stores s 
            WHERE s.store_id = store_users.store_id 
            AND s.owner_id = auth.uid()
        )
    );

-- Inventory policies (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'products') THEN
        DROP POLICY IF EXISTS "Users can view inventory from their stores" ON inventory.products;
        CREATE POLICY "Users can view inventory from their stores" ON inventory.products
            FOR SELECT USING (user_has_store_access(store_id));
        
        DROP POLICY IF EXISTS "Users can modify inventory in their stores" ON inventory.products;
        CREATE POLICY "Users can modify inventory in their stores" ON inventory.products
            FOR ALL USING (user_has_store_access(store_id, 'staff'));
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'batches') THEN
        DROP POLICY IF EXISTS "Users can view batches from their stores" ON inventory.batches;
        CREATE POLICY "Users can view batches from their stores" ON inventory.batches
            FOR SELECT USING (user_has_store_access(store_id));
        
        DROP POLICY IF EXISTS "Users can modify batches in their stores" ON inventory.batches;
        CREATE POLICY "Users can modify batches in their stores" ON inventory.batches
            FOR ALL USING (user_has_store_access(store_id, 'staff'));
    END IF;
END $$;

-- Scoring policies
CREATE POLICY "Users can view scores from their stores" ON scoring.product_scores
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert scores for their stores" ON scoring.product_scores
    FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Users can update scores for their stores" ON scoring.product_scores
    FOR UPDATE USING (user_has_store_access(store_id, 'staff'));

-- Analytics policies
CREATE POLICY "Users can view actions from their stores" ON analytics.actions
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert actions for their stores" ON analytics.actions
    FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

-- =============================================
-- MATERIALIZED VIEWS FOR TIME SERIES ANALYTICS
-- (PostgreSQL alternative to TimescaleDB continuous aggregates)
-- =============================================

-- Daily inventory snapshots summary
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_inventory_summary AS
SELECT 
    store_id,
    sku,
    date_trunc('day', snapshot_timestamp) as snapshot_date,
    AVG(quantity) as avg_quantity,
    MIN(quantity) as min_quantity,
    MAX(quantity) as max_quantity,
    AVG(days_to_expiry) as avg_days_to_expiry,
    COUNT(*) as snapshot_count
FROM timeseries.inventory_snapshots
GROUP BY store_id, sku, date_trunc('day', snapshot_timestamp);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_summary_store_date ON analytics.daily_inventory_summary(store_id, snapshot_date);

-- Daily sales summary
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_sales_summary AS
SELECT 
    store_id,
    sku,
    date_trunc('day', sale_timestamp) as sale_date,
    SUM(quantity_sold) as total_quantity_sold,
    SUM(quantity_sold * sale_price) as total_revenue,
    AVG(sale_price) as avg_sale_price,
    COUNT(*) as transaction_count
FROM timeseries.sales_events
GROUP BY store_id, sku, date_trunc('day', sale_timestamp);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_sales_store_date ON analytics.daily_sales_summary(store_id, sale_date);

-- Note: Refresh materialized views periodically with:
-- REFRESH MATERIALIZED VIEW analytics.daily_inventory_summary;
-- REFRESH MATERIALIZED VIEW analytics.daily_sales_summary;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert comprehensive category weights
INSERT INTO scoring.category_weights (category, spoilage_risk_weight, value_impact_weight, turnover_speed_weight, description) VALUES
('fresh_produce', 0.600, 0.200, 0.200, 'Fresh fruits, vegetables, herbs - highest spoilage risk'),
('fresh_meat_fish', 0.650, 0.250, 0.100, 'Raw meat, poultry, seafood - critical spoilage and safety'),
('bakery_fresh', 0.550, 0.300, 0.150, 'Fresh bread, pastries, cakes - daily turnover'),
('dairy', 0.450, 0.300, 0.250, 'Milk, yogurt, cheese, eggs - moderate spoilage risk'),
('deli_prepared', 0.500, 0.300, 0.200, 'Prepared salads, sandwiches, ready meals'),
('frozen', 0.200, 0.250, 0.550, 'Frozen foods - low spoilage but space/energy costs'),
('chilled_packaged', 0.350, 0.350, 0.300, 'Packaged meats, processed dairy, refrigerated items'),
('pantry_staples', 0.100, 0.300, 0.600, 'Rice, pasta, flour, oil - focus on turnover'),
('canned_jarred', 0.050, 0.250, 0.700, 'Canned goods, preserves, condiments'),
('dry_goods', 0.080, 0.320, 0.600, 'Cereals, snacks, nuts, dried fruits'),
('beverages', 0.120, 0.380, 0.500, 'Juices, soft drinks, alcohol - moderate value/turnover'),
('spices_condiments', 0.150, 0.400, 0.450, 'Spices, sauces, seasonings - slow turnover but profitable')
ON CONFLICT (category) DO NOTHING;