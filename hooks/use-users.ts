// hooks/use-users.ts - Fixed version using RPC functions instead of views
import {
  fetchUsersPage,
  fetchUserById,
  fetchUserRoles,
  checkUserHasRole,
  createUser,
  updateUser,
  deleteUser,
  transformAuthUserToUser,
  type UserFilters,
  type User,
} from '@/lib/queries/users'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Legacy UserRole type (for global roles)
type UserRole = 'admin' | 'manager' | 'employee'

// New store-specific role types
export type StoreRole = 'owner' | 'manager' | 'employee' | 'staff'

export interface CurrentUserStoreRole {
  userId: string
  storeId: string
  role: StoreRole
  permissions: Record<string, boolean>
  isActive: boolean
  canUsePinAuth: boolean
  pinAccessLevel: 'basic' | 'elevated' | 'admin'
  storeName?: string
}

export function useUsers(filters: UserFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.users.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchUsersPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
  })

  const data = result.data?.pages.flatMap(page => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? 0,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async (): Promise<User> => {
      console.log('🔍 useCurrentUser: Starting fetch...')

      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      console.log('🔍 useCurrentUser: Raw auth user:', user)

      if (error || !user) {
        console.log('🔍 useCurrentUser: No user or error:', error)
        throw new Error('Not authenticated')
      }

      // Extract metadata and return flattened User object
      const metadata = user.user_metadata || {}
      console.log('🔍 useCurrentUser: Metadata:', metadata)

      const transformedUser = {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        // Extract all metadata fields to top level
        username: metadata.username,
        full_name: metadata.full_name,
        is_active: metadata.is_active ?? true,
        avatar_url: metadata.avatar_url,
        last_login: metadata.last_login,
        pin_hash: metadata.pin_hash,
        pin_set_at: metadata.pin_set_at,
        pin_attempts: metadata.pin_attempts ?? 0,
        requires_pin: metadata.requires_pin ?? false,
        email_verified: metadata.email_verified ?? false,
        phone_verified: metadata.phone_verified ?? false,
        pin_expires_at: metadata.pin_expires_at,
        pin_locked_until: metadata.pin_locked_until,
        pin_delivery_method: metadata.pin_delivery_method,
        migrated_from_user_mgmt: metadata.migrated_from_user_mgmt,
      }

      console.log('🔍 useCurrentUser: Transformed user:', transformedUser)
      return transformedUser as unknown as User
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/**
 * 🆕 FIXED: Get current user's role and permissions using RPC function
 */
export function useCurrentUserStoreRole() {
  const activeStoreId = useActiveStoreId()

  const result = useQuery({
    queryKey: queryKeys.auth.currentUserStoreRole(activeStoreId || ''),
    queryFn: async (): Promise<CurrentUserStoreRole | null> => {
      console.log('🔍 useCurrentUserStoreRole: Starting fetch...', { activeStoreId })

      if (!activeStoreId) {
        console.log('🔍 useCurrentUserStoreRole: No active store ID')
        return null
      }

      const supabase = createClient()

      // Get current user from Supabase auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('🔍 useCurrentUserStoreRole: No authenticated user:', authError)
        throw new Error('Not authenticated')
      }

      console.log('🔍 useCurrentUserStoreRole: Auth user found:', user.id)

      // ✅ FIXED: Use RPC function instead of view
      const { data: storeUserData, error: storeUserError } = await supabase.rpc(
        'get_user_store_role',
        {
          p_user_id: user.id,
          p_store_id: activeStoreId,
        },
      )

      if (storeUserError) {
        console.log('🔍 useCurrentUserStoreRole: RPC error:', storeUserError)
        throw new Error(`Failed to get store role: ${storeUserError.message}`)
      }

      if (!storeUserData || storeUserData.length === 0) {
        console.log('🔍 useCurrentUserStoreRole: No user found in store')
        return null
      }

      // RPC returns an array, get the first (and only) result
      const userData = storeUserData[0]
      console.log('🔍 useCurrentUserStoreRole: Store user data:', userData)

      const currentUserStoreRole: CurrentUserStoreRole = {
        userId: user.id,
        storeId: activeStoreId,
        role: userData.role_in_store as StoreRole,
        permissions: userData.permissions || {},
        isActive: userData.is_active ?? true,
        canUsePinAuth: userData.can_use_pin_auth ?? false,
        pinAccessLevel: userData.pin_access_level || 'basic',
        storeName: userData.store_name, // RPC includes store name
      }

      console.log('🔍 useCurrentUserStoreRole: Final result:', currentUserStoreRole)
      return currentUserStoreRole
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('not found')) {
        return false
      }
      return failureCount < 2
    },
  })

  return {
    ...result,
    // Convenience flags for common permission checks
    isOwner: result.data?.role === 'owner',
    isManager: result.data?.role === 'manager',
    isEmployee: result.data?.role === 'employee' || result.data?.role === 'staff',

    // Store context
    storeId: activeStoreId,
    storeName: result.data?.storeName,

    // Permission helpers
    can: (permission: string): boolean => {
      return result.data?.permissions?.[permission] === true
    },

    // Common permission checks
    canManageUsers: result.data?.permissions?.can_manage_users === true,
    canViewAnalytics: result.data?.permissions?.can_view_analytics === true,
    canApplyDiscounts: result.data?.permissions?.can_apply_discounts === true,
    canScanProducts: result.data?.permissions?.can_scan_products === true,
    canUploadInventory: result.data?.permissions?.can_upload_inventory === true,
    canManageSettings: result.data?.permissions?.can_manage_settings === true,

    // PIN authentication flags
    canUsePinAuth: result.data?.canUsePinAuth === true,
    pinAccessLevel: result.data?.pinAccessLevel || 'basic',

    // Active status
    isActiveInStore: result.data?.isActive === true,
  }
}

/**
 * ✅ FIXED: Updated to work with new store-based role system
 * Maps store roles to legacy global roles for backward compatibility
 */
export function useCurrentUserRoles() {
  const { data: storeRole, isLoading, error } = useCurrentUserStoreRole()

  return useQuery({
    queryKey: queryKeys.auth.currentUserRoles(),
    queryFn: async (): Promise<UserRole[]> => {
      console.log('🔍 useCurrentUserRoles: Store role data:', storeRole)

      if (!storeRole) {
        console.log('🔍 useCurrentUserRoles: No store role found')
        return []
      }

      // Map store roles to the old global role system for compatibility
      const globalRoles: UserRole[] = []

      if (storeRole.role === 'owner') {
        globalRoles.push('admin') // Store owners map to admin
      }
      if (storeRole.role === 'manager') {
        globalRoles.push('manager')
      }
      if (storeRole.role === 'employee' || storeRole.role === 'staff') {
        globalRoles.push('employee')
      }

      console.log('🔍 useCurrentUserRoles: Mapped roles:', {
        storeRole: storeRole.role,
        globalRoles,
        storeId: storeRole.storeId,
      })

      return globalRoles
    },
    enabled: !!storeRole && !isLoading && !error,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCurrentUserHasRole(roleName: string) {
  const { data: roles, isLoading } = useCurrentUserRoles()

  return useQuery({
    queryKey: [...queryKeys.auth.currentUserRoles(), 'hasRole', roleName] as const,
    queryFn: async (): Promise<boolean> => {
      if (!roles) return false
      return roles.includes(roleName as UserRole)
    },
    enabled: !!roles && !!roleName,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 🆕 UPDATED: Enhanced permissions hook using new store-based system
 */
export function usePermissions() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const {
    data: storeRole,
    isLoading: isLoadingStoreRole,
    isOwner,
    isManager,
    isEmployee,
    can,
    canManageUsers,
    canViewAnalytics,
    canApplyDiscounts,
    canScanProducts,
    canUploadInventory,
    canManageSettings,
    canUsePinAuth,
    pinAccessLevel,
    isActiveInStore,
    storeId,
    storeName,
  } = useCurrentUserStoreRole()

  // Legacy compatibility - get mapped global roles
  const { data: globalRoles } = useCurrentUserRoles()

  const isLoading = isLoadingUser || isLoadingStoreRole

  return {
    // User info
    userId: currentUser?.id || null,
    user: currentUser,
    isAuthenticated: !!currentUser,

    // Store context
    storeId,
    storeName,

    // Role info (both new and legacy)
    storeRole: storeRole?.role || null,
    roles: globalRoles || [], // Legacy compatibility
    isOwner,
    isManager,
    isEmployee,
    isActiveInStore,

    // Legacy role flags for backward compatibility
    isAdmin: globalRoles?.includes('admin') ?? false,

    // Permission checking
    can,

    // Specific permissions (enhanced with store-based checks)
    canManageUsers: canManageUsers || isOwner,
    canViewAnalytics: canViewAnalytics || isOwner || isManager,
    canApplyDiscounts: canApplyDiscounts || isOwner || isManager,
    canScanProducts: canScanProducts || isOwner || isManager || isEmployee,
    canUploadInventory: canUploadInventory || isOwner || isManager,
    canManageSettings: canManageSettings || isOwner,
    canCreateProducts: () => {
      return !!currentUser && isActiveInStore && (isOwner || isManager || canUploadInventory)
    },

    // PIN authentication
    canUsePinAuth,
    pinAccessLevel,

    // Helper functions for common use cases
    canEditProduct: (productCreatorId?: string): boolean => {
      if (!currentUser || !isActiveInStore) return false
      return isOwner || isManager || productCreatorId === currentUser.id
    },

    canDeleteProduct: (productCreatorId?: string): boolean => {
      if (!currentUser || !isActiveInStore) return false
      return isOwner || isManager || productCreatorId === currentUser.id
    },

    // PIN-related permissions (enhanced)
    canSetPin: (): boolean => {
      return !!currentUser && (currentUser.requires_pin || isOwner)
    },

    canResetPin: (targetUserId?: string): boolean => {
      if (!currentUser) return false
      return isOwner || targetUserId === currentUser.id
    },

    isPinLocked: (): boolean => {
      if (!currentUser?.pin_locked_until) return false
      return new Date() < new Date(currentUser.pin_locked_until)
    },

    // Loading states
    isLoading,
    isLoadingUser,
    isLoadingStoreRole,

    // Debug info (helpful during development)
    _debug: {
      userId: currentUser?.id,
      storeId,
      storeRole: storeRole?.role,
      globalRoles,
      permissions: storeRole?.permissions,
      isActiveInStore,
      userMetadata: currentUser
        ? {
            username: currentUser.username,
            full_name: currentUser.full_name,
            requires_pin: currentUser.requires_pin,
            is_active: currentUser.is_active,
          }
        : null,
    },
  }
}

/**
 * 🆕 NEW: Simple role checking hook
 */
export function useUserRole() {
  const { storeRole, isOwner, isManager, isEmployee, isLoading } = usePermissions()

  return {
    role: storeRole,
    isOwner,
    isManager,
    isEmployee,
    isLoading,
  }
}

/**
 * 🆕 NEW: Check if user can perform a specific action
 */
export function useCanPerform(action: string) {
  const { can, isLoading, isAuthenticated, isActiveInStore } = usePermissions()

  return {
    canPerform: isAuthenticated && isActiveInStore && can(action),
    isLoading,
    hasAccess: isAuthenticated && isActiveInStore,
  }
}

/**
 * 🆕 NEW: Authentication guard hook
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading, userId, storeId, isActiveInStore } = usePermissions()

  return {
    isAuthenticated,
    isLoading,
    hasStoreAccess: isAuthenticated && !!storeId && isActiveInStore,
    userId,
    storeId,
    // Helper for conditional rendering
    requireAuth: (callback: () => React.ReactNode) => {
      if (isLoading) return null
      if (!isAuthenticated) return null
      return callback()
    },
    requireStoreAccess: (callback: () => React.ReactNode) => {
      if (isLoading) return null
      if (!isAuthenticated || !storeId || !isActiveInStore) return null
      return callback()
    },
  }
}

// ================================
// EXISTING HOOKS (UNCHANGED)
// ================================

export function useUser(userId: string): UseQueryResult<User, Error> {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async (): Promise<User> => {
      return await fetchUserById(userId)
    },
    enabled: !!userId,
  })
}

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'roles'],
    queryFn: () => fetchUserRoles(userId),
    enabled: !!userId,
  })
}

export function useUserHasRole(userId: string, roleName: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'hasRole', roleName],
    queryFn: () => checkUserHasRole(userId, roleName),
    enabled: !!userId && !!roleName,
  })
}

export function useActiveUsers() {
  return useUsers({ is_active: true })
}

export function useInactiveUsers() {
  return useUsers({ is_active: false })
}

export function useUsersByRole(roleName: string) {
  return useUsers({ role: roleName })
}

export function useEmployees() {
  return useUsersByRole('employee')
}

export function useManagers() {
  return useUsersByRole('manager')
}

export function useAdmins() {
  return useUsersByRole('admin')
}

export function usePinRequiredUsers() {
  return useUsers({ requires_pin: true })
}

export function usePinLockedUsers() {
  return useQuery({
    queryKey: ['users', 'pinLocked'],
    queryFn: async () => {
      const { data } = await fetchUsersPage({ page: 0, pageSize: 100 }, { pin_locked: true })
      return data
    },
  })
}

// ================================
// USER ACTIONS (UNCHANGED)
// ================================

export function useUserActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation<
    User,
    Error,
    {
      email: string
      password?: string
      username?: string
      full_name?: string
      is_active?: boolean
      requires_pin?: boolean
      pin_delivery_method?: string
    }
  >({
    mutationFn: async userData => {
      throw new Error('User creation must be handled server-side')
    },
    onSuccess: newUser => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      if (newUser?.id) {
        queryClient.setQueryData(queryKeys.users.detail(newUser.id), newUser)
      }
      toast.success('User created successfully')
    },
    onError: error => {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const supabase = createClient()

      const { email, ...metadataUpdates } = updates

      if (email) {
        const { data: emailResult, error: emailError } = await supabase.rpc('update_user_email', {
          target_user_id: id,
          new_email: email,
        })

        if (emailError) {
          throw new Error(`Failed to update email: ${emailError.message}`)
        }
      }

      if (Object.keys(metadataUpdates).length > 0) {
        const { data: metadataResult, error: metadataError } = await supabase.rpc(
          'update_user_metadata',
          {
            target_user_id: id,
            metadata_updates: metadataUpdates,
          },
        )

        if (metadataError) {
          throw new Error(`Failed to update metadata: ${metadataError.message}`)
        }
      }

      const { data: allUsers, error: fetchError } = await supabase.rpc('get_users_with_metadata')

      if (fetchError) {
        throw new Error(`Failed to fetch updated user: ${fetchError.message}`)
      }

      const updatedUser = allUsers?.find((user: any) => user.id === id)

      if (!updatedUser) {
        throw new Error('Updated user not found')
      }

      return transformAuthUserToUser(updatedUser as unknown as Record<string, unknown>)
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) })
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id))

      queryClient.setQueryData(queryKeys.users.detail(id), (old: User | undefined) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      return { previousUser, id }
    },
    onError: (err, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(context.id), context.previousUser)
      }
      console.error('Update error:', err)
      toast.error(`Failed to update user: ${err.message}`)
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
    },
    onSuccess: () => {
      toast.success('User updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      throw new Error('User deletion must be handled server-side')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      toast.success('User deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete user')
    },
  })

  const activateUser = (id: string) =>
    updateMutation.mutate({
      id,
      updates: { is_active: true },
    })

  const deactivateUser = (id: string) =>
    updateMutation.mutate({
      id,
      updates: { is_active: false },
    })

  const updateUserProfile = (id: string, profileData: { full_name?: string; email?: string }) =>
    updateMutation.mutate({
      id,
      updates: profileData,
    })

  const setPinRequired = (id: string, required: boolean) =>
    updateMutation.mutate({
      id,
      updates: { requires_pin: required },
    })

  const resetPinAttempts = (id: string) =>
    updateMutation.mutate({
      id,
      updates: {
        pin_attempts: 0,
        pin_locked_until: null,
      },
    })

  const lockUserPin = (id: string, lockUntil: Date) =>
    updateMutation.mutate({
      id,
      updates: { pin_locked_until: lockUntil.toISOString() },
    })

  const assignRole = (userId: string, role: UserRole) => {
    console.log(`Assigning role ${role} to user ${userId}`)
    toast.info('Role assignment not yet implemented')
  }

  const removeRole = (userId: string, role: UserRole) => {
    console.log(`Removing role ${role} from user ${userId}`)
    toast.info('Role removal not yet implemented')
  }

  return {
    createUser: createMutation.mutate,
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    activateUser,
    deactivateUser,
    updateUserProfile,
    setPinRequired,
    resetPinAttempts,
    lockUserPin,
    assignRole,
    removeRole,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
