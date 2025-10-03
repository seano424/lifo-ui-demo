-- Migration: Add automatic refresh triggers for user permissions materialized view
-- This ensures the view stays in sync with store_users and stores tables

-- Create the refresh function
CREATE OR REPLACE FUNCTION business.refresh_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'business', 'public'
AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the UNIQUE index we created in the previous migration
  REFRESH MATERIALIZED VIEW CONCURRENTLY business.user_store_permissions;
  RETURN NULL;
END;
$$;

-- Add comment
COMMENT ON FUNCTION business.refresh_user_permissions() IS 
  'Automatically refreshes the user_store_permissions materialized view when store_users or stores change';

-- Trigger when store_users table changes (any INSERT, UPDATE, or DELETE)
CREATE TRIGGER trigger_refresh_user_permissions_on_store_users
AFTER INSERT OR UPDATE OR DELETE ON business.store_users
FOR EACH STATEMENT
EXECUTE FUNCTION business.refresh_user_permissions();

-- Trigger when stores owner_id changes
CREATE TRIGGER trigger_refresh_user_permissions_on_stores
AFTER UPDATE OF owner_id ON business.stores
FOR EACH STATEMENT
EXECUTE FUNCTION business.refresh_user_permissions();

-- Add comments on triggers
COMMENT ON TRIGGER trigger_refresh_user_permissions_on_store_users ON business.store_users IS
  'Refreshes user permissions when store user assignments change';

COMMENT ON TRIGGER trigger_refresh_user_permissions_on_stores ON business.stores IS
  'Refreshes user permissions when store ownership changes';