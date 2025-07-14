-- Migration: 009_create_pin_delivery_test_data.sql
BEGIN;

-- Create meaningful PIN delivery test data
INSERT INTO user_mgmt.pin_deliveries (
    user_id,
    store_id,
    delivery_method,
    delivery_status,
    pin_reference,
    pin_format,
    pin_length,
    delivered_by,
    delivery_requested_at,
    expires_at,
    max_attempts
) 
SELECT 
    u.user_id,
    su.store_id,
    CASE 
        WHEN u.email LIKE '%employee@%' THEN 'print'
        WHEN u.email LIKE '%employee2@%' THEN 'email'
        WHEN u.email LIKE '%employee3@%' THEN 'manual'
        ELSE 'qr_code'
    END as delivery_method,
    'pending' as delivery_status,
    'PIN-' || UPPER(substring(gen_random_uuid()::text, 1, 8)) as pin_reference,
    'numeric' as pin_format,
    4 as pin_length,
    (SELECT user_id FROM user_mgmt.users WHERE email = 'test.manager@lifo-test.com') as delivered_by,
    NOW() - INTERVAL '1 hour' as delivery_requested_at,
    NOW() + INTERVAL '30 days' as expires_at,
    3 as max_attempts
FROM user_mgmt.users u
JOIN business.store_users su ON u.user_id = su.user_id
WHERE u.email LIKE '%employee%@lifo-test.com'
AND su.role_in_store = 'employee';

-- Create some completed deliveries for testing
UPDATE user_mgmt.pin_deliveries 
SET delivery_status = 'delivered',
    delivery_sent_at = NOW() - INTERVAL '30 minutes',
    delivery_confirmed_at = NOW() - INTERVAL '15 minutes'
WHERE delivery_method = 'email';

-- Set PIN hash for one test employee to simulate completed PIN setup
UPDATE user_mgmt.users 
SET pin_hash = '$2b$12$test.pin.hash.1234.for.testing.only',
    pin_set_at = NOW() - INTERVAL '1 day'
WHERE email = 'test.employee@lifo-test.com';

COMMIT;