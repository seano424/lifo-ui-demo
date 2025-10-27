-- Migration: 007_create_test_data_for_validation.sql - CORRECTED VERSION
-- Fixed to match actual database schema with user_id, username, password_hash columns

BEGIN;

-- First, ensure we have a test store
INSERT INTO business.stores (
    store_name,
    store_code,
    business_name,
    store_type,
    city,
    country,
    is_active,
    onboarding_completed
) VALUES (
    'Test Store - PIN Validation',
    'TEST-PIN-001',
    'LIFO Test Business',
    'convenience',
    'Test City',
    'France',
    TRUE,
    TRUE
) ON CONFLICT (store_code) DO NOTHING;

-- Create test data using actual schema structure
DO $$
DECLARE
    test_store_id UUID;
    test_owner_id UUID;
    test_manager_id UUID;
    test_employee_id UUID;
    test_employee2_id UUID;
    test_employee3_id UUID;
BEGIN
    -- Get test store ID
    SELECT store_id INTO test_store_id 
    FROM business.stores 
    WHERE store_code = 'TEST-PIN-001';
    
    -- Create test users in auth.users (Supabase's built-in user table)
    -- Check and insert test owner
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.owner@lifo-test.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), 'test.owner@lifo-test.com', crypt('dummy_password', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;
    
    -- Check and insert test manager
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.manager@lifo-test.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), 'test.manager@lifo-test.com', crypt('dummy_password', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;
    
    -- Check and insert test employees
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.employee@lifo-test.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), 'test.employee@lifo-test.com', crypt('dummy_password', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.employee2@lifo-test.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), 'test.employee2@lifo-test.com', crypt('dummy_password', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.employee3@lifo-test.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), 'test.employee3@lifo-test.com', crypt('dummy_password', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated');
    END IF;
    
    -- Get user IDs for assignments
    SELECT id INTO test_owner_id 
    FROM auth.users 
    WHERE email = 'test.owner@lifo-test.com';
    
    SELECT id INTO test_manager_id 
    FROM auth.users 
    WHERE email = 'test.manager@lifo-test.com';
    
    SELECT id INTO test_employee_id 
    FROM auth.users 
    WHERE email = 'test.employee@lifo-test.com';
    
    SELECT id INTO test_employee2_id 
    FROM auth.users 
    WHERE email = 'test.employee2@lifo-test.com';
    
    SELECT id INTO test_employee3_id 
    FROM auth.users 
    WHERE email = 'test.employee3@lifo-test.com';
    
    -- Update store owner reference
    UPDATE business.stores 
    SET owner_id = test_owner_id 
    WHERE store_id = test_store_id;
    
    -- Create store user assignments (using correct column names from schema)
    INSERT INTO business.store_users (
        store_id,
        user_id,                -- Correct column name from types
        role_in_store,
        is_active,
        can_use_pin_auth,       -- Added in migration 005
        pin_access_level,       -- Added in migration 005
        pin_permissions         -- Added in migration 005
    ) VALUES 
    -- Owner assignment
    (
        test_store_id,
        test_owner_id,
        'owner',
        TRUE,
        TRUE,
        'admin',
        jsonb_build_object(
            'can_view_inventory', true,
            'can_update_quantities', true,
            'can_create_batches', true,
            'can_apply_discounts', true,
            'can_access_analytics', true,
            'can_manage_employees', true,
            'can_manage_store_settings', true
        )
    ),
    -- Manager assignment
    (
        test_store_id,
        test_manager_id,
        'manager',
        TRUE,
        TRUE,
        'admin',
        jsonb_build_object(
            'can_view_inventory', true,
            'can_update_quantities', true,
            'can_create_batches', true,
            'can_apply_discounts', true,
            'can_access_analytics', true,
            'can_manage_employees', true
        )
    ),
    -- Employee assignments
    (
        test_store_id,
        test_employee_id,
        'employee',
        TRUE,
        TRUE,
        'basic',
        jsonb_build_object(
            'can_view_inventory', true,
            'can_update_quantities', true,
            'can_create_batches', false,
            'can_apply_discounts', false,
            'can_access_analytics', false
        )
    ),
    (
        test_store_id,
        test_employee2_id,
        'employee',
        TRUE,
        TRUE,
        'basic',
        jsonb_build_object(
            'can_view_inventory', true,
            'can_update_quantities', true,
            'can_create_batches', false,
            'can_apply_discounts', false,
            'can_access_analytics', false
        )
    ),
    (
        test_store_id,
        test_employee3_id,
        'employee',
        TRUE,
        TRUE,
        'basic',
        jsonb_build_object(
            'can_view_inventory', true,
            'can_update_quantities', true,
            'can_create_batches', false,
            'can_apply_discounts', false,
            'can_access_analytics', false
        )
    )
    ON CONFLICT (store_id, user_id) DO UPDATE SET
        role_in_store = EXCLUDED.role_in_store,
        can_use_pin_auth = EXCLUDED.can_use_pin_auth,
        pin_access_level = EXCLUDED.pin_access_level,
        pin_permissions = EXCLUDED.pin_permissions;
    
    RAISE NOTICE 'Test data created successfully:';
    RAISE NOTICE '- Store: % (%)', 'Test Store - PIN Validation', test_store_id;
    RAISE NOTICE '- Owner: test.owner@lifo-test.com (%)', test_owner_id;
    RAISE NOTICE '- Manager: test.manager@lifo-test.com (%)', test_manager_id;
    RAISE NOTICE '- Employees: 3 test employees created';
    
END $$;

COMMIT;