-- Migration: 014_fix_constraints_and_policies_final.sql
-- Final cleanup of foreign key constraints and RLS policies
-- This ensures complete auth.users integration

BEGIN;

-- =============================================
-- STEP 1: ADD MISSING FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add missing business.stores.owner_id constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stores_owner_id_fkey' 
        AND table_schema = 'business' 
        AND table_name = 'stores'
    ) THEN
        -- First clean any invalid owner_ids
        UPDATE business.stores 
        SET owner_id = NULL 
        WHERE owner_id IS NOT NULL 
        AND owner_id NOT IN (SELECT id FROM auth.users);
        
        -- Add the constraint
        ALTER TABLE business.stores 
        ADD CONSTRAINT stores_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added stores_owner_id_fkey constraint';
    ELSE
        RAISE NOTICE 'stores_owner_id_fkey constraint already exists';
    END IF;
END $$;

-- =============================================
-- STEP 2: UPDATE POLICIES TO USE AUTH.USERS
-- =============================================

-- Drop old user_mgmt policies that reference user_mgmt.users
DROP POLICY IF EXISTS "Store managers can view employee PIN deliveries" ON user_mgmt.pin_deliveries;
DROP POLICY IF EXISTS "Users can view their own PIN deliveries" ON user_mgmt.pin_deliveries;

-- Create new policies that work with auth.users
CREATE POLICY "Users can view their own PIN deliveries" ON user_mgmt.pin_deliveries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Store managers can view PIN deliveries for their stores" ON user_mgmt.pin_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business.store_users su
            WHERE su.store_id = pin_deliveries.store_id
            AND su.user_id = auth.uid()
            AND su.role_in_store IN ('manager', 'owner')
            AND su.is_active = TRUE
        )
    );

-- Update user_preferences policies to use auth.users
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_mgmt.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_mgmt.user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_mgmt.user_preferences;

-- Recreate with correct auth.users references
CREATE POLICY "Users can view own preferences" ON user_mgmt.user_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON user_mgmt.user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON user_mgmt.user_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- Update user_mgmt.users policies (these should be deprecated but let's fix them)
DROP POLICY IF EXISTS "users_select_own" ON user_mgmt.users;
DROP POLICY IF EXISTS "users_update_own" ON user_mgmt.users;

CREATE POLICY "users_select_own" ON user_mgmt.users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own" ON user_mgmt.users
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- STEP 3: CLEAN UP INVENTORY POLICIES THAT REFERENCE user_mgmt FUNCTIONS
-- =============================================

-- These policies reference user_mgmt.has_role functions that may not exist
-- Let's simplify them to use only store access

-- Update batches policies
DROP POLICY IF EXISTS "Consolidated batches DELETE access" ON inventory.batches;
CREATE POLICY "Consolidated batches DELETE access" ON inventory.batches
    FOR DELETE USING (user_has_store_access(store_id, 'manager'));

DROP POLICY IF EXISTS "Consolidated batches UPDATE access" ON inventory.batches;
CREATE POLICY "Consolidated batches UPDATE access" ON inventory.batches
    FOR UPDATE USING (
        user_has_store_access(store_id, 'staff') OR 
        created_by = auth.uid()
    );

-- Update products policies
DROP POLICY IF EXISTS "Consolidated products DELETE access" ON inventory.products;
CREATE POLICY "Consolidated products DELETE access" ON inventory.products
    FOR DELETE USING (user_has_store_access(store_id, 'manager'));

DROP POLICY IF EXISTS "Consolidated products UPDATE access" ON inventory.products;
CREATE POLICY "Consolidated products UPDATE access" ON inventory.products
    FOR UPDATE USING (
        user_has_store_access(store_id, 'staff') OR 
        created_by = auth.uid()
    );

-- =============================================
-- STEP 4: ADD MISSING FOREIGN KEY CONSTRAINTS FOR USER REFERENCES
-- =============================================

-- Add constraints for user reference columns where they're missing

-- business.store_users.user_id (should already exist but let's ensure)
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
    END IF;
END $$;

-- business.store_users.assigned_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'store_users_assigned_by_fkey' 
        AND table_schema = 'business' 
        AND table_name = 'store_users'
    ) THEN
        -- Clean invalid references first
        UPDATE business.store_users 
        SET assigned_by = NULL 
        WHERE assigned_by IS NOT NULL 
        AND assigned_by NOT IN (SELECT id FROM auth.users);
        
        ALTER TABLE business.store_users 
        ADD CONSTRAINT store_users_assigned_by_fkey 
        FOREIGN KEY (assigned_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Added store_users_assigned_by_fkey constraint';
    END IF;
END $$;

-- user_mgmt.pin_deliveries.user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pin_deliveries_user_id_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'pin_deliveries'
    ) THEN
        ALTER TABLE user_mgmt.pin_deliveries 
        ADD CONSTRAINT pin_deliveries_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added pin_deliveries_user_id_fkey constraint';
    END IF;
END $$;

-- user_mgmt.pin_deliveries.delivered_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pin_deliveries_delivered_by_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'pin_deliveries'
    ) THEN
        -- Clean invalid references first
        UPDATE user_mgmt.pin_deliveries 
        SET delivered_by = NULL 
        WHERE delivered_by IS NOT NULL 
        AND delivered_by NOT IN (SELECT id FROM auth.users);
        
        ALTER TABLE user_mgmt.pin_deliveries 
        ADD CONSTRAINT pin_deliveries_delivered_by_fkey 
        FOREIGN KEY (delivered_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Added pin_deliveries_delivered_by_fkey constraint';
    END IF;
END $$;

-- user_mgmt.user_roles.user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE user_mgmt.user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_roles_user_id_fkey constraint';
    END IF;
END $$;

-- user_mgmt.user_roles.assigned_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_assigned_by_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'user_roles'
    ) THEN
        -- Clean invalid references first
        UPDATE user_mgmt.user_roles 
        SET assigned_by = NULL 
        WHERE assigned_by IS NOT NULL 
        AND assigned_by NOT IN (SELECT id FROM auth.users);
        
        ALTER TABLE user_mgmt.user_roles 
        ADD CONSTRAINT user_roles_assigned_by_fkey 
        FOREIGN KEY (assigned_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_roles_assigned_by_fkey constraint';
    END IF;
END $$;

-- user_mgmt.user_preferences.user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_preferences_user_id_fkey' 
        AND table_schema = 'user_mgmt' 
        AND table_name = 'user_preferences'
    ) THEN
        ALTER TABLE user_mgmt.user_preferences 
        ADD CONSTRAINT user_preferences_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_preferences_user_id_fkey constraint';
    END IF;
END $$;

-- =============================================
-- STEP 5: VALIDATION AND REPORTING
-- =============================================

-- Final validation
DO $$
DECLARE
    fk_count INTEGER;
    policy_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- Count foreign key constraints to auth.users
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth' AND ccu.table_name = 'users';
    
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies;
    
    -- Check for orphaned store_users
    SELECT COUNT(*) INTO orphaned_count
    FROM business.store_users su
    WHERE su.user_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '=== FINAL VALIDATION RESULTS ===';
    RAISE NOTICE 'Foreign key constraints to auth.users: %', fk_count;
    RAISE NOTICE 'Total RLS policies: %', policy_count;
    RAISE NOTICE 'Orphaned store_users records: %', orphaned_count;
    
    IF fk_count >= 6 AND orphaned_count = 0 THEN
        RAISE NOTICE '✅ DATABASE CONSTRAINTS AND POLICIES SUCCESSFULLY FIXED!';
    ELSE
        RAISE WARNING '⚠️ Some issues may remain - check constraints and data integrity';
    END IF;
END $$;

COMMIT;

-- =============================================
-- POST-MIGRATION CLEANUP RECOMMENDATIONS
-- =============================================

-- Run these queries after migration to verify everything is working:

-- 1. List all foreign key constraints to auth.users:
-- SELECT tc.table_schema || '.' || tc.table_name as table_name, tc.constraint_name, kcu.column_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_schema = 'auth' AND ccu.table_name = 'users'
-- ORDER BY tc.table_schema, tc.table_name;

-- 2. Check for any remaining data integrity issues:
-- SELECT 'store_users' as table_name, COUNT(*) as orphaned_records
-- FROM business.store_users su WHERE su.user_id NOT IN (SELECT id FROM auth.users)
-- UNION ALL
-- SELECT 'pin_deliveries', COUNT(*) FROM user_mgmt.pin_deliveries pd WHERE pd.user_id NOT IN (SELECT id FROM auth.users)
-- UNION ALL  
-- SELECT 'user_roles', COUNT(*) FROM user_mgmt.user_roles ur WHERE ur.user_id NOT IN (SELECT id FROM auth.users);

-- 3. Verify auth.users metadata migration:
-- SELECT COUNT(*) as migrated_users FROM auth.users 
-- WHERE (raw_user_meta_data->>'migrated_from_user_mgmt')::boolean = true;