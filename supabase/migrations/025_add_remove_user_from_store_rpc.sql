-- Migration: Add SECURITY DEFINER RPC for removing users from stores
-- Created: 2025-01-03
-- Purpose: Bypasses RLS to allow managers/owners to permanently remove other users from stores
--
-- Dependencies:
-- - Requires business.user_can_manage_store_users() function (created in earlier migration)
--   This function enforces role hierarchy: owners can manage anyone, managers can manage employees/staff only
--
-- This function addresses the RLS permission issue where direct table updates
-- were blocked because the policy only allows users to update their own records.
--
-- Key Features:
-- - Uses SECURITY DEFINER to bypass RLS restrictions
-- - Enforces permission checks via business.user_can_manage_store_users()
-- - Prevents self-removal
-- - Provides detailed audit trail in response
-- - Permanently removes user from store (DELETE vs UPDATE is_active = false)

CREATE OR REPLACE FUNCTION public.remove_user_from_store(
  p_store_id UUID,
  p_target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'business', 'auth', 'public'
AS $$
DECLARE
  v_current_user_id UUID;
  v_can_manage BOOLEAN;
  v_target_user_role TEXT;
  v_target_is_active BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User must be authenticated'
    );
  END IF;

  -- Prevent self-removal
  IF p_target_user_id = v_current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot remove yourself from the store'
    );
  END IF;

  -- Check if current user has permission to manage the target user
  SELECT business.user_can_manage_store_users(p_store_id, p_target_user_id)
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to manage this user'
    );
  END IF;

  -- Get target user info before deletion
  SELECT role_in_store, is_active
  INTO v_target_user_role, v_target_is_active
  FROM business.store_users
  WHERE store_id = p_store_id AND user_id = p_target_user_id;

  IF v_target_user_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found in this store'
    );
  END IF;

  -- Permanently remove user from store (DELETE instead of soft delete)
  DELETE FROM business.store_users
  WHERE store_id = p_store_id AND user_id = p_target_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to remove user from store'
    );
  END IF;

  -- Return success with audit trail
  RETURN json_build_object(
    'success', true,
    'message', 'User permanently removed from store',
    'removed_user_id', p_target_user_id,
    'removed_user_role', v_target_user_role,
    'was_active', v_target_is_active,
    'removed_by', v_current_user_id,
    'removed_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An unexpected error occurred: ' || SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users only
-- NOTE: anon users explicitly NOT granted permission as they should not perform destructive operations
GRANT EXECUTE ON FUNCTION public.remove_user_from_store(UUID, UUID) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION public.remove_user_from_store IS
  'Permanently removes a user from a store with proper permission checks. Uses SECURITY DEFINER to bypass RLS restrictions. Enforces role hierarchy: owners can remove anyone (except self), managers can remove employees/staff only.';
