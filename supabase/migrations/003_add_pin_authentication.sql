-- Migration: 003_add_pin_authentication.sql
BEGIN;

-- Add PIN-related fields to user_mgmt.users
ALTER TABLE user_mgmt.users 
ADD COLUMN pin_hash VARCHAR(255),                    -- Hashed PIN for security
ADD COLUMN pin_set_at TIMESTAMP,                     -- When PIN was created/updated
ADD COLUMN pin_expires_at TIMESTAMP,                 -- Optional PIN expiration
ADD COLUMN pin_attempts INTEGER DEFAULT 0,           -- Failed PIN attempts counter
ADD COLUMN pin_locked_until TIMESTAMP,               -- PIN lockout timestamp
ADD COLUMN requires_pin BOOLEAN DEFAULT FALSE,       -- Whether user must use PIN
ADD COLUMN pin_delivery_method VARCHAR(20) DEFAULT 'manual'; -- How PIN was delivered

-- Add indexes for performance
CREATE INDEX idx_users_pin_hash ON user_mgmt.users(pin_hash) WHERE pin_hash IS NOT NULL;
CREATE INDEX idx_users_pin_locked ON user_mgmt.users(pin_locked_until) WHERE pin_locked_until IS NOT NULL;

-- Add constraints
ALTER TABLE user_mgmt.users 
ADD CONSTRAINT chk_pin_delivery_method 
CHECK (pin_delivery_method IN ('manual', 'email', 'sms', 'print', 'qr_code'));

COMMIT;