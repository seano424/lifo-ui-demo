import type { UseQueryResult } from '@tanstack/react-query'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  checkUserHasRole,
  fetchUserById,
  fetchUserRoles,
  fetchUsersPage,
  type UserFilters,
  updateUser,
  updateUserLanguagePreference,
  updateUserPhone,
} from '@/lib/queries/users'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type UpdateLanguageResponse,
  type UpdatePhoneResponse,
  type User,
  type UserCreate,
  type UserUpdate,
} from '@/lib/types/user'
import { RequestAccountDeletionResponseSchema } from '@/lib/validation/rpc-schemas'

// Legacy UserRole type (for global roles)
type UserRole = 'admin' | 'manager' | 'employee'

// Store-specific role types (unchanged)
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

// Enhanced useUsers hook with new filtering options
export function useUsers(filters: UserFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.users.infinite(filters),
    queryFn: ({ pageParam = 0 }) => {
      return fetchUsersPage({ page: pageParam, pageSize }, filters)
    },
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

// Enhanced useCurrentUser hook
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async (): Promise<User | null> => {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const { mockUser } = await import('@/lib/mocks/demo-data')
        return mockUser
      }

      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        // Return null instead of throwing error for unauthenticated users
        // This allows components to handle both authenticated and unauthenticated states
        return null
      }

      // Extract metadata and return flattened User object
      const metadata = user.user_metadata || {}

      const transformedUser = {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        raw_user_meta_data: metadata,

        // Extract all metadata fields to top level
        username: metadata.username || '',
        full_name: metadata.full_name || '',
        is_active: metadata.is_active ?? true,
        avatar_url: metadata.avatar_url || '',
        last_login: metadata.last_login || '',
        pin_hash: metadata.pin_hash || '',
        pin_set_at: metadata.pin_set_at || '',
        pin_attempts: metadata.pin_attempts ?? 0,
        requires_pin: metadata.requires_pin ?? false,
        email_verified: metadata.email_verified ?? false,
        phone_verified: metadata.phone_verified ?? false,
        pin_expires_at: metadata.pin_expires_at || '',
        pin_locked_until: metadata.pin_locked_until || '',
        pin_delivery_method: metadata.pin_delivery_method || '',
        migrated_from_user_mgmt: metadata.migrated_from_user_mgmt ?? false,

        // 🆕 NEW FIELDS:
        phone: user.phone || null, // From auth.users.phone column
        language_preference:
          metadata.language_preference &&
          Object.keys(SUPPORTED_LANGUAGES).includes(metadata.language_preference)
            ? (metadata.language_preference as SupportedLanguage)
            : ('en' as SupportedLanguage), // Default to English
      }

      return transformedUser as User
    },
    staleTime: 30 * 1000, // Auth state can change - check every 30 seconds for logout detection
    gcTime: 5 * 60 * 1000, // Keep cache for 5 minutes
    retry: false,
    // Keep showing previous data while refetching to prevent flickering
    placeholderData: previousData => previousData,
  })
}

// Store role hook (unchanged)
export function useCurrentUserStoreRole() {
  const activeStoreId = useActiveStoreId()

  const result = useQuery({
    queryKey: queryKeys.auth.currentUserStoreRole(activeStoreId || ''),
    queryFn: async (): Promise<CurrentUserStoreRole | null> => {
      if (!activeStoreId) {
        return null
      }

      const supabase = createClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return null
      }

      const { data: storeUserData, error: storeUserError } = await supabase.rpc(
        'get_user_store_role',
        {
          p_user_id: user.id,
          p_store_id: activeStoreId,
        },
      )

      if (storeUserError) {
        throw new Error(`Failed to get store role: ${storeUserError.message}`)
      }

      if (!storeUserData || storeUserData.length === 0) {
        return null
      }

      const userData = storeUserData[0]

      const currentUserStoreRole: CurrentUserStoreRole = {
        userId: user.id,
        storeId: activeStoreId,
        role: userData.role_in_store as StoreRole,
        permissions: (userData.permissions as Record<string, boolean>) || {},
        isActive: userData.is_active ?? true,
        canUsePinAuth: userData.can_use_pin_auth ?? false,
        pinAccessLevel: (userData.pin_access_level as 'basic' | 'elevated' | 'admin') || 'basic',
        storeName: userData.store_name,
      }

      return currentUserStoreRole
    },
    enabled: !!activeStoreId,
    staleTime: 30 * 1000, // Store roles can change - check every 30 seconds
    retry: (failureCount, error: Error) => {
      if (error?.message?.includes('Not authenticated') || error?.message?.includes('not found')) {
        return false
      }
      return failureCount < 2
    },
  })

  return {
    ...result,
    isOwner: result.data?.role === 'owner',
    isManager: result.data?.role === 'manager',
    isEmployee: result.data?.role === 'employee' || result.data?.role === 'staff',
    storeId: activeStoreId,
    storeName: result.data?.storeName,
    can: (permission: string): boolean => {
      return result.data?.permissions?.[permission] === true
    },
    canManageUsers: result.data?.permissions?.can_manage_users === true,
    canViewAnalytics: result.data?.permissions?.can_view_analytics === true,
    canApplyDiscounts: result.data?.permissions?.can_apply_discounts === true,
    canScanProducts: result.data?.permissions?.can_scan_products === true,
    canUploadInventory: result.data?.permissions?.can_upload_inventory === true,
    canManageSettings: result.data?.permissions?.can_manage_settings === true,
    canUsePinAuth: result.data?.canUsePinAuth === true,
    pinAccessLevel: result.data?.pinAccessLevel || 'basic',
    isActiveInStore: result.data?.isActive === true,
  }
}

export function useCurrentUserRoles() {
  const { data: storeRole, isLoading, error } = useCurrentUserStoreRole()

  return useQuery({
    queryKey: queryKeys.auth.currentUserRoles(),
    queryFn: async (): Promise<UserRole[]> => {
      if (!storeRole) {
        return []
      }

      const globalRoles: UserRole[] = []

      if (storeRole.role === 'owner') {
        globalRoles.push('admin')
      }
      if (storeRole.role === 'manager') {
        globalRoles.push('manager')
      }
      if (storeRole.role === 'employee' || storeRole.role === 'staff') {
        globalRoles.push('employee')
      }

      return globalRoles
    },
    enabled: !!storeRole && !isLoading && !error,
    staleTime: 30 * 1000, // Roles can change - check every 30 seconds
  })
}

export function useCurrentUserHasRole(roleName: string) {
  const { data: roles } = useCurrentUserRoles()

  return useQuery({
    queryKey: [...queryKeys.auth.currentUserRoles(), 'hasRole', roleName] as const,
    queryFn: async (): Promise<boolean> => {
      if (!roles) return false
      return roles.includes(roleName as UserRole)
    },
    enabled: !!roles && !!roleName,
    staleTime: 30 * 1000, // Role checks can change - check every 30 seconds
  })
}

// Enhanced permissions hook
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
    roles: globalRoles || [],
    isOwner,
    isManager,
    isEmployee,
    isActiveInStore,

    // Legacy role flags for backward compatibility
    isAdmin: globalRoles?.includes('admin') ?? false,

    // Permission checking
    can,

    // Specific permissions
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

    // Helper functions
    canEditProduct: (productCreatorId?: string): boolean => {
      if (!currentUser || !isActiveInStore) return false
      return isOwner || isManager || productCreatorId === currentUser.id
    },

    canDeleteProduct: (productCreatorId?: string): boolean => {
      if (!currentUser || !isActiveInStore) return false
      return isOwner || isManager || productCreatorId === currentUser.id
    },

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

    // 🆕 NEW: Language and phone utilities
    userLanguage: currentUser?.language_preference || 'en',
    userPhone: currentUser?.phone || null,
    hasPhone: !!(currentUser?.phone && currentUser.phone.trim() !== ''),

    // Debug info
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
            phone: currentUser.phone,
            language_preference: currentUser.language_preference,
          }
        : null,
    },
  }
}

// Convenience hooks (unchanged)
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

export function useCanPerform(action: string) {
  const { can, isLoading, isAuthenticated, isActiveInStore } = usePermissions()

  return {
    canPerform: isAuthenticated && isActiveInStore && can(action),
    isLoading,
    hasAccess: isAuthenticated && isActiveInStore,
  }
}

export function useAuthGuard() {
  const { isAuthenticated, isLoading, userId, storeId, isActiveInStore } = usePermissions()

  return {
    isAuthenticated,
    isLoading,
    hasStoreAccess: isAuthenticated && !!storeId && isActiveInStore,
    userId,
    storeId,
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

// ======================================
// Enhanced User Hooks
// ======================================

// Enhanced phone update hook
export function useUpdatePhone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, phone }: { userId: string; phone: string | null }) =>
      updateUserPhone(userId, phone),
    onSuccess: (_data: UpdatePhoneResponse, { phone }) => {
      // Invalidate user queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      if (phone) {
        toast.success('Phone number updated successfully')
      } else {
        toast.success('Phone number removed successfully')
      }
    },
    onError: error => {
      console.error('Phone update error:', error)
      toast.error('Failed to update phone number')
    },
  })
}

// Enhanced language update hook
export function useUpdateLanguagePreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, language }: { userId: string; language: SupportedLanguage }) =>
      updateUserLanguagePreference(userId, language),
    onSuccess: (_data: UpdateLanguageResponse, { language }) => {
      // Invalidate user queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      toast.success(`Language preference updated to ${language.toUpperCase()}`)

      // Trigger app language change (if using next-intl)
      if (typeof window !== 'undefined') {
        // This would trigger a language change in your app
        window.location.reload()
      }
    },
    onError: error => {
      console.error('Language update error:', error)
      toast.error('Failed to update language preference')
    },
  })
}

// Enhanced user actions with phone and language support
export function useUserActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation<User, Error, UserCreate>({
    mutationFn: async _userData => {
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
    mutationFn: async ({ id, updates }: { id: string; updates: UserUpdate }) => {
      return await updateUser(id, updates)
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) })
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id))

      queryClient.setQueryData(queryKeys.users.detail(id), (old: User | undefined) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      return { previousUser, id }
    },
    onError: (err, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(context.id), context.previousUser)
      }
      console.error('Update error:', err)
      toast.error(`Failed to update user: ${err.message}`)
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
    },
    onSuccess: () => {
      toast.success('User updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (_userId: string) => {
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

  // Convenience methods
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

  const updateUserProfile = (
    id: string,
    profileData: {
      full_name?: string
      username?: string
      email?: string
      phone?: string | null // 🆕
      language_preference?: SupportedLanguage // 🆕
    },
  ) =>
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

  // 🆕 NEW: Convenience methods for phone and language
  const updateUserLanguage = (id: string, language: SupportedLanguage) =>
    updateMutation.mutate({
      id,
      updates: { language_preference: language },
    })

  const updateUserPhone = (id: string, phone: string | null) =>
    updateMutation.mutate({
      id,
      updates: { phone },
    })

  const assignRole = (_userId: string, _role: UserRole) => {
    toast.info('Role assignment not yet implemented')
  }

  const removeRole = (_userId: string, _role: UserRole) => {
    toast.info('Role removal not yet implemented')
  }

  // 🆕 NEW: Request account deletion with 30-day grace period
  // This is the user-facing deletion flow - account stays active for 30 days
  // For admin-initiated immediate deletion, use useImmediateDeletion() directly
  const deleteAccount = async () => {
    const supabase = createClient()

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Not authenticated')
      }

      // Request deletion with 30-day grace period
      const { data, error } = await supabase.rpc('request_account_deletion', {
        target_user_id: user.id,
        deletion_type: 'user_request',
      })

      if (error) {
        throw error
      }

      // Validate response with Zod schema
      const parsed = RequestAccountDeletionResponseSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Invalid request deletion response:', parsed.error)
        throw new Error('Invalid response from server')
      }

      const result = parsed.data
      if (!result.success) {
        throw new Error(result.message || 'Failed to request account deletion')
      }

      // Invalidate queries so the warning banner appears
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletion.pendingDeletion() })

      // Success - the banner will now show and user can cancel anytime
      // TypeScript knows result.success is true, so deletion_scheduled_for exists
      const scheduledDate = new Date(result.deletion_scheduled_for).toLocaleDateString()
      toast.success(
        `Account deletion scheduled for ${scheduledDate}. You can cancel anytime before then.`,
        { duration: 5000 },
      )
    } catch (error) {
      console.error('Failed to request account deletion:', error)
      const message = error instanceof Error ? error.message : 'Failed to request deletion'
      toast.error(message)
      throw error
    }
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
    updateUserLanguage, // 🆕
    updateUserPhone, // 🆕
    deleteAccount, // 🆕
    assignRole,
    removeRole,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// Convenience hooks for filtering users
export function useUsersByLanguage(language: SupportedLanguage) {
  return useUsers({ language })
}

export function useUsersWithPhone() {
  return useUsers({ has_phone: true })
}

export function useUsersWithoutPhone() {
  return useUsers({ has_phone: false })
}

// Existing hooks (unchanged)
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
