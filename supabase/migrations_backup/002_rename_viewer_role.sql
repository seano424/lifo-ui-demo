-- Migration: 002_rename_viewer_role.sql
BEGIN;

-- Update the role name in roles table
UPDATE user_mgmt.roles 
SET role_name = 'employee', 
    description = 'Store employee with basic access permissions'
WHERE role_name = 'viewer';

-- Update existing user role assignments
-- This affects business.store_users table
UPDATE business.store_users 
SET role_in_store = 'employee'
WHERE role_in_store = 'viewer';

-- Update any hardcoded role checks in RLS policies
-- (Check existing policies for 'viewer' references)

COMMIT;