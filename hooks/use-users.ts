// hooks/use-users.ts - Enhanced with phone & language support

import {
  fetchUsersPage,
  fetchUserById,
  fetchUserRoles,
  checkUserHasRole,
  updateUser,
  updateUserPhone,
  updateUserLanguagePreference,
  type UserFilters,
} from '@/lib/queries/users'
import {
  User,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  UpdatePhoneResponse,
  UpdateLanguageResponse,
  UserCreate,
  UserUpdate,
} from '@/lib/types/user'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useActiveStoreId } from '@/lib/stores/store-context'

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

// Enhanced useCurrentUser hook
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async (): Promise<User> => {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        throw new Error('Not authenticated')
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
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

// Store role hook (unchanged)
export function useCurrentUserStoreRole() {
  const activeStoreId = useActiveStoreId()

  console.log('🏪 useCurrentUserStoreRole - Starting with activeStoreId:', activeStoreId)

  const result = useQuery({
    queryKey: queryKeys.auth.currentUserStoreRole(activeStoreId || ''),
    queryFn: async (): Promise<CurrentUserStoreRole | null> => {
      console.log('🔄 useCurrentUserStoreRole - Executing query for storeId:', activeStoreId)
      
      if (!activeStoreId) {
        console.log('❌ useCurrentUserStoreRole - No activeStoreId, returning null')
        return null
      }

      const supabase = createClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('❌ useCurrentUserStoreRole - Auth error or no user:', authError)
        throw new Error('Not authenticated')
      }

      console.log('✅ useCurrentUserStoreRole - User authenticated:', user.id)

      const { data: storeUserData, error: storeUserError } = await supabase.rpc(
        'get_user_store_role',
        {
          p_user_id: user.id,
          p_store_id: activeStoreId,
        },
      )

      if (storeUserError) {
        console.log('❌ useCurrentUserStoreRole - Store role error:', storeUserError)
        throw new Error(`Failed to get store role: ${storeUserError.message}`)
      }

      console.log('📊 useCurrentUserStoreRole - Raw store user data:', storeUserData)

      if (!storeUserData || storeUserData.length === 0) {
        console.log('⚠️ useCurrentUserStoreRole - No store user data found')
        return null
      }

      const userData = storeUserData[0]

      const currentUserStoreRole: CurrentUserStoreRole = {
        userId: user.id,
        storeId: activeStoreId,
        role: userData.role_in_store as StoreRole,
        permissions: userData.permissions || {},
        isActive: userData.is_active ?? true,
        canUsePinAuth: userData.can_use_pin_auth ?? false,
        pinAccessLevel: userData.pin_access_level || 'basic',
        storeName: userData.store_name,
      }

      console.log('✅ useCurrentUserStoreRole - Computed store role:', currentUserStoreRole)
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

  console.log('📈 useCurrentUserStoreRole - Query result:', {
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error?.message,
    data: result.data ? {
      role: result.data.role,
      permissions: result.data.permissions,
      isActive: result.data.isActive,
    } : null,
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

  console.log('🔐 usePermissions - Debug info:', {
    isLoadingUser,
    isLoadingStoreRole,
    isLoading,
    currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
    storeRole: storeRole ? { role: storeRole.role, permissions: storeRole.permissions } : null,
    computedFlags: {
      isOwner,
      isManager,
      isEmployee,
      canManageSettings,
    },
  })

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

// 🆕 NEW: Language preference hooks
export function useUpdateLanguagePreference() {
  const queryClient = useQueryClient()

  return useMutation<
    UpdateLanguageResponse,
    Error,
    { userId: string; language: SupportedLanguage }
  >({
    mutationFn: async ({ userId, language }) => {
      return await updateUserLanguagePreference(userId, language)
    },
    onSuccess: (data, variables) => {
      // Invalidate user queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })

      toast.success(`Language updated to ${SUPPORTED_LANGUAGES[variables.language]}`)
    },
    onError: error => {
      console.error('Failed to update language preference:', error)
      toast.error(`Failed to update language: ${error.message}`)
    },
  })
}

// 🆕 NEW: Phone update hooks
export function useUpdatePhone() {
  const queryClient = useQueryClient()

  return useMutation<UpdatePhoneResponse, Error, { userId: string; phone: string | null }>({
    mutationFn: async ({ userId, phone }) => {
      return await updateUserPhone(userId, phone)
    },
    onSuccess: (data, variables) => {
      // Invalidate user queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })

      toast.success(variables.phone ? 'Phone number updated' : 'Phone number removed')
    },
    onError: error => {
      console.error('Failed to update phone:', error)
      toast.error(`Failed to update phone: ${error.message}`)
    },
  })
}

// 🆕 NEW: Convenience hooks for filtering users
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

// Enhanced user actions with phone and language support
export function useUserActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation<User, Error, UserCreate>({
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
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })
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
    updateUserLanguage, // 🆕
    updateUserPhone, // 🆕
    assignRole,
    removeRole,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
