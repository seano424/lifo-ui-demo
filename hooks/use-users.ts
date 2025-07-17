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

// UserRole type is not exported from queries, so define it here
type UserRole = 'admin' | 'manager' | 'employee'

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
    queryKey: ['currentUser'],
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
    staleTime: 0, // Temporarily set to 0 to force fresh fetch
    retry: false, // Don't retry auth failures
  })
}

export function useCurrentUserRoles() {
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['currentUser', 'roles'],
    queryFn: async (): Promise<UserRole[]> => {
      if (!currentUser?.id) {
        throw new Error('No current user')
      }

      const roles = await fetchUserRoles(currentUser.id)

      // Runtime validation to ensure type safety
      const validRoles = roles.filter((role): role is UserRole =>
        ['admin', 'manager', 'employee'].includes(role),
      )

      // Optional: warn about invalid roles
      if (validRoles.length !== roles.length) {
        console.warn(
          'Invalid roles detected:',
          roles.filter(r => !validRoles.includes(r as UserRole)),
        )
      }

      return validRoles
    },
    enabled: !!currentUser?.id,
  })
}

export function useCurrentUserHasRole(roleName: string) {
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['currentUser', 'hasRole', roleName],
    queryFn: () => {
      if (!currentUser?.id) {
        throw new Error('No current user')
      }
      return checkUserHasRole(currentUser.id, roleName)
    },
    enabled: !!currentUser?.id && !!roleName,
  })
}

export function usePermissions() {
  const { data: currentUser } = useCurrentUser()
  const { data: isAdmin } = useCurrentUserHasRole('admin')
  const { data: isManager } = useCurrentUserHasRole('manager')
  const { data: roles } = useCurrentUserRoles()

  return {
    userId: currentUser?.id,
    isAuthenticated: !!currentUser,
    isAdmin: !!isAdmin,
    isManager: !!isManager,
    isEmployee: roles?.includes('employee') ?? false,
    roles: roles || [],

    // Permission helpers
    canEditProduct: (productCreatorId?: string) => {
      if (!currentUser) return false
      return isAdmin || isManager || productCreatorId === currentUser.id
    },

    canDeleteProduct: (productCreatorId?: string) => {
      if (!currentUser) return false
      return !!isAdmin || !!isManager || productCreatorId === currentUser.id
    },

    canManageUsers: () => {
      return isAdmin || isManager
    },

    canCreateProducts: () => {
      return isAdmin || isManager
    },

    canScanProducts: (): boolean => {
      // All authenticated users can scan products
      return !!currentUser
    },

    canApplyDiscounts: (): boolean => {
      // Managers and admins can apply discounts, employees might need approval
      return !!isAdmin || !!isManager
    },

    canViewAnalytics: (): boolean => {
      // Only managers and admins can view detailed analytics
      return !!isAdmin || !!isManager
    },

    // PIN-related permissions (new with migration)
    canSetPin: (): boolean => {
      return !!currentUser && (currentUser.requires_pin || !!isAdmin)
    },

    canResetPin: (targetUserId?: string): boolean => {
      if (!currentUser) return false
      // Admins can reset anyone's PIN, users can reset their own
      return !!isAdmin || targetUserId === currentUser.id
    },

    isPinLocked: (): boolean => {
      if (!currentUser?.pin_locked_until) return false
      return new Date() < new Date(currentUser.pin_locked_until)
    },
  }
}

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

// New PIN-related hooks
export function usePinRequiredUsers() {
  return useUsers({ requires_pin: true })
}

// ✅ FIXED: This hook needs to use the queries file, not direct database access
export function usePinLockedUsers() {
  return useQuery({
    queryKey: ['users', 'pinLocked'],
    queryFn: async () => {
      // Use the filter in your queries file instead of direct DB access
      const { data } = await fetchUsersPage({ page: 0, pageSize: 100 }, { pin_locked: true })
      return data
    },
  })
}

// Updated useUserActions hook that uses RPC functions instead of admin API
export function useUserActions() {
  const queryClient = useQueryClient()

  // Note: Create mutation would need to be handled server-side
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
      // This would need to be implemented as a server action or API route
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

  // Updated mutation that uses RPC functions
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const supabase = createClient()

      // Separate email from metadata updates
      const { email, ...metadataUpdates } = updates

      // Update email if provided
      if (email) {
        const { data: emailResult, error: emailError } = await supabase.rpc('update_user_email', {
          target_user_id: id,
          new_email: email,
        })

        if (emailError) {
          throw new Error(`Failed to update email: ${emailError.message}`)
        }
      }

      // Update metadata if provided
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

      // Fetch updated user data
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

  // Delete would also need to be handled server-side
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // This would need to be implemented as a server action or API route
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

  // Simplified helper methods that use the RPC-based update
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

  // PIN management methods
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

  // Role management helpers (these would need separate RPC functions)
  const assignRole = (userId: string, role: UserRole) => {
    console.log(`Assigning role ${role} to user ${userId}`)
    // TODO: Implement role assignment RPC function
    toast.info('Role assignment not yet implemented')
  }

  const removeRole = (userId: string, role: UserRole) => {
    console.log(`Removing role ${role} from user ${userId}`)
    // TODO: Implement role removal RPC function
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
