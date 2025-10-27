-- Migration: 017_add_action_tracking_system.sql
-- Simple action tracking for LIFO.AI recommendations
-- Compliance rules handled in scoring module, not database

BEGIN;

-- =============================================
-- ACTION TRACKING FOR LIFO.AI RECOMMENDATIONS
-- =============================================

-- Simple enum for action types
CREATE TYPE action_type AS ENUM (
    'discount',
    'donate', 
    'dispose',
    'maintain',
    'ignored'
);

-- Common donation recipient types for better UX
CREATE TYPE donation_recipient_type AS ENUM (
    'food_bank',           -- Food banks and redistribution centers
    'soup_kitchen',        -- Soup kitchens and meal services
    'charity',             -- General registered charities
    'religious_org',       -- Churches, mosques, temples, etc.
    'community_group',     -- Local community organizations
    'animal_shelter',      -- Animal welfare organizations
    'school',              -- Schools and educational institutions
    'elderly_care',        -- Nursing homes, elderly care centers
    'homeless_shelter',    -- Homeless shelters and services
    'other'               -- Custom/other recipients
);

-- Track what users did with AI recommendations
CREATE TABLE inventory.batch_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES inventory.batches(batch_id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES business.stores(store_id),
    
    -- What was recommended vs what was done
    recommended_action action_type NOT NULL,
    actual_action action_type NOT NULL,
    ai_score DECIMAL(3,2), -- The AI score that triggered the recommendation (0.00-1.00)
    
    -- Simple tracking details
    action_date TIMESTAMP DEFAULT NOW(),
    quantity_affected DECIMAL(12,4),
    notes TEXT, -- Simple notes from user (e.g., "donated to local food bank")
    
    -- Financial tracking (for ROI calculations)
    original_value DECIMAL(10,2), -- Value before action
    recovered_value DECIMAL(10,2), -- Value after action (discount price, tax benefit, etc.)
    
    -- User tracking
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SIMPLE DONATION RECIPIENTS (MVP)
-- =============================================

-- Lightweight recipient tracking (just enough for compliance)
CREATE TABLE inventory.donation_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    recipient_type donation_recipient_type NOT NULL,
    
    -- Minimal compliance fields
    is_certified BOOLEAN DEFAULT FALSE,
    certification_notes TEXT,
    
    -- Simple operational info
    accepts_pickups BOOLEAN DEFAULT TRUE,
    max_distance_km INTEGER DEFAULT 10,
    
    -- Store association
    store_id UUID NOT NULL REFERENCES business.stores(store_id),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Link actions to donation recipients (when applicable)
ALTER TABLE inventory.batch_actions 
ADD COLUMN donation_recipient_id UUID REFERENCES inventory.donation_recipients(recipient_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core action tracking indexes
CREATE INDEX idx_batch_actions_batch ON inventory.batch_actions(batch_id);
CREATE INDEX idx_batch_actions_store ON inventory.batch_actions(store_id);
CREATE INDEX idx_batch_actions_date ON inventory.batch_actions(action_date DESC);

-- Analytics indexes
CREATE INDEX idx_batch_actions_score ON inventory.batch_actions(ai_score DESC);
CREATE INDEX idx_batch_actions_recommendation ON inventory.batch_actions(recommended_action, actual_action);

-- Recipient lookup
CREATE INDEX idx_donation_recipients_store ON inventory.donation_recipients(store_id) 
    WHERE is_active = TRUE;

-- =============================================
-- SIMPLE VIEWS FOR ANALYTICS
-- =============================================

-- View for recommendation effectiveness
CREATE VIEW inventory.recommendation_analytics AS
SELECT 
    store_id,
    recommended_action,
    actual_action,
    COUNT(*) as recommendation_count,
    AVG(ai_score) as avg_ai_score,
    SUM(original_value) as total_original_value,
    SUM(recovered_value) as total_recovered_value,
    (SUM(recovered_value) / NULLIF(SUM(original_value), 0) * 100) as recovery_percentage
FROM inventory.batch_actions
WHERE action_date >= NOW() - INTERVAL '30 days'
GROUP BY store_id, recommended_action, actual_action;

-- View for donation impact
CREATE VIEW inventory.donation_impact AS
SELECT 
    ba.store_id,
    dr.name as recipient_name,
    dr.recipient_type,
    COUNT(*) as donation_count,
    SUM(ba.quantity_affected) as total_quantity_donated,
    SUM(ba.original_value) as total_value_donated,
    SUM(ba.recovered_value) as total_tax_benefit,
    MAX(ba.action_date) as last_donation_date
FROM inventory.batch_actions ba
JOIN inventory.donation_recipients dr ON ba.donation_recipient_id = dr.recipient_id
WHERE ba.actual_action = 'donate'
AND ba.action_date >= NOW() - INTERVAL '30 days'
GROUP BY ba.store_id, dr.recipient_id, dr.name, dr.recipient_type;

COMMIT;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Sample donation recipients (commented out - add manually per store)
/*
INSERT INTO inventory.donation_recipients (name, recipient_type, contact_email, store_id, created_by) VALUES
('Local Food Bank', 'food_bank', 'contact@localfoodbank.org', 'YOUR-STORE-ID', auth.uid()),
('Community Kitchen', 'charity', 'info@communitykitchen.org', 'YOUR-STORE-ID', auth.uid());
*/