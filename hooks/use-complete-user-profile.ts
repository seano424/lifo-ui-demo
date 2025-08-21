import { useQuery } from '@tanstack/react-query'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
import type { CompleteUserProfile } from '@/lib/types/complete-user-profile'
import {
  getCurrentStore,
  getPermissions,
  getUserLanguage,
  hasCurrentStoreAccess,
  hasGlobalRole,
  hasStoreAccess,
  isPinLocked,
  isUserActive,
} from '@/lib/types/complete-user-profile'

// Query key for the consolidated profile
export const completeUserProfileQueryKey = (userId: string | null, storeId: string | null) =>
  ['completeUserProfile', userId, storeId] as const

// Main hook that replaces useCurrentUser, useCurrentUserStoreRole, and useCurrentUserRoles
export function useCompleteUserProfile() {
  const activeStoreId = useActiveStoreId()

  const result = useQuery({
    queryKey: completeUserProfileQueryKey('current', activeStoreId),
    queryFn: async (): Promise<CompleteUserProfile> => {
      const supabase = createClient()

      // Get current user ID first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Call the consolidated RPC function
      const { data, error } = await supabase.rpc('get_user_complete_profile', {
        p_user_id: user.id,
        p_store_id: activeStoreId,
      })

      if (error) {
        throw new Error(`Failed to fetch user profile: ${error.message}`)
      }

      if (!data) {
        throw new Error('User profile not found')
      }

      return data as CompleteUserProfile
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry authentication errors
      if (error?.message?.includes('Not authenticated')) {
        return false
      }
      return failureCount < 2
    },
  })

  const profile = result.data

  return {
    // Raw data
    data: profile,

    // Loading states (single source of truth!)
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,

    // User profile access
    user: profile?.user || null,
    isAuthenticated: !!profile?.user,

    // Store context
    activeStoreId,
    userStores: profile?.user_stores || [],
    currentStore: profile ? getCurrentStore(profile) : null,
    hasStoreAccess: profile ? hasStoreAccess(profile) : false,
    hasCurrentStoreAccess: profile ? hasCurrentStoreAccess(profile) : false,

    // Role information
    globalRoles: profile?.global_roles || [],
    storeRole: profile?.current_store?.role_in_store || null,

    // Permission summary (pre-calculated for performance)
    permissions: profile ? getPermissions(profile) : null,

    // Convenience role flags
    isOwner: profile?.permission_summary?.is_owner || false,
    isManager: profile?.permission_summary?.is_manager || false,
    isEmployee: profile?.permission_summary?.is_employee || false,
    isAdmin: profile ? hasGlobalRole(profile, 'admin') : false,

    // Specific permissions (no additional queries needed!)
    canManageUsers: profile?.permission_summary?.can_manage_users || false,
    canViewAnalytics: profile?.permission_summary?.can_view_analytics || false,
    canApplyDiscounts: profile?.permission_summary?.can_apply_discounts || false,
    canScanProducts: profile?.permission_summary?.can_scan_products || false,
    canUploadInventory: profile?.permission_summary?.can_upload_inventory || false,
    canManageSettings: profile?.permission_summary?.can_manage_settings || false,

    // PIN authentication
    canUsePinAuth: profile?.current_store?.can_use_pin_auth || false,
    pinAccessLevel: profile?.current_store?.pin_access_level || 'basic',
    isPinLocked: profile ? isPinLocked(profile) : false,
    requiresPin: profile?.user?.requires_pin || false,

    // User status
    isActiveUser: profile ? isUserActive(profile) : false,
    isActiveInStore: profile?.current_store?.is_active_in_store || false,

    // User preferences
    userLanguage: profile ? getUserLanguage(profile) : 'en',
    userPhone: profile?.user?.phone || null,
    hasPhone: !!(profile?.user?.phone && profile.user.phone.trim() !== ''),

    // Store ID for compatibility
    storeId: activeStoreId,
    storeName: profile?.current_store?.store_name || null,

    // Permission checker function
    can: (permission: string): boolean => {
      if (!profile?.current_store?.permissions) return false
      return profile.current_store.permissions[permission] === true
    },

    // Helper functions
    canEditProduct: (productCreatorId?: string): boolean => {
      if (!profile || !hasCurrentStoreAccess(profile)) return false
      const perms = getPermissions(profile)
      return perms?.is_owner || perms?.is_manager || productCreatorId === profile.user.id
    },

    canDeleteProduct: (productCreatorId?: string): boolean => {
      if (!profile || !hasCurrentStoreAccess(profile)) return false
      const perms = getPermissions(profile)
      return perms?.is_owner || perms?.is_manager || productCreatorId === profile.user.id
    },

    canSetPin: (): boolean => {
      if (!profile) return false
      return profile.user.requires_pin || hasGlobalRole(profile, 'admin')
    },

    canResetPin: (targetUserId?: string): boolean => {
      if (!profile) return false
      const perms = getPermissions(profile)
      return perms?.is_owner || targetUserId === profile.user.id
    },

    // Store switching helper
    getStoreAccess: (storeId: string) => {
      return profile?.user_stores.find(store => store.store_id === storeId) || null
    },

    // Debug information
    _debug: {
      queryKey: completeUserProfileQueryKey('current', activeStoreId),
      queryTime: profile?.metadata?.query_timestamp,
      totalStores: profile?.metadata?.total_stores || 0,
      hasStoreAccess: profile?.metadata?.has_store_access || false,
      requestedStoreId: activeStoreId,
      actualStoreAccess: profile?.metadata?.has_current_store_access,
    },
  }
}

// Convenience hooks that use the consolidated data
export function useUserProfile() {
  const { user, isAuthenticated, isLoading } = useCompleteUserProfile()
  return { user, isAuthenticated, isLoading }
}

export function useUserRole() {
  const { storeRole, isOwner, isManager, isEmployee, isLoading } = useCompleteUserProfile()
  return { role: storeRole, isOwner, isManager, isEmployee, isLoading }
}

// Updated permissions hook using consolidated data
export function usePermissionsNew() {
  const {
    isAuthenticated,
    hasCurrentStoreAccess,
    canManageUsers,
    canViewAnalytics,
    canApplyDiscounts,
    canScanProducts,
    canUploadInventory,
    canManageSettings,
    can,
    canEditProduct,
    canDeleteProduct,
    canSetPin,
    canResetPin,
    isLoading,
    storeId,
    storeName,
    isOwner,
    isManager,
    isEmployee,
    user,
  } = useCompleteUserProfile()

  return {
    // Basic auth info
    isAuthenticated,
    userId: user?.id || null,
    user,

    // Store context
    storeId,
    storeName,

    // Role flags
    isOwner,
    isManager,
    isEmployee,
    isAdmin: false, // Will be calculated from global roles

    // Store access
    hasAccess: hasCurrentStoreAccess,
    isActiveInStore: hasCurrentStoreAccess,

    // Permissions
    canManageUsers,
    canViewAnalytics,
    canApplyDiscounts,
    canScanProducts,
    canUploadInventory,
    canManageSettings,
    can,
    canEditProduct,
    canDeleteProduct,
    canSetPin,
    canResetPin,

    // Loading state
    isLoading,
    isLoadingPermissions: isLoading, // For backward compatibility
  }
}

export function useAuthGuard() {
  const { isAuthenticated, hasStoreAccess, hasCurrentStoreAccess, user, activeStoreId, isLoading } =
    useCompleteUserProfile()

  return {
    isAuthenticated,
    hasStoreAccess,
    hasCurrentStoreAccess,
    userId: user?.id || null,
    storeId: activeStoreId,
    isLoading,
    requireAuth: (callback: () => React.ReactNode) => {
      if (isLoading) return null
      if (!isAuthenticated) return null
      return callback()
    },
    requireStoreAccess: (callback: () => React.ReactNode) => {
      if (isLoading) return null
      if (!isAuthenticated || !hasCurrentStoreAccess) return null
      return callback()
    },
  }
}
