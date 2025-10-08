-- Migration: Add store deactivation RPC with GDPR compliance
-- Description: Safely deactivates a store and anonymizes employee personal data
-- Author: LIFO.AI Team
-- Date: 2025-10-08

-- Create the RPC function for safe store deactivation
CREATE OR REPLACE FUNCTION business.deactivate_store_safe(
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = business, public
AS $$
DECLARE
  v_user_id UUID;
  v_store_name TEXT;
  v_employee_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is store owner
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND role_in_store = 'owner'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only store owners can deactivate stores';
  END IF;

  -- Get store name for logging
  SELECT store_name INTO v_store_name
  FROM business.stores
  WHERE store_id = p_store_id;

  IF v_store_name IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  -- Soft delete the store
  UPDATE business.stores
  SET is_active = false,
      updated_at = NOW()
  WHERE store_id = p_store_id;

  -- GDPR Compliance: Anonymize employee personal data
  -- Only staff members (not owners/managers)
  WITH employees_to_anonymize AS (
    SELECT user_id
    FROM business.store_users
    WHERE store_id = p_store_id
    AND role_in_store = 'staff'
    AND is_active = true
  )
  UPDATE user_mgmt.users
  SET
    email = 'deleted_' || user_id || '@anonymized.lifo.local',
    full_name = 'Deleted User',
    password_hash = NULL,
    is_active = false
  WHERE user_id IN (SELECT user_id FROM employees_to_anonymize);

  -- Get count of anonymized employees
  GET DIAGNOSTICS v_employee_count = ROW_COUNT;

  -- Deactivate all store_users relationships for this store
  UPDATE business.store_users
  SET is_active = false,
      updated_at = NOW()
  WHERE store_id = p_store_id;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'store_id', p_store_id,
    'store_name', v_store_name,
    'deactivated_at', NOW(),
    'employees_anonymized', v_employee_count,
    'message', 'Store deactivated successfully. Employee data has been anonymized in compliance with GDPR.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to deactivate store: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- The function itself handles authorization via ownership check
GRANT EXECUTE ON FUNCTION business.deactivate_store_safe(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION business.deactivate_store_safe IS
'Safely deactivates a store and anonymizes employee personal data for GDPR compliance. Only store owners can execute this function. The function performs server-side authorization checks and ensures data integrity during deactivation.';
