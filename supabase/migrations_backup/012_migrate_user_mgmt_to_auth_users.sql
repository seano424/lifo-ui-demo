-- Migration: 012_migrate_user_mgmt_to_auth_users.sql
-- Migrate custom user data from user_mgmt.users to auth.users.raw_user_meta_data
-- This ensures all user data is consolidated in Supabase Auth

BEGIN;

-- Step 1: Update auth.users with custom metadata from user_mgmt.users
-- This preserves all custom fields as JSON metadata
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'username', umu.username,
        'full_name', umu.full_name,
        'last_login', umu.last_login,
        'avatar_url', umu.avatar_url,
        'pin_hash', umu.pin_hash,
        'pin_set_at', umu.pin_set_at,
        'pin_expires_at', umu.pin_expires_at,
        'pin_attempts', umu.pin_attempts,
        'pin_locked_until', umu.pin_locked_until,
        'requires_pin', umu.requires_pin,
        'pin_delivery_method', umu.pin_delivery_method,
        'is_active', umu.is_active,
        'migrated_from_user_mgmt', true,
        'migration_timestamp', NOW()
    )
FROM user_mgmt.users umu
WHERE auth.users.id = umu.user_id;

-- Step 2: Create any missing auth.users records for orphaned user_mgmt.users
-- This handles the case where user_mgmt.users exists but auth.users doesn't
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_user_meta_data
)
SELECT 
    umu.user_id,
    umu.email,
    umu.password_hash, -- Note: This may not be compatible with Supabase auth format
    NOW(), -- Confirm email immediately for migrated users
    umu.created_at,
    umu.updated_at,
    'authenticated',
    'authenticated',
    jsonb_build_object(
        'username', umu.username,
        'full_name', umu.full_name,
        'last_login', umu.last_login,
        'avatar_url', umu.avatar_url,
        'pin_hash', umu.pin_hash,
        'pin_set_at', umu.pin_set_at,
        'pin_expires_at', umu.pin_expires_at,
        'pin_attempts', umu.pin_attempts,
        'pin_locked_until', umu.pin_locked_until,
        'requires_pin', umu.requires_pin,
        'pin_delivery_method', umu.pin_delivery_method,
        'is_active', umu.is_active,
        'migrated_from_user_mgmt', true,
        'migration_timestamp', NOW(),
        'password_needs_reset', true -- Flag that password needs to be reset through Supabase Auth
    )
FROM user_mgmt.users umu
WHERE umu.user_id NOT IN (SELECT id FROM auth.users)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update foreign key references to ensure consistency
-- Fix any user_mgmt.user_roles that reference non-existent auth.users
UPDATE user_mgmt.user_roles 
SET user_id = (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = (
        SELECT email FROM user_mgmt.users umu 
        WHERE umu.user_id = user_roles.user_id
    )
    LIMIT 1
)
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 4: Update pin_deliveries user_id references if they exist
UPDATE user_mgmt.pin_deliveries 
SET user_id = (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = (
        SELECT email FROM user_mgmt.users umu 
        WHERE umu.user_id = pin_deliveries.user_id
    )
    LIMIT 1
)
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 5: Add check constraints to ensure referential integrity
-- Note: We can't add foreign key constraints here because they already exist
-- But we can add a check to validate the migration worked

-- Validation: Check that all store_users reference valid auth.users
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM business.store_users su
    WHERE su.user_id NOT IN (SELECT id FROM auth.users);
    
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned store_users records that don''t reference valid auth.users', orphaned_count;
    ELSE
        RAISE NOTICE 'All store_users records reference valid auth.users - migration successful!';
    END IF;
END $$;

-- Step 6: Log migration results
INSERT INTO user_mgmt.pin_deliveries (
    user_id,
    delivery_method,
    delivery_address,
    pin_reference,
    delivery_status,
    created_at
)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'migration@lifo.ai' LIMIT 1),
    'email',
    'migration@lifo.ai',
    'MIGRATION_LOG_' || extract(epoch from now())::text,
    'delivered',
    NOW()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

COMMIT;

-- Post-migration validation queries (run these manually to verify)
-- 
-- 1. Check migration coverage:
-- SELECT 
--     'auth.users' as table_name, COUNT(*) as count 
-- FROM auth.users 
-- WHERE (raw_user_meta_data->>'migrated_from_user_mgmt')::boolean = true
-- UNION ALL
-- SELECT 
--     'user_mgmt.users' as table_name, COUNT(*) as count 
-- FROM user_mgmt.users;
--
-- 2. Check for orphaned records:
-- SELECT COUNT(*) as orphaned_store_users 
-- FROM business.store_users su
-- WHERE su.user_id NOT IN (SELECT id FROM auth.users);
--
-- 3. Verify metadata migration:
-- SELECT 
--     email,
--     raw_user_meta_data->>'username' as username,
--     raw_user_meta_data->>'full_name' as full_name,
--     raw_user_meta_data->>'requires_pin' as requires_pin
-- FROM auth.users 
-- WHERE (raw_user_meta_data->>'migrated_from_user_mgmt')::boolean = true;