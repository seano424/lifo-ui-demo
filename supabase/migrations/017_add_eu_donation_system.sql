-- Migration: 017_add_eu_donation_system.sql
-- Implements comprehensive EU-compliant donation tracking system
-- Supports full donation lifecycle with European food safety compliance

BEGIN;

-- =============================================
-- CREATE DONATION SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS donation;

-- =============================================
-- ENUMS FOR DONATION SYSTEM
-- =============================================

-- Donation status tracking
CREATE TYPE donation_status AS ENUM (
    'eligible',
    'pending_pickup',
    'in_transit',
    'delivered',
    'completed',
    'cancelled',
    'rejected'
);

-- Types of donation recipients under EU Food Donation Guidelines (2017)
-- Categorized by distribution role and regulatory status
CREATE TYPE recipient_type AS ENUM (
    -- === Intermediary Organizations (Redistribution) ===
    'food_bank',              -- Certified food redistribution centers
    'food_rescue_org',        -- Specialized food rescue organizations
    
    -- === Front-line Organizations (Direct Distribution) ===
    'soup_kitchen',           -- Licensed meal service facilities
    'social_service_agency',  -- Municipal/government services
    'registered_charity',     -- NGOs with tax-exempt status
    
    -- === Community-Level Recipients ===
    'local_solidarity_group', -- Grassroots community groups
    'religious_organization', -- Churches, mosques, etc.
    
    -- === Special Cases ===
    'animal_welfare',         -- For non-human food donations
    'composting_facility'     -- Environmental waste reduction
);

-- Method of donation delivery
CREATE TYPE donation_method AS ENUM (
    'pickup',
    'delivery',
    'drop_off',
    'third_party_logistics'
);

-- EU compliance validation status
CREATE TYPE compliance_status AS ENUM (
    'compliant',
    'conditionally_compliant',
    'non_compliant',
    'pending_validation'
);

-- =============================================
-- DONATION RECIPIENTS TABLE
-- =============================================

CREATE TABLE donation.donation_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    recipient_type recipient_type NOT NULL,
    
    -- Contact information
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Address information
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Germany',
    
    -- EU compliance certifications
    food_business_registration VARCHAR(100) NOT NULL, -- EU food business operator number
    certification_number VARCHAR(100),
    haccp_certified BOOLEAN DEFAULT FALSE,
    
    -- Operational capabilities
    accepts_frozen BOOLEAN DEFAULT FALSE,
    accepts_chilled BOOLEAN DEFAULT TRUE,
    accepts_ambient BOOLEAN DEFAULT TRUE,
    max_pickup_distance_km INTEGER DEFAULT 50,
    
    -- Capacity and scheduling
    weekly_capacity_kg INTEGER,
    pickup_days JSONB, -- ["monday", "wednesday", "friday"]
    preferred_pickup_times JSONB, -- ["09:00-12:00", "14:00-17:00"]
    
    -- Compliance and validation
    compliance_status compliance_status DEFAULT 'pending_validation',
    last_inspection_date DATE,
    compliance_notes TEXT,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- =============================================
-- EU REGULATORY REQUIREMENTS TABLE
-- =============================================

CREATE TABLE donation.eu_regulatory_requirements (
    requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Requirement identification
    regulation_reference VARCHAR(100) NOT NULL, -- e.g., "Regulation (EC) No 178/2002"
    requirement_code VARCHAR(50) NOT NULL,      -- e.g., "GFL_ART14", "FH_ART5"
    requirement_title VARCHAR(255) NOT NULL,
    requirement_description TEXT NOT NULL,
    
    -- Categorization
    regulation_category VARCHAR(50) NOT NULL,   -- 'food_safety', 'traceability', 'hygiene', 'labeling'
    compliance_level VARCHAR(20) NOT NULL,      -- 'mandatory', 'recommended', 'conditional'
    applicable_recipient_types JSONB NOT NULL,  -- Array of recipient_type values
    
    -- Implementation guidance
    implementation_guidance TEXT,
    documentation_required TEXT,
    verification_method VARCHAR(100),
    frequency_of_compliance_check VARCHAR(50),  -- 'one_time', 'annual', 'monthly', 'per_donation'
    
    -- Risk assessment
    non_compliance_risk_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    potential_penalties TEXT,
    mitigation_strategies TEXT,
    
    -- Status and versioning
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    superseded_date DATE,
    superseded_by UUID REFERENCES donation.eu_regulatory_requirements(requirement_id),
    
    -- Administrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT eu_reqs_category_check CHECK (regulation_category IN ('food_safety', 'traceability', 'hygiene', 'labeling', 'documentation', 'general')),
    CONSTRAINT eu_reqs_compliance_level_check CHECK (compliance_level IN ('mandatory', 'recommended', 'conditional')),
    CONSTRAINT eu_reqs_risk_level_check CHECK (non_compliance_risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT eu_reqs_frequency_check CHECK (frequency_of_compliance_check IN ('one_time', 'annual', 'monthly', 'per_donation', 'as_needed')),
    CONSTRAINT eu_reqs_dates_logical CHECK (superseded_date IS NULL OR superseded_date >= effective_date)
);

-- =============================================
-- ORGANIZATION COMPLIANCE STATUS TABLE
-- =============================================

CREATE TABLE donation.organization_compliance_status (
    compliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES donation.donation_recipients(recipient_id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES donation.eu_regulatory_requirements(requirement_id) ON DELETE CASCADE,
    
    -- Compliance status
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    compliance_date DATE,
    expiry_date DATE,
    next_review_date DATE,
    
    -- Documentation
    compliance_document_reference VARCHAR(255),
    verification_method_used VARCHAR(100),
    verified_by_name VARCHAR(100),
    verified_by_organization VARCHAR(100),
    verification_notes TEXT,
    
    -- Assessment details
    assessment_score DECIMAL(3,2), -- 0.00 to 1.00
    risk_assessment VARCHAR(20),   -- 'low', 'medium', 'high'
    corrective_actions_required JSONB,
    corrective_actions_completed JSONB,
    
    -- Administrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessed_by VARCHAR(100),
    
    UNIQUE(recipient_id, requirement_id),
    
    -- Constraints
    CONSTRAINT org_compliance_status_check CHECK (compliance_status IN ('compliant', 'non_compliant', 'conditionally_compliant', 'pending', 'expired', 'not_applicable')),
    CONSTRAINT org_compliance_score_range CHECK (assessment_score IS NULL OR (assessment_score >= 0.0 AND assessment_score <= 1.0)),
    CONSTRAINT org_compliance_risk_check CHECK (risk_assessment IN ('low', 'medium', 'high')),
    CONSTRAINT org_compliance_dates_logical CHECK (expiry_date IS NULL OR compliance_date IS NULL OR expiry_date >= compliance_date)
);

-- =============================================
-- DONATION RECORDS TABLE
-- =============================================

CREATE TABLE donation.donation_records (
    donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES inventory.batches(batch_id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES donation.donation_recipients(recipient_id) ON DELETE RESTRICT,
    
    -- Donation details
    quantity_donated DECIMAL(10, 3) NOT NULL,
    original_value DECIMAL(10, 2) NOT NULL, -- Original selling price * quantity
    estimated_social_value DECIMAL(10, 2), -- Estimated social impact value
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_pickup_date TIMESTAMP WITH TIME ZONE,
    actual_pickup_date TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status donation_status DEFAULT 'eligible',
    donation_method donation_method DEFAULT 'pickup',
    
    -- EU compliance documentation
    compliance_status compliance_status NOT NULL,
    eu_eligibility_score FLOAT CHECK (eu_eligibility_score >= 0.0 AND eu_eligibility_score <= 1.0),
    safety_requirements JSONB, -- List of safety requirements met
    regulatory_notes JSONB, -- EU regulatory compliance notes
    handling_instructions JSONB, -- Special handling instructions
    
    -- Temperature and quality tracking
    temperature_at_donation FLOAT, -- °C
    packaging_condition VARCHAR(50), -- good, damaged, opened
    quality_assessment TEXT,
    
    -- Logistics
    pickup_person VARCHAR(100),
    pickup_organization VARCHAR(255),
    transport_method VARCHAR(100),
    delivery_confirmation TEXT,
    
    -- Financial impact
    tax_deduction_value DECIMAL(10, 2), -- For donor tax benefits
    waste_cost_avoided DECIMAL(10, 2), -- Disposal cost savings
    
    -- Documentation and traceability
    donation_certificate_issued BOOLEAN DEFAULT FALSE,
    traceability_document VARCHAR(255), -- File reference
    photos_taken JSONB, -- Photo references for documentation
    
    -- User tracking
    created_by VARCHAR(100), -- User who initiated donation
    approved_by VARCHAR(100), -- User who approved donation
    completed_by VARCHAR(100), -- User who completed donation
    
    -- Notes and feedback
    donor_notes TEXT,
    recipient_feedback TEXT,
    internal_notes TEXT
);

-- =============================================
-- DONATION COMPLIANCE CHECKS TABLE
-- =============================================

CREATE TABLE donation.donation_compliance_checks (
    check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES donation.donation_records(donation_id) ON DELETE CASCADE,
    
    -- Check details
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_type VARCHAR(100) NOT NULL, -- "initial", "pre_pickup", "delivery"
    performed_by VARCHAR(100) NOT NULL,
    
    -- EU regulation compliance
    regulation_178_2002_compliant BOOLEAN, -- General Food Law
    regulation_852_2004_compliant BOOLEAN, -- Food Hygiene
    regulation_853_2004_compliant BOOLEAN, -- Animal Products (if applicable)
    
    -- Specific checks performed
    temperature_check_passed BOOLEAN,
    packaging_integrity_passed BOOLEAN,
    labeling_accuracy_passed BOOLEAN,
    traceability_documentation_complete BOOLEAN,
    recipient_certification_verified BOOLEAN,
    
    -- Check results
    overall_compliance_status compliance_status NOT NULL,
    compliance_score FLOAT CHECK (compliance_score >= 0.0 AND compliance_score <= 1.0),
    issues_identified JSONB, -- List of compliance issues
    corrective_actions_taken JSONB, -- Actions taken to resolve issues
    
    -- Documentation
    check_notes TEXT,
    evidence_photos JSONB, -- Photo references
    certificates_verified JSONB -- List of certificates checked
);

-- =============================================
-- DONATION KPI IMPACTS TABLE
-- =============================================

CREATE TABLE donation.donation_kpi_impacts (
    impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES donation.donation_records(donation_id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    
    -- Financial impact
    waste_cost_avoided DECIMAL(10, 2) NOT NULL,
    revenue_preserved DECIMAL(10, 2), -- Value that would have been lost
    tax_benefit_value DECIMAL(10, 2), -- Tax deduction value
    disposal_cost_saved DECIMAL(10, 2),
    
    -- Environmental impact
    co2_emissions_avoided_kg FLOAT,
    landfill_waste_avoided_kg FLOAT,
    water_footprint_saved_liters FLOAT,
    
    -- Social impact
    meals_provided_estimate INTEGER,
    people_served_estimate INTEGER,
    social_value_eur DECIMAL(10, 2),
    
    -- EU compliance metrics
    eu_regulation_adherence_score FLOAT CHECK (eu_regulation_adherence_score >= 0.0 AND eu_regulation_adherence_score <= 1.0),
    food_safety_incidents INTEGER DEFAULT 0,
    compliance_violations INTEGER DEFAULT 0,
    successful_transfers INTEGER DEFAULT 1,
    
    -- Operational efficiency
    time_to_donation_hours FLOAT,
    transportation_distance_km FLOAT,
    handling_efficiency_score FLOAT CHECK (handling_efficiency_score >= 0.0 AND handling_efficiency_score <= 1.0),
    
    -- Quality metrics
    recipient_satisfaction_score FLOAT CHECK (recipient_satisfaction_score >= 1.0 AND recipient_satisfaction_score <= 5.0),
    food_quality_rating FLOAT CHECK (food_quality_rating >= 1.0 AND food_quality_rating <= 5.0),
    process_efficiency_rating FLOAT CHECK (process_efficiency_rating >= 1.0 AND process_efficiency_rating <= 5.0),
    
    -- Tracking metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_method VARCHAR(100),
    data_sources JSONB
);

-- =============================================
-- DONATION ALERTS TABLE
-- =============================================

CREATE TABLE donation.donation_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    batch_id UUID REFERENCES inventory.batches(batch_id) ON DELETE SET NULL,
    
    -- Alert details
    alert_type VARCHAR(100) NOT NULL, -- "donation_opportunity", "compliance_issue", "urgent_action"
    priority_level VARCHAR(20) NOT NULL CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- EU compliance context
    eu_regulation_context JSONB, -- Which EU regulations are relevant
    compliance_deadline TIMESTAMP WITH TIME ZONE, -- When compliance action is needed
    
    -- Alert lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(100),
    resolved_by VARCHAR(100),
    
    -- Status and actions
    is_active BOOLEAN DEFAULT TRUE,
    requires_immediate_action BOOLEAN DEFAULT FALSE,
    suggested_actions JSONB, -- List of suggested actions
    taken_actions JSONB, -- Actions that were taken
    
    -- Escalation
    escalation_level INTEGER DEFAULT 0, -- 0=normal, 1=escalated, 2=urgent
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT
);

-- =============================================
-- DONATION ANALYTICS TABLE
-- =============================================

CREATE TABLE donation.donation_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Volume metrics
    total_donations INTEGER DEFAULT 0,
    total_quantity_donated_kg DECIMAL(10, 3) DEFAULT 0,
    total_value_donated_eur DECIMAL(10, 2) DEFAULT 0,
    
    -- Financial impact
    total_waste_cost_avoided DECIMAL(10, 2) DEFAULT 0,
    total_tax_benefits DECIMAL(10, 2) DEFAULT 0,
    total_disposal_savings DECIMAL(10, 2) DEFAULT 0,
    
    -- EU compliance metrics
    compliance_rate_percent FLOAT DEFAULT 0,
    regulation_violations INTEGER DEFAULT 0,
    food_safety_incidents INTEGER DEFAULT 0,
    
    -- Environmental impact
    co2_emissions_avoided_kg FLOAT DEFAULT 0,
    landfill_waste_avoided_kg FLOAT DEFAULT 0,
    
    -- Social impact
    estimated_meals_provided INTEGER DEFAULT 0,
    estimated_people_served INTEGER DEFAULT 0,
    total_social_value_eur DECIMAL(10, 2) DEFAULT 0,
    
    -- Efficiency metrics
    average_time_to_donation_hours FLOAT,
    donation_success_rate_percent FLOAT,
    recipient_satisfaction_average FLOAT,
    
    -- Calculated metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_version VARCHAR(20),
    
    -- Status
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Ensure no overlapping periods for same store and period type
    UNIQUE(store_id, period_start, period_end, period_type)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Donation recipients indexes
CREATE INDEX idx_donation_recipients_type ON donation.donation_recipients(recipient_type);
CREATE INDEX idx_donation_recipients_city ON donation.donation_recipients(city);
CREATE INDEX idx_donation_recipients_compliance ON donation.donation_recipients(compliance_status);
CREATE INDEX idx_donation_recipients_active ON donation.donation_recipients(is_active);

-- EU regulatory requirements indexes
CREATE INDEX idx_eu_reqs_category ON donation.eu_regulatory_requirements(regulation_category);
CREATE INDEX idx_eu_reqs_level ON donation.eu_regulatory_requirements(compliance_level);
CREATE INDEX idx_eu_reqs_active ON donation.eu_regulatory_requirements(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_eu_reqs_risk ON donation.eu_regulatory_requirements(non_compliance_risk_level);
CREATE INDEX idx_eu_reqs_types ON donation.eu_regulatory_requirements USING GIN(applicable_recipient_types);

-- Organization compliance status indexes
CREATE INDEX idx_org_compliance_recipient ON donation.organization_compliance_status(recipient_id);
CREATE INDEX idx_org_compliance_requirement ON donation.organization_compliance_status(requirement_id);
CREATE INDEX idx_org_compliance_status ON donation.organization_compliance_status(compliance_status);
CREATE INDEX idx_org_compliance_expiry ON donation.organization_compliance_status(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_org_compliance_review ON donation.organization_compliance_status(next_review_date) WHERE next_review_date IS NOT NULL;

-- Donation records indexes
CREATE INDEX idx_donation_records_batch ON donation.donation_records(batch_id);
CREATE INDEX idx_donation_records_store ON donation.donation_records(store_id);
CREATE INDEX idx_donation_records_recipient ON donation.donation_records(recipient_id);
CREATE INDEX idx_donation_records_status ON donation.donation_records(status);
CREATE INDEX idx_donation_records_compliance ON donation.donation_records(compliance_status);
CREATE INDEX idx_donation_records_created ON donation.donation_records(created_at);
CREATE INDEX idx_donation_records_pickup_date ON donation.donation_records(scheduled_pickup_date);

-- Compliance checks indexes
CREATE INDEX idx_compliance_checks_donation ON donation.donation_compliance_checks(donation_id);
CREATE INDEX idx_compliance_checks_timestamp ON donation.donation_compliance_checks(check_timestamp);
CREATE INDEX idx_compliance_checks_type ON donation.donation_compliance_checks(check_type);
CREATE INDEX idx_compliance_checks_status ON donation.donation_compliance_checks(overall_compliance_status);

-- KPI impacts indexes
CREATE INDEX idx_kpi_impacts_donation ON donation.donation_kpi_impacts(donation_id);
CREATE INDEX idx_kpi_impacts_store ON donation.donation_kpi_impacts(store_id);
CREATE INDEX idx_kpi_impacts_calculated ON donation.donation_kpi_impacts(calculated_at);

-- Alerts indexes
CREATE INDEX idx_donation_alerts_store ON donation.donation_alerts(store_id);
CREATE INDEX idx_donation_alerts_batch ON donation.donation_alerts(batch_id);
CREATE INDEX idx_donation_alerts_type ON donation.donation_alerts(alert_type);
CREATE INDEX idx_donation_alerts_priority ON donation.donation_alerts(priority_level);
CREATE INDEX idx_donation_alerts_active ON donation.donation_alerts(is_active);
CREATE INDEX idx_donation_alerts_created ON donation.donation_alerts(created_at);

-- Analytics indexes
CREATE INDEX idx_donation_analytics_store ON donation.donation_analytics(store_id);
CREATE INDEX idx_donation_analytics_period ON donation.donation_analytics(period_start, period_end);
CREATE INDEX idx_donation_analytics_type ON donation.donation_analytics(period_type);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all donation tables
ALTER TABLE donation.donation_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.eu_regulatory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.organization_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.donation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.donation_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.donation_kpi_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.donation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation.donation_analytics ENABLE ROW LEVEL SECURITY;

-- Donation recipients policies (accessible by all authenticated users for recipient lookup)
CREATE POLICY "Users can view active donation recipients" ON donation.donation_recipients
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Store owners can manage donation recipients" ON donation.donation_recipients
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager')
        )
    );

-- EU regulatory requirements policies (read-only for most users)
CREATE POLICY "Users can view EU regulatory requirements" ON donation.eu_regulatory_requirements
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- Organization compliance status policies
CREATE POLICY "Users can view compliance status" ON donation.organization_compliance_status
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store managers can manage compliance status" ON donation.organization_compliance_status
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager')
        )
    );

-- Donation records policies (store-specific access)
CREATE POLICY "Users can view store donation records" ON donation.donation_records
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_records.store_id
            AND su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store users can manage donation records" ON donation.donation_records
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_records.store_id
            AND su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager', 'employee')
        )
    );

-- Compliance checks policies
CREATE POLICY "Users can view compliance checks for accessible donations" ON donation.donation_compliance_checks
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM donation.donation_records dr
            JOIN business.store_users su ON su.store_id = dr.store_id
            WHERE dr.donation_id = donation.donation_compliance_checks.donation_id
            AND su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store users can manage compliance checks" ON donation.donation_compliance_checks
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM donation.donation_records dr
            JOIN business.store_users su ON su.store_id = dr.store_id
            WHERE dr.donation_id = donation.donation_compliance_checks.donation_id
            AND su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager', 'employee')
        )
    );

-- KPI impacts policies
CREATE POLICY "Users can view store KPI impacts" ON donation.donation_kpi_impacts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_kpi_impacts.store_id
            AND su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store users can manage KPI impacts" ON donation.donation_kpi_impacts
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_kpi_impacts.store_id
            AND su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager', 'employee')
        )
    );

-- Alerts policies
CREATE POLICY "Users can view store donation alerts" ON donation.donation_alerts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_alerts.store_id
            AND su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store users can manage donation alerts" ON donation.donation_alerts
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_alerts.store_id
            AND su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager', 'employee')
        )
    );

-- Analytics policies
CREATE POLICY "Users can view store donation analytics" ON donation.donation_analytics
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_analytics.store_id
            AND su.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Store owners can manage donation analytics" ON donation.donation_analytics
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = donation.donation_analytics.store_id
            AND su.user_id = auth.uid()::text
            AND su.role IN ('owner', 'manager')
        )
    );

-- =============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to donation_recipients
CREATE TRIGGER update_donation_recipients_updated_at
    BEFORE UPDATE ON donation.donation_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply triggers to new tables
CREATE TRIGGER update_eu_reqs_updated_at
    BEFORE UPDATE ON donation.eu_regulatory_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_status_updated_at
    BEFORE UPDATE ON donation.organization_compliance_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSERT SAMPLE EU REGULATORY REQUIREMENTS
-- =============================================

INSERT INTO donation.eu_regulatory_requirements (
    regulation_reference, requirement_code, requirement_title, requirement_description,
    regulation_category, compliance_level, applicable_recipient_types,
    implementation_guidance, non_compliance_risk_level, effective_date
) VALUES 
(
    'Regulation (EC) No 178/2002', 'GFL_ART14',
    'Food Business Operator Registration',
    'All food business operators must be registered with competent authorities',
    'general', 'mandatory',
    '["food_bank", "food_rescue_org", "soup_kitchen", "social_service_agency", "registered_charity", "local_solidarity_group", "religious_organization"]',
    'Organizations must register as food business operators and maintain valid registration',
    'high', '2002-01-01'
),
(
    'Regulation (EC) No 852/2004', 'FH_ART5',
    'HACCP Implementation',
    'Food business operators must implement HACCP-based food safety management system',
    'food_safety', 'mandatory',
    '["food_bank", "food_rescue_org", "soup_kitchen", "social_service_agency", "registered_charity"]',
    'Implement and maintain HACCP system appropriate to organization size and operations',
    'high', '2004-01-01'
),
(
    'Regulation (EC) No 178/2002', 'GFL_ART18',
    'Food Traceability',
    'Ensure traceability of food donations throughout the supply chain',
    'traceability', 'mandatory',
    '["food_bank", "food_rescue_org", "soup_kitchen", "social_service_agency", "registered_charity", "local_solidarity_group", "religious_organization"]',
    'Maintain records of food sources and destinations for donated food',
    'medium', '2002-01-01'
),
(
    'EU Food Donation Guidelines 2017', 'FDG_TEMP',
    'Temperature Control',
    'Maintain cold chain for temperature-sensitive donated foods',
    'food_safety', 'mandatory',
    '["food_bank", "food_rescue_org", "soup_kitchen", "social_service_agency", "registered_charity"]',
    'Ensure appropriate storage and transport temperatures for chilled and frozen foods',
    'high', '2017-10-16'
),
(
    'EU Food Donation Guidelines 2017', 'FDG_DATE',
    'Date Marking Understanding',
    'Recipients must understand difference between use-by and best-before dates',
    'food_safety', 'mandatory',
    '["food_bank", "food_rescue_org", "soup_kitchen", "social_service_agency", "registered_charity", "local_solidarity_group", "religious_organization"]',
    'Train staff on date marking interpretation and food safety implications',
    'medium', '2017-10-16'
);

-- =============================================
-- HELPER FUNCTIONS FOR EU COMPLIANCE
-- =============================================

-- Function to get recipients by type with compliance status
CREATE OR REPLACE FUNCTION get_recipients_by_type_with_compliance(
    p_recipient_type recipient_type,
    p_country VARCHAR DEFAULT 'Germany',
    p_max_distance_km INTEGER DEFAULT 100
) RETURNS TABLE(
    recipient_id UUID,
    organization_name VARCHAR,
    recipient_type recipient_type,
    compliance_status compliance_status,
    last_inspection_date DATE,
    email VARCHAR,
    phone VARCHAR,
    max_pickup_distance_km INTEGER,
    accepts_frozen BOOLEAN,
    accepts_chilled BOOLEAN,
    weekly_capacity_kg INTEGER
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.recipient_id,
        dr.organization_name,
        dr.recipient_type,
        dr.compliance_status,
        dr.last_inspection_date,
        dr.email,
        dr.phone,
        dr.max_pickup_distance_km,
        dr.accepts_frozen,
        dr.accepts_chilled,
        dr.weekly_capacity_kg
    FROM donation.donation_recipients dr
    WHERE dr.recipient_type = p_recipient_type
      AND dr.country = p_country
      AND dr.is_active = TRUE
      AND dr.max_pickup_distance_km <= p_max_distance_km
    ORDER BY dr.compliance_status, dr.organization_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check compliance status for recipient
CREATE OR REPLACE FUNCTION check_recipient_compliance(
    p_recipient_id UUID,
    p_requirement_category VARCHAR DEFAULT NULL
) RETURNS TABLE(
    requirement_title VARCHAR,
    compliance_status VARCHAR,
    assessment_score DECIMAL,
    expiry_date DATE,
    risk_level VARCHAR
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        req.requirement_title,
        COALESCE(ocs.compliance_status, 'pending')::VARCHAR,
        ocs.assessment_score,
        ocs.expiry_date,
        COALESCE(ocs.risk_assessment, req.non_compliance_risk_level)::VARCHAR
    FROM donation.eu_regulatory_requirements req
    LEFT JOIN donation.organization_compliance_status ocs ON ocs.requirement_id = req.requirement_id 
        AND ocs.recipient_id = p_recipient_id
    WHERE req.is_active = TRUE
      AND (p_requirement_category IS NULL OR req.regulation_category = p_requirement_category)
      AND req.applicable_recipient_types @> (
          SELECT jsonb_build_array(dr.recipient_type::text)
          FROM donation.donation_recipients dr
          WHERE dr.recipient_id = p_recipient_id
      )
    ORDER BY req.compliance_level DESC, req.non_compliance_risk_level DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE donation.donation_recipients IS 'EU-certified donation recipients with compliance validation';
COMMENT ON TABLE donation.eu_regulatory_requirements IS 'EU regulatory requirements for food donation operations';
COMMENT ON TABLE donation.organization_compliance_status IS 'Compliance tracking for recipient organizations against EU requirements';
COMMENT ON TABLE donation.donation_records IS 'Complete donation tracking with EU compliance documentation';
COMMENT ON TABLE donation.donation_compliance_checks IS 'Detailed EU compliance validation records for each donation';
COMMENT ON TABLE donation.donation_kpi_impacts IS 'KPI tracking for donation impact measurement with EU compliance metrics';
COMMENT ON TABLE donation.donation_alerts IS 'Automated alerts for donation opportunities and compliance issues';
COMMENT ON TABLE donation.donation_analytics IS 'Aggregated analytics for donation program performance';

COMMENT ON TYPE donation_status IS 'Status tracking for donation lifecycle';
COMMENT ON TYPE recipient_type IS 'Types of donation recipients categorized by EU Food Donation Guidelines (2017)';
COMMENT ON TYPE donation_method IS 'Method of donation delivery';
COMMENT ON TYPE compliance_status IS 'EU compliance validation status';

COMMENT ON FUNCTION get_recipients_by_type_with_compliance(recipient_type, VARCHAR, INTEGER) IS 'Get recipient organizations by type with compliance status';
COMMENT ON FUNCTION check_recipient_compliance(UUID, VARCHAR) IS 'Check compliance status of recipient against EU requirements';

COMMIT;