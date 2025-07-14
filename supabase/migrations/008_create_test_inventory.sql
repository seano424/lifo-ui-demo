-- Migration: 008_create_test_inventory.sql
BEGIN;

DO $$
DECLARE
    test_store_id UUID;
    test_product_id_1 UUID;
    test_product_id_2 UUID;
    test_batch_id_1 UUID;
    test_batch_id_2 UUID;
BEGIN
    -- Get test store ID
    SELECT store_id INTO test_store_id 
    FROM business.stores 
    WHERE store_code = 'TEST-PIN-001';
    
    -- Create test products
    INSERT INTO inventory.products (
        store_id,
        sku,
        name,
        category,
        brand,
        unit_type,
        typical_shelf_life_days,
        base_cost_price,
        base_selling_price,
        created_by
    ) VALUES 
    (
        test_store_id,
        'TEST-MILK-001',
        'Test Organic Milk 1L',
        'dairy',
        'Test Brand',
        'bottles',
        7,
        1.20,
        2.50,
        (SELECT user_id FROM user_mgmt.users WHERE email = 'test.owner@lifo-test.com')
    ),
    (
        test_store_id,
        'TEST-BREAD-001',
        'Test Fresh Bread',
        'bakery_fresh',
        'Test Bakery',
        'loaves',
        3,
        1.00,
        2.00,
        (SELECT user_id FROM user_mgmt.users WHERE email = 'test.owner@lifo-test.com')
    ) RETURNING product_id INTO test_product_id_1;
    
    -- Get product IDs
    SELECT product_id INTO test_product_id_1 
    FROM inventory.products 
    WHERE sku = 'TEST-MILK-001' AND store_id = test_store_id;
    
    SELECT product_id INTO test_product_id_2 
    FROM inventory.products 
    WHERE sku = 'TEST-BREAD-001' AND store_id = test_store_id;
    
    -- Create test batches
    INSERT INTO inventory.batches (
        product_id,
        store_id,
        batch_number,
        expiry_date,
        manufacture_date,
        initial_quantity,
        current_quantity,
        cost_price,
        selling_price,
        location_code,
        created_by
    ) VALUES 
    (
        test_product_id_1,
        test_store_id,
        'MILK-BATCH-001',
        CURRENT_DATE + INTERVAL '5 days',
        CURRENT_DATE - INTERVAL '2 days',
        20,
        15,
        1.20,
        2.50,
        'FRIDGE-A1',
        (SELECT user_id FROM user_mgmt.users WHERE email = 'test.manager@lifo-test.com')
    ),
    (
        test_product_id_2,
        test_store_id,
        'BREAD-BATCH-001',
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_DATE,
        10,
        7,
        1.00,
        2.00,
        'SHELF-B2',
        (SELECT user_id FROM user_mgmt.users WHERE email = 'test.employee@lifo-test.com')
    );
    
END $$;

COMMIT;