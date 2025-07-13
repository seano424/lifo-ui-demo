import {
  fetchUsersPage,
  fetchUserById,
  fetchUserRoles,
  checkUserHasRole,
  createUser,
  updateUser,
  deleteUser,
  type UserFilters,
  type User,
} from '@/lib/queries/users'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

export type UserRole = 'admin' | 'manager' | 'employee'

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
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        throw new Error('Not authenticated')
      }

      // Get the user from user_mgmt table
      const { data: mgmtUser, error: mgmtError } = await supabase
        .schema('user_mgmt')
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (mgmtError) {
        throw new Error('User not found in user management')
      }

      return {
        auth: user,
        profile: mgmtUser as User,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - same as server prefetch
    retry: false, // Don't retry auth failures
  })
}

export function useCurrentUserRoles(): UseQueryResult<UserRole[], Error> {
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['currentUser', 'roles'],
    queryFn: async (): Promise<UserRole[]> => {
      const roles = await fetchUserRoles(currentUser!.auth.id)

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
    enabled: !!currentUser?.auth.id,
  })
}

export function useCurrentUserHasRole(roleName: UserRole): UseQueryResult<boolean, Error> {
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['currentUser', 'hasRole', roleName],
    queryFn: () => checkUserHasRole(currentUser!.auth.id, roleName),
    enabled: !!currentUser?.auth.id && !!roleName,
  })
}

export function usePermissions() {
  const { data: currentUser } = useCurrentUser()
  const { data: isAdmin } = useCurrentUserHasRole('admin')
  const { data: isManager } = useCurrentUserHasRole('manager')
  const { data: roles } = useCurrentUserRoles()

  return {
    userId: currentUser?.auth.id,
    isAuthenticated: !!currentUser,
    isAdmin: !!isAdmin,
    isManager: !!isManager,
    isEmployee: roles?.includes('employee') ?? false,
    roles: roles || ([] as UserRole[]),

    // Type-safe role checker
    hasRole: (role: UserRole): boolean => roles?.includes(role) ?? false,

    // Permission helpers
    canEditProduct: (productCreatorId?: string): boolean => {
      if (!currentUser) return false
      return isAdmin || isManager || productCreatorId === currentUser.auth.id
    },

    canDeleteProduct: (productCreatorId?: string): boolean => {
      if (!currentUser) return false
      return !!isAdmin || !!isManager || productCreatorId === currentUser.auth.id
    },

    canManageUsers: (): boolean => {
      return !!isAdmin || !!isManager
    },

    canCreateProducts: (): boolean => {
      return !!isAdmin || !!isManager
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
  }
}

export function useUser(userId: string): UseQueryResult<User, Error> {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  })
}

export function useUserRoles(userId: string): UseQueryResult<UserRole[], Error> {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'roles'],
    queryFn: async (): Promise<UserRole[]> => {
      const roles = await fetchUserRoles(userId)

      // Runtime validation
      const validRoles = roles.filter((role): role is UserRole =>
        ['admin', 'manager', 'employee'].includes(role),
      )

      return validRoles
    },
    enabled: !!userId,
  })
}

export function useUserHasRole(userId: string, roleName: UserRole): UseQueryResult<boolean, Error> {
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

export function useUsersByRole(roleName: UserRole) {
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

export function useUserActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: newUser => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      queryClient.setQueryData(queryKeys.users.detail(newUser.user_id), newUser)
      toast.success('User created successfully')
    },
    onError: error => {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateUser(id, updates),
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
      toast.error('Failed to update user')
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
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      toast.success('User deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete user')
    },
  })

  // Convenience methods for common actions
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

  // Role management helpers
  const assignRole = (userId: string, role: UserRole) => {
    // This would need to be implemented in your queries
    console.log(`Assigning role ${role} to user ${userId}`)
    // TODO: Implement role assignment logic
  }

  const removeRole = (userId: string, role: UserRole) => {
    // This would need to be implemented in your queries
    console.log(`Removing role ${role} from user ${userId}`)
    // TODO: Implement role removal logic
  }

  return {
    createUser: createMutation.mutate,
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    activateUser,
    deactivateUser,
    updateUserProfile,
    assignRole,
    removeRole,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
