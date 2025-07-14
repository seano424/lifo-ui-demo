-- Migration: 004_create_pin_deliveries.sql
BEGIN;

CREATE TABLE user_mgmt.pin_deliveries (
    delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_mgmt.users(user_id) ON DELETE CASCADE,
    store_id UUID REFERENCES business.stores(store_id),
    
    -- Delivery details
    delivery_method VARCHAR(20) NOT NULL,              -- email, sms, print, qr_code, manual
    delivery_address TEXT,                             -- email address, phone number, etc.
    delivery_status VARCHAR(20) DEFAULT 'pending',     -- pending, sent, delivered, failed
    
    -- PIN information (encrypted/hashed for security)
    pin_reference VARCHAR(100),                        -- Reference to track PIN (not actual PIN)
    pin_format VARCHAR(20) DEFAULT 'numeric',          -- numeric, alphanumeric
    pin_length INTEGER DEFAULT 4,                      -- PIN length
    
    -- Delivery metadata
    delivered_by UUID REFERENCES user_mgmt.users(user_id), -- Who initiated delivery
    delivery_requested_at TIMESTAMP DEFAULT NOW(),
    delivery_sent_at TIMESTAMP,
    delivery_confirmed_at TIMESTAMP,
    
    -- Expiration and security
    expires_at TIMESTAMP,
    max_attempts INTEGER DEFAULT 3,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_delivery_method 
    CHECK (delivery_method IN ('email', 'sms', 'print', 'qr_code', 'manual')),
    
    CONSTRAINT chk_delivery_status 
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    
    CONSTRAINT chk_pin_length 
    CHECK (pin_length = 4)
);

-- Indexes for performance
CREATE INDEX idx_pin_deliveries_user ON user_mgmt.pin_deliveries(user_id);
CREATE INDEX idx_pin_deliveries_store ON user_mgmt.pin_deliveries(store_id);
CREATE INDEX idx_pin_deliveries_status ON user_mgmt.pin_deliveries(delivery_status);
CREATE INDEX idx_pin_deliveries_expires ON user_mgmt.pin_deliveries(expires_at);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_pin_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pin_deliveries_updated_at
    BEFORE UPDATE ON user_mgmt.pin_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_pin_delivery_timestamp();

COMMIT;