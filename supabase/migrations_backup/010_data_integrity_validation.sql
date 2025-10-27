-- Migration: 010_data_integrity_validation.sql

-- Check 1: Verify we have test data to work with
DO $$
DECLARE
    employee_count INTEGER;
    store_count INTEGER;
    pin_delivery_count INTEGER;
BEGIN
    -- Check for employees
    SELECT COUNT(*) INTO employee_count 
    FROM business.store_users 
    WHERE role_in_store = 'employee';
    
    IF employee_count = 0 THEN
        RAISE EXCEPTION 'No employees found for testing - test data creation failed';
    END IF;
    
    RAISE NOTICE 'Found % employees for testing', employee_count;
    
    -- Check for test stores
    SELECT COUNT(*) INTO store_count 
    FROM business.stores 
    WHERE store_code LIKE 'TEST-%';
    
    IF store_count = 0 THEN
        RAISE EXCEPTION 'No test stores found - test data creation failed';
    END IF;
    
    RAISE NOTICE 'Found % test stores', store_count;
    
    -- Check for PIN deliveries
    SELECT COUNT(*) INTO pin_delivery_count 
    FROM user_mgmt.pin_deliveries;
    
    IF pin_delivery_count = 0 THEN
        RAISE EXCEPTION 'No PIN deliveries found - PIN delivery test data creation failed';
    END IF;
    
    RAISE NOTICE 'Found % PIN delivery records for testing', pin_delivery_count;
END $$;

-- Check 2: Verify role rename completed
DO $$
DECLARE
    viewer_count INTEGER;
    employee_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO viewer_count 
    FROM user_mgmt.roles 
    WHERE role_name = 'viewer';
    
    IF viewer_count > 0 THEN
        RAISE EXCEPTION 'Role rename failed: "viewer" role still exists';
    END IF;
    
    SELECT COUNT(*) INTO employee_count 
    FROM user_mgmt.roles 
    WHERE role_name = 'employee';
    
    IF employee_count = 0 THEN
        RAISE EXCEPTION 'Role rename failed: "employee" role not found';
    END IF;
    
    SELECT COUNT(*) INTO viewer_count 
    FROM business.store_users 
    WHERE role_in_store = 'viewer';
    
    IF viewer_count > 0 THEN
        RAISE EXCEPTION 'Role update failed: "viewer" assignments still exist in store_users';
    END IF;
    
    RAISE NOTICE 'Role rename validation passed: % employee roles found', employee_count;
END $$;

-- Check 3: Verify PIN functionality with test data
DO $$
DECLARE
    pin_enabled_count INTEGER;
    pin_delivery_methods TEXT[];
BEGIN
    -- Check PIN-enabled employees
    SELECT COUNT(*) INTO pin_enabled_count 
    FROM business.store_users 
    WHERE role_in_store = 'employee' 
    AND can_use_pin_auth = TRUE;
    
    IF pin_enabled_count = 0 THEN
        RAISE EXCEPTION 'No PIN-enabled employees found';
    END IF;
    
    -- Check delivery method variety
    SELECT ARRAY_AGG(DISTINCT delivery_method) INTO pin_delivery_methods
    FROM user_mgmt.pin_deliveries;
    
    IF array_length(pin_delivery_methods, 1) < 2 THEN
        RAISE EXCEPTION 'Insufficient PIN delivery method variety for testing';
    END IF;
    
    RAISE NOTICE 'PIN validation passed: % PIN-enabled employees, delivery methods: %', 
                 pin_enabled_count, pin_delivery_methods;
END $$;

-- Check 4: Test permission structure
DO $$
DECLARE
    permission_test JSONB;
BEGIN
    -- Test employee permissions structure
    SELECT pin_permissions INTO permission_test
    FROM business.store_users 
    WHERE role_in_store = 'employee' 
    LIMIT 1;
    
    IF NOT (permission_test ? 'can_view_inventory') THEN
        RAISE EXCEPTION 'Employee permissions missing required keys';
    END IF;
    
    RAISE NOTICE 'Permission structure validation passed';
END $$;

-- Summary report
SELECT 
    'Data Validation Summary' as report_section,
    (SELECT COUNT(*) FROM user_mgmt.users WHERE email LIKE '%@lifo-test.com') as test_users_created,
    (SELECT COUNT(*) FROM business.stores WHERE store_code LIKE 'TEST-%') as test_stores_created,
    (SELECT COUNT(*) FROM business.store_users WHERE role_in_store = 'employee') as employee_assignments,
    (SELECT COUNT(*) FROM user_mgmt.pin_deliveries) as pin_deliveries_created,
    (SELECT COUNT(*) FROM inventory.products WHERE sku LIKE 'TEST-%') as test_products_created,
    (SELECT COUNT(*) FROM inventory.batches WHERE batch_number LIKE '%BATCH%') as test_batches_created;