-- Migration: 016_update_schema_constraints_remove_viewer.sql
-- Update database schema constraints to remove 'viewer' role references
-- This ensures consistency after role renaming from viewer to employee

BEGIN;

-- Update CHECK constraint in business.store_users to remove 'viewer' 
-- Since migration 002 already renamed existing data, we just need to update the constraint
ALTER TABLE business.store_users 
DROP CONSTRAINT IF EXISTS store_users_role_in_store_check;

ALTER TABLE business.store_users 
ADD CONSTRAINT store_users_role_in_store_check 
CHECK (role_in_store IN ('owner', 'manager', 'employee', 'staff'));

-- Update the helper function to remove 'viewer' references
CREATE OR REPLACE FUNCTION user_has_store_access(target_store_id UUID, required_role TEXT DEFAULT 'employee')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business.store_users su
        WHERE su.store_id = target_store_id
        AND su.user_id = auth.uid()
        AND su.is_active = TRUE
        AND (
            su.role_in_store = 'owner' OR
            su.role_in_store = 'manager' OR
            (required_role = 'employee' AND su.role_in_store IN ('employee', 'staff'))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the 'viewer' role from user_mgmt.roles if it still exists
-- (This is a safety check in case migration 002 didn't run properly)
DELETE FROM user_mgmt.roles WHERE role_name = 'viewer';

-- Add a validation check to ensure no 'viewer' roles remain
DO $$
DECLARE
    viewer_count INTEGER;
BEGIN
    -- Check for any remaining 'viewer' role assignments
    SELECT COUNT(*) INTO viewer_count 
    FROM business.store_users 
    WHERE role_in_store = 'viewer';
    
    IF viewer_count > 0 THEN
        RAISE WARNING 'Found % store_users with viewer role - these should have been migrated to employee', viewer_count;
        
        -- Auto-fix any remaining viewer roles
        UPDATE business.store_users 
        SET role_in_store = 'employee'
        WHERE role_in_store = 'viewer';
        
        RAISE NOTICE 'Updated % viewer roles to employee', viewer_count;
    END IF;
    
    -- Check for viewer role in roles table
    SELECT COUNT(*) INTO viewer_count 
    FROM user_mgmt.roles 
    WHERE role_name = 'viewer';
    
    IF viewer_count > 0 THEN
        RAISE NOTICE 'Removed % viewer roles from roles table', viewer_count;
    END IF;
END $$;

COMMIT;

-- Verification queries (commented for reference):
-- 
-- Check that no viewer roles remain:
-- SELECT COUNT(*) as viewer_roles FROM user_mgmt.roles WHERE role_name = 'viewer';
-- SELECT COUNT(*) as viewer_assignments FROM business.store_users WHERE role_in_store = 'viewer';
-- 
-- Check updated constraint:
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'store_users_role_in_store_check';