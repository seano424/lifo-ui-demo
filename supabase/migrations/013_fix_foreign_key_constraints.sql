-- Migration: 013_fix_foreign_key_constraints.sql
-- Update all foreign key constraints to reference auth.users instead of user_mgmt.users
-- This ensures referential integrity with Supabase Auth as the source of truth

BEGIN;

-- Step 1: Drop existing foreign key constraints that reference user_mgmt.users
-- Note: Some of these might not exist if the schema was already using auth.users

-- Drop user_roles foreign key to user_mgmt.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE user_mgmt.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
        RAISE NOTICE 'Dropped user_roles_user_id_fkey constraint';
    END IF;
END $$;

-- Drop user_roles assigned_by foreign key to user_mgmt.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_assigned_by_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE user_mgmt.user_roles DROP CONSTRAINT user_roles_assigned_by_fkey;
        RAISE NOTICE 'Dropped user_roles_assigned_by_fkey constraint';
    END IF;
END $$;

-- Drop pin_deliveries foreign key to user_mgmt.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pin_deliveries_user_id_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'pin_deliveries'
    ) THEN
        ALTER TABLE user_mgmt.pin_deliveries DROP CONSTRAINT pin_deliveries_user_id_fkey;
        RAISE NOTICE 'Dropped pin_deliveries_user_id_fkey constraint';
    END IF;
END $$;

-- Drop pin_deliveries delivered_by foreign key to user_mgmt.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pin_deliveries_delivered_by_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'pin_deliveries'
    ) THEN
        ALTER TABLE user_mgmt.pin_deliveries DROP CONSTRAINT pin_deliveries_delivered_by_fkey;
        RAISE NOTICE 'Dropped pin_deliveries_delivered_by_fkey constraint';
    END IF;
END $$;

-- Step 2: Add new foreign key constraints to auth.users
-- These will ensure referential integrity with Supabase Auth

-- Add user_roles foreign key to auth.users
ALTER TABLE user_mgmt.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_roles assigned_by foreign key to auth.users
ALTER TABLE user_mgmt.user_roles 
ADD CONSTRAINT user_roles_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES auth.users(id);

-- Add pin_deliveries foreign key to auth.users
ALTER TABLE user_mgmt.pin_deliveries 
ADD CONSTRAINT pin_deliveries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add pin_deliveries delivered_by foreign key to auth.users
ALTER TABLE user_mgmt.pin_deliveries 
ADD CONSTRAINT pin_deliveries_delivered_by_fkey 
FOREIGN KEY (delivered_by) REFERENCES auth.users(id);

-- Step 3: Update business schema foreign keys (these should already exist but let's ensure they're correct)

-- Verify stores.owner_id references auth.users (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stores_owner_id_fkey' 
        AND table_schema = 'business' 
        AND table_name = 'stores'
    ) THEN
        ALTER TABLE business.stores 
        ADD CONSTRAINT stores_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES auth.users(id);
        RAISE NOTICE 'Added stores_owner_id_fkey constraint';
    ELSE
        RAISE NOTICE 'stores_owner_id_fkey constraint already exists';
    END IF;
END $$;

-- Verify store_users.user_id references auth.users (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'store_users_user_id_fkey' 
        AND table_schema = 'business' 
        AND table_name = 'store_users'
    ) THEN
        ALTER TABLE business.store_users 
        ADD CONSTRAINT store_users_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added store_users_user_id_fkey constraint';
    ELSE
        RAISE NOTICE 'store_users_user_id_fkey constraint already exists';
    END IF;
END $$;

-- Verify store_users.assigned_by references auth.users (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'store_users_assigned_by_fkey' 
        AND table_schema = 'business' 
        AND table_name = 'store_users'
    ) THEN
        ALTER TABLE business.store_users 
        ADD CONSTRAINT store_users_assigned_by_fkey 
        FOREIGN KEY (assigned_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Added store_users_assigned_by_fkey constraint';
    ELSE
        RAISE NOTICE 'store_users_assigned_by_fkey constraint already exists';
    END IF;
END $$;

-- Step 4: Update other schema foreign keys to reference auth.users

-- Update inventory.products foreign keys
DO $$
BEGIN
    -- Drop old constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_created_by_fkey' 
        AND table_schema = 'inventory' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE inventory.products DROP CONSTRAINT products_created_by_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_updated_by_fkey' 
        AND table_schema = 'inventory' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE inventory.products DROP CONSTRAINT products_updated_by_fkey;
    END IF;
    
    -- Add new constraints to auth.users
    ALTER TABLE inventory.products 
    ADD CONSTRAINT products_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
    
    ALTER TABLE inventory.products 
    ADD CONSTRAINT products_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
    
    RAISE NOTICE 'Updated inventory.products foreign key constraints';
END $$;

-- Update inventory.batches foreign keys
DO $$
BEGIN
    -- Drop old constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'batches_created_by_fkey' 
        AND table_schema = 'inventory' 
        AND table_name = 'batches'
    ) THEN
        ALTER TABLE inventory.batches DROP CONSTRAINT batches_created_by_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'batches_updated_by_fkey' 
        AND table_schema = 'inventory' 
        AND table_name = 'batches'
    ) THEN
        ALTER TABLE inventory.batches DROP CONSTRAINT batches_updated_by_fkey;
    END IF;
    
    -- Add new constraints to auth.users
    ALTER TABLE inventory.batches 
    ADD CONSTRAINT batches_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
    
    ALTER TABLE inventory.batches 
    ADD CONSTRAINT batches_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
    
    RAISE NOTICE 'Updated inventory.batches foreign key constraints';
END $$;

-- Update analytics.actions foreign key
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'actions_executed_by_fkey' 
        AND table_schema = 'analytics' 
        AND table_name = 'actions'
    ) THEN
        ALTER TABLE analytics.actions DROP CONSTRAINT actions_executed_by_fkey;
    END IF;
    
    -- Add new constraint to auth.users
    ALTER TABLE analytics.actions 
    ADD CONSTRAINT actions_executed_by_fkey 
    FOREIGN KEY (executed_by) REFERENCES auth.users(id);
    
    RAISE NOTICE 'Updated analytics.actions foreign key constraint';
END $$;

-- Step 5: Validation - Check all foreign key constraints are properly set up
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'users' AND ccu.table_schema = 'auth'
    AND tc.constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Total foreign key constraints referencing auth.users: %', constraint_count;
    
    -- List all tables that now reference auth.users
    FOR constraint_count IN 
        SELECT DISTINCT tc.table_schema || '.' || tc.table_name as referencing_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'users' AND ccu.table_schema = 'auth'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE NOTICE 'Table referencing auth.users: %', constraint_count;
    END LOOP;
END $$;

COMMIT;

-- Post-migration verification (run manually to check):
--
-- 1. List all foreign key constraints to auth.users:
-- SELECT 
--     tc.table_schema,
--     tc.table_name,
--     tc.constraint_name,
--     kcu.column_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
-- WHERE ccu.table_name = 'users' 
-- AND ccu.table_schema = 'auth'
-- AND tc.constraint_type = 'FOREIGN KEY'
-- ORDER BY tc.table_schema, tc.table_name;
--
-- 2. Check for any remaining references to user_mgmt.users:
-- SELECT 
--     tc.table_schema,
--     tc.table_name,
--     tc.constraint_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
-- WHERE ccu.table_name = 'users' 
-- AND ccu.table_schema = 'user_mgmt'
-- AND tc.constraint_type = 'FOREIGN KEY';