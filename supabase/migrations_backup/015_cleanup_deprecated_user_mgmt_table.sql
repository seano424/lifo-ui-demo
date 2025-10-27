-- Migration: 015_cleanup_deprecated_user_mgmt_table.sql
-- Safe cleanup of deprecated user_mgmt.users table
-- This should only be run AFTER frontend migration is complete

BEGIN;

-- =============================================
-- SAFETY CHECKS BEFORE CLEANUP
-- =============================================

DO $$
DECLARE
    migrated_count INTEGER;
    user_mgmt_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- Verify all user_mgmt.users data was migrated to auth.users
    SELECT COUNT(*) INTO migrated_count
    FROM auth.users 
    WHERE (raw_user_meta_data->>'migrated_from_user_mgmt')::boolean = true;
    
    SELECT COUNT(*) INTO user_mgmt_count
    FROM user_mgmt.users;
    
    -- Check for any remaining dependencies
    SELECT COUNT(*) INTO orphaned_count
    FROM business.store_users su
    WHERE su.user_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '=== CLEANUP SAFETY CHECK ===';
    RAISE NOTICE 'Users migrated to auth.users: %', migrated_count;
    RAISE NOTICE 'Users in user_mgmt.users: %', user_mgmt_count;
    RAISE NOTICE 'Orphaned store_users: %', orphaned_count;
    
    IF migrated_count >= user_mgmt_count AND orphaned_count = 0 THEN
        RAISE NOTICE '✅ SAFE TO PROCEED WITH CLEANUP';
    ELSE
        RAISE EXCEPTION '❌ NOT SAFE TO CLEANUP - data migration incomplete or dependencies exist';
    END IF;
END $$;

-- =============================================
-- STEP 1: BACKUP USER_MGMT.USERS DATA (OPTIONAL)
-- =============================================

-- Create a backup table with timestamp for safety
CREATE TABLE IF NOT EXISTS user_mgmt.users_backup_before_cleanup AS 
SELECT 
    *,
    NOW() as backup_created_at,
    'pre_cleanup_backup' as backup_reason
FROM user_mgmt.users;

RAISE NOTICE 'Created backup table: user_mgmt.users_backup_before_cleanup';

-- =============================================
-- STEP 2: DROP POLICIES THAT REFERENCE USER_MGMT.USERS
-- =============================================

-- Drop policies that specifically reference user_mgmt.users table
DROP POLICY IF EXISTS "users_select_own" ON user_mgmt.users;
DROP POLICY IF EXISTS "users_update_own" ON user_mgmt.users;

RAISE NOTICE 'Dropped user_mgmt.users policies';

-- =============================================
-- STEP 3: DROP THE DEPRECATED TABLE
-- =============================================

-- Drop the user_mgmt.users table (CASCADE will handle any remaining dependencies)
DROP TABLE user_mgmt.users CASCADE;

RAISE NOTICE '🗑️ Dropped user_mgmt.users table and all dependencies';

-- =============================================
-- STEP 4: CLEANUP VALIDATION
-- =============================================

DO $$
DECLARE
    remaining_policies INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Check if table still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users'
    ) INTO table_exists;
    
    -- Count remaining policies that might reference the old table
    SELECT COUNT(*) INTO remaining_policies
    FROM pg_policies 
    WHERE schemaname = 'user_mgmt' 
    AND (qual LIKE '%user_mgmt.users%' OR with_check LIKE '%user_mgmt.users%');
    
    IF NOT table_exists AND remaining_policies = 0 THEN
        RAISE NOTICE '✅ CLEANUP SUCCESSFUL!';
        RAISE NOTICE '- user_mgmt.users table dropped';
        RAISE NOTICE '- No remaining policy references';
        RAISE NOTICE '- Backup preserved in user_mgmt.users_backup_before_cleanup';
    ELSE
        RAISE WARNING '⚠️ Cleanup may be incomplete - table_exists: %, remaining_policies: %', table_exists, remaining_policies;
    END IF;
END $$;

-- =============================================
-- STEP 5: UPDATE DOCUMENTATION
-- =============================================

-- Add a comment to the backup table
COMMENT ON TABLE user_mgmt.users_backup_before_cleanup IS 
'Backup of user_mgmt.users table before cleanup migration. All data migrated to auth.users.raw_user_meta_data. Safe to drop after verification period.';

COMMIT;

-- =============================================
-- POST-CLEANUP RECOMMENDATIONS
-- =============================================

-- After this migration:
-- 1. Verify frontend works correctly with auth.users metadata
-- 2. Monitor for any errors related to user_mgmt.users references
-- 3. After 30 days of stable operation, consider dropping the backup table:
--    DROP TABLE user_mgmt.users_backup_before_cleanup;

-- The user management system now fully uses Supabase Auth (auth.users) as the single source of truth!