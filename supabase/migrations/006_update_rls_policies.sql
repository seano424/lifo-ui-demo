-- Migration: 006_update_rls_policies.sql
BEGIN;

-- Create PIN-specific access function
CREATE OR REPLACE FUNCTION user_has_pin_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        JOIN user_mgmt.users u ON su.user_id = u.user_id
        WHERE su.store_id = target_store_id
        AND u.email = auth.email()
        AND su.is_active = TRUE
        AND su.can_use_pin_auth = TRUE
        AND (u.pin_hash IS NOT NULL OR su.role_in_store IN ('manager', 'owner'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to handle new employee role
DROP POLICY IF EXISTS "Users can view stores they have access to" ON business.stores;
CREATE POLICY "Users can view stores they have access to" ON business.stores
    FOR SELECT USING (
        user_has_store_access(store_id) OR 
        user_has_pin_access(store_id)
    );

-- Add RLS for PIN deliveries table
ALTER TABLE user_mgmt.pin_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PIN deliveries" ON user_mgmt.pin_deliveries
    FOR SELECT USING (
        user_id = (SELECT user_id FROM user_mgmt.users WHERE email = auth.email())
    );

CREATE POLICY "Store managers can view employee PIN deliveries" ON user_mgmt.pin_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = pin_deliveries.store_id
            AND su.user_id = (SELECT user_id FROM user_mgmt.users WHERE email = auth.email())
            AND su.role_in_store IN ('manager', 'owner')
        )
    );

COMMIT;