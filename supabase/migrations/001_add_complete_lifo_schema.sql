-- =============================================
-- LIFO.AI Complete Database Schema Migration
-- Includes all schemas: user_mgmt, inventory, scoring, business, analytics, timeseries
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER MANAGEMENT SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS user_mgmt;

-- User profiles and extended information
CREATE TABLE IF NOT EXISTS user_mgmt.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    language VARCHAR(10) DEFAULT 'fr',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Role definitions
CREATE TABLE IF NOT EXISTS user_mgmt.roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User role assignments
CREATE TABLE IF NOT EXISTS user_mgmt.user_roles (
    user_id UUID REFERENCES user_mgmt.users(user_id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_mgmt.roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES user_mgmt.users(user_id),
    PRIMARY KEY (user_id, role_id)
);

-- =============================================
-- INVENTORY SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS inventory;

-- Product master data
CREATE TABLE IF NOT EXISTS inventory.products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit_type VARCHAR(20) DEFAULT 'pcs',
    
    -- Pricing
    base_cost_price DECIMAL(12,4),
    base_selling_price DECIMAL(12,4),
    
    -- Product characteristics
    typical_shelf_life_days INTEGER,
    storage_temperature_min DECIMAL(5,2),
    storage_temperature_max DECIMAL(5,2),
    
    -- Multi-tenant support
    store_id UUID REFERENCES business.stores(store_id),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_mgmt.users(user_id),
    updated_by UUID REFERENCES user_mgmt.users(user_id)
);

-- Inventory batches - the core of LIFO tracking
CREATE TABLE IF NOT EXISTS inventory.batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    
    -- Quantities
    initial_quantity DECIMAL(12,4) NOT NULL,
    current_quantity DECIMAL(12,4) NOT NULL,
    available_quantity DECIMAL(12,4) GENERATED ALWAYS AS (current_quantity) STORED,
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    
    -- Pricing (can override product base prices)
    cost_price DECIMAL(12,4),
    selling_price DECIMAL(12,4),
    
    -- Location and status
    location_code VARCHAR(50) DEFAULT 'MAIN',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'damaged', 'returned')),
    
    -- Multi-tenant support
    store_id UUID REFERENCES business.stores(store_id),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_mgmt.users(user_id),
    updated_by UUID REFERENCES user_mgmt.users(user_id),
    
    -- Ensure unique batch numbers per store
    UNIQUE(store_id, batch_number)
);

-- =============================================
-- SCORING SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS scoring;

-- Category-specific scoring weights
CREATE TABLE IF NOT EXISTS scoring.category_weights (
    category VARCHAR(100) PRIMARY KEY,
    spoilage_risk_weight DECIMAL(3,2) NOT NULL CHECK (spoilage_risk_weight >= 0 AND spoilage_risk_weight <= 1),
    value_impact_weight DECIMAL(3,2) NOT NULL CHECK (value_impact_weight >= 0 AND value_impact_weight <= 1),
    turnover_speed_weight DECIMAL(3,2) NOT NULL CHECK (turnover_speed_weight >= 0 AND turnover_speed_weight <= 1),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure weights sum to 1
    CONSTRAINT weights_sum_to_one CHECK (
        spoilage_risk_weight + value_impact_weight + turnover_speed_weight = 1.0
    )
);

-- Product scores results
CREATE TABLE IF NOT EXISTS scoring.product_scores (
    score_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id) ON DELETE CASCADE,
    store_id UUID REFERENCES business.stores(store_id),
    
    -- Component scores
    expiry_score DECIMAL(3,2) CHECK (expiry_score >= 0 AND expiry_score <= 1),
    velocity_score DECIMAL(3,2) CHECK (velocity_score >= 0 AND velocity_score <= 1),
    margin_score DECIMAL(3,2) CHECK (margin_score >= 0 AND margin_score <= 1),
    composite_score DECIMAL(3,2) CHECK (composite_score >= 0 AND composite_score <= 1),
    
    -- Recommendations
    recommendation VARCHAR(50) CHECK (recommendation IN ('hold', 'discount_light', 'discount_moderate', 'discount_aggressive', 'remove')),
    
    -- ML enhancement
    ml_enhanced BOOLEAN DEFAULT FALSE,
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    -- Audit
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique scores per batch
    UNIQUE(batch_id)
);

-- =============================================
-- BUSINESS/STORES SCHEMA
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
    owner_id UUID REFERENCES user_mgmt.users(user_id),
    is_active BOOLEAN DEFAULT TRUE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Store staff access and permissions
CREATE TABLE IF NOT EXISTS business.store_users (
    store_id UUID REFERENCES business.stores(store_id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_mgmt.users(user_id) ON DELETE CASCADE,
    role_in_store VARCHAR(50) CHECK (role_in_store IN ('owner', 'manager', 'staff', 'viewer')) DEFAULT 'staff',
    permissions JSONB DEFAULT '{"can_upload_inventory": true, "can_apply_discounts": false, "can_view_analytics": true}',
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES user_mgmt.users(user_id),
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

-- =============================================
-- ANALYTICS SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS analytics;

-- Actions taken and their results
CREATE TABLE IF NOT EXISTS analytics.actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES inventory.batches(batch_id),
    store_id UUID REFERENCES business.stores(store_id),
    action_type VARCHAR(50) CHECK (action_type IN ('discount_light', 'discount_moderate', 'discount_aggressive', 'alert', 'remove')),
    original_price DECIMAL(12,4),
    new_price DECIMAL(12,4),
    discount_percent DECIMAL(5,2),
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by UUID REFERENCES user_mgmt.users(user_id),
    
    -- Results tracking (updated later)
    quantity_sold_24h DECIMAL(12,4),
    quantity_sold_48h DECIMAL(12,4),
    revenue_recovered DECIMAL(12,4),
    effectiveness_score DECIMAL(3,2)
);

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

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON user_mgmt.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON user_mgmt.users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_mgmt.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_mgmt.user_roles(role_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON inventory.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON inventory.products(category);
CREATE INDEX IF NOT EXISTS idx_products_store ON inventory.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON inventory.products(store_id, category);

CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory.batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON inventory.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON inventory.batches(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_batches_store ON inventory.batches(store_id);
CREATE INDEX IF NOT EXISTS idx_batches_store_status ON inventory.batches(store_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_store_expiry ON inventory.batches(store_id, expiry_date) WHERE status = 'active';

-- Business indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner ON business.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_active ON business.stores(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_store_users_store ON business.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON business.store_users(user_id);

-- Scoring indexes
CREATE INDEX IF NOT EXISTS idx_scores_batch ON scoring.product_scores(batch_id);
CREATE INDEX IF NOT EXISTS idx_scores_store_batch ON scoring.product_scores(store_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_scores_composite ON scoring.product_scores(composite_score) WHERE composite_score >= 0.6;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_actions_store_time ON analytics.actions(store_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_actions_batch ON analytics.actions(batch_id);

-- Time series indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_store_time ON timeseries.inventory_snapshots(store_id, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON timeseries.inventory_snapshots(snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_sku_time ON timeseries.inventory_snapshots(sku, snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_batch_time ON timeseries.inventory_snapshots(batch_id, snapshot_timestamp);

CREATE INDEX IF NOT EXISTS idx_sales_store_time ON timeseries.sales_events(store_id, sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON timeseries.sales_events(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_sku_time ON timeseries.sales_events(sku, sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_batch_time ON timeseries.sales_events(batch_id, sale_timestamp);

CREATE INDEX IF NOT EXISTS idx_factors_store_time ON timeseries.external_factors(store_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_factors_timestamp ON timeseries.external_factors(recorded_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_mgmt.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mgmt.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mgmt.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE inventory.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE scoring.category_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring.product_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE business.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.store_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE analytics.actions ENABLE ROW LEVEL SECURITY;

ALTER TABLE timeseries.inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeseries.sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeseries.external_factors ENABLE ROW LEVEL SECURITY;

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

-- User management policies
CREATE POLICY "Users can view their own profile" ON user_mgmt.users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_mgmt.users
    FOR UPDATE USING (id = auth.uid());

-- Store policies
CREATE POLICY "Users can view stores they have access to" ON business.stores
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert stores they own" ON business.stores
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update stores they own" ON business.stores
    FOR UPDATE USING (owner_id = auth.uid());

-- Store users policies
CREATE POLICY "Users can view store_users for their stores" ON business.store_users
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store owners can add themselves to store_users" ON business.store_users
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM business.stores s 
            WHERE s.store_id = store_users.store_id 
            AND s.owner_id = auth.uid()
        )
    );

CREATE POLICY "Store owners can manage other store_users" ON business.store_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business.stores s 
            WHERE s.store_id = store_users.store_id 
            AND s.owner_id = auth.uid()
        )
    );

-- Store settings policies
CREATE POLICY "Users can view settings for their stores" ON business.store_settings
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store owners can manage settings" ON business.store_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business.stores s 
            WHERE s.store_id = store_settings.store_id 
            AND s.owner_id = auth.uid()
        )
    );

-- Inventory policies
CREATE POLICY "Users can view inventory from their stores" ON inventory.products
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can modify inventory in their stores" ON inventory.products
    FOR ALL USING (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Users can view batches from their stores" ON inventory.batches
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can modify batches in their stores" ON inventory.batches
    FOR ALL USING (user_has_store_access(store_id, 'staff'));

-- Scoring policies
CREATE POLICY "Category weights are readable by all authenticated users" ON scoring.category_weights
    FOR SELECT USING (auth.uid() IS NOT NULL);

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

-- Time series policies
CREATE POLICY "Users can view snapshots from their stores" ON timeseries.inventory_snapshots
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert snapshots for their stores" ON timeseries.inventory_snapshots
    FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Users can view sales events from their stores" ON timeseries.sales_events
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert sales events for their stores" ON timeseries.sales_events
    FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Users can view external factors from their stores" ON timeseries.external_factors
    FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Users can insert external factors for their stores" ON timeseries.external_factors
    FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

-- =============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
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

CREATE INDEX IF NOT EXISTS idx_daily_sales_store_date ON analytics.daily_sales_summary(store_id, sale_date);

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default user roles
INSERT INTO user_mgmt.roles (name, description, permissions) VALUES
('admin', 'System administrator', '{"manage_users": true, "manage_stores": true, "view_all_data": true}'),
('store_owner', 'Store owner', '{"manage_store": true, "manage_users": true, "view_analytics": true}'),
('store_manager', 'Store manager', '{"manage_inventory": true, "apply_discounts": true, "view_analytics": true}'),
('store_staff', 'Store staff', '{"upload_inventory": true, "view_alerts": true}'),
('viewer', 'Read-only access', '{"view_inventory": true, "view_analytics": true}')
ON CONFLICT (name) DO NOTHING;

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

-- =============================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- =============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW analytics.daily_inventory_summary;
    REFRESH MATERIALIZED VIEW analytics.daily_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON user_mgmt.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON inventory.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON inventory.batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON business.stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON business.store_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_weights_updated_at BEFORE UPDATE ON scoring.category_weights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();