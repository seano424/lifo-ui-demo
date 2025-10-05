import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  addUserToStore,
  fetchStoreUserById,
  fetchStoreUsersPage,
  removeUserFromStore,
  type StoreUser,
  type StoreUserFilters,
  updateStoreUser,
} from '@/lib/queries/store-users'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Page size for client-side filtered queries (fetches all users for filtering)
const FILTERED_USERS_PAGE_SIZE = 100

export function useStoreUsers(filters: StoreUserFilters = {}, pageSize: number = 20) {
  const activeStoreId = useActiveStoreId()

  const result = useInfiniteQuery({
    queryKey: queryKeys.storeUsers.infinite(activeStoreId || '', filters),
    queryFn: ({ pageParam = 0 }) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for fetching store users')
      }
      return fetchStoreUsersPage(activeStoreId, { page: pageParam, pageSize }, filters)
    },
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId,
    // Cache configuration optimized for user data that changes infrequently
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: false, // Don't refetch if data exists in cache
  })

  // Flatten pages into single array
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
    storeId: activeStoreId, // Return for reference
  }
}

export function useStoreUser(userId: string) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.storeUsers.detail(activeStoreId || '', userId),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for fetching store user')
      }
      return fetchStoreUserById(activeStoreId, userId)
    },
    enabled: !!activeStoreId && !!userId,
  })
}

export function useStoreOwners() {
  return useFilteredStoreUsers({ role_in_store: 'owner' })
}

export function useStoreManagers() {
  return useFilteredStoreUsers({ role_in_store: 'manager' })
}

export function useStoreEmployees() {
  return useFilteredStoreUsers({ role_in_store: 'employee' })
}

export function useActiveStoreUsers() {
  return useFilteredStoreUsers({ is_active: true })
}

export function useInactiveStoreUsers() {
  return useFilteredStoreUsers({ is_active: false })
}

export function usePinEnabledUsers() {
  return useFilteredStoreUsers({ can_use_pin_auth: true })
}

/**
 * Client-side filtered store users hook
 *
 * Fetches all users once and filters on the client side for instant performance.
 *
 * ✅ **Use when:**
 * - Store has <50 users
 * - Multiple filters needed
 * - Want instant filter updates without network requests
 *
 * ❌ **Avoid when:**
 * - Store has >50 users (use `useStoreUsers` with server-side filters instead)
 * - Only need a single filter (use `useStoreUsers` directly)
 *
 * **Performance:** Fetches all users once (up to 100) and filters client-side.
 */
export function useFilteredStoreUsers(filters: StoreUserFilters = {}) {
  const activeStoreId = useActiveStoreId()

  // Fetch all users once (with caching)
  const {
    data: allUsers,
    isLoading,
    isFetching,
    isError,
    error,
  } = useStoreUsers({}, FILTERED_USERS_PAGE_SIZE)

  // Filter on the client side using useMemo for performance
  const filteredUsers = useMemo(() => {
    if (!allUsers) return []

    return allUsers.filter(user => {
      // Filter by role
      if (filters.role_in_store && user.role_in_store !== filters.role_in_store) {
        return false
      }

      // Filter by active status
      if (filters.is_active !== undefined && user.is_active !== filters.is_active) {
        return false
      }

      // Filter by PIN auth capability
      if (
        filters.can_use_pin_auth !== undefined &&
        user.can_use_pin_auth !== filters.can_use_pin_auth
      ) {
        return false
      }

      // Filter by PIN access level
      if (filters.pin_access_level && user.pin_access_level !== filters.pin_access_level) {
        return false
      }

      // Filter by email (case-insensitive partial match)
      if (filters.email) {
        const emailLower = filters.email.toLowerCase()
        if (!user.email.toLowerCase().includes(emailLower)) {
          return false
        }
      }

      // Filter by full name (case-insensitive partial match)
      if (filters.full_name) {
        const nameLower = filters.full_name.toLowerCase()
        if (!user.full_name?.toLowerCase().includes(nameLower)) {
          return false
        }
      }

      return true
    })
  }, [
    allUsers,
    filters.role_in_store,
    filters.is_active,
    filters.can_use_pin_auth,
    filters.pin_access_level,
    filters.email,
    filters.full_name,
  ])

  return {
    data: filteredUsers,
    count: filteredUsers.length,
    isLoading,
    isFetching,
    isError,
    error,
    storeId: activeStoreId,
  }
}

export function useStoreUserActions() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  // Update store user mutation
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string
      updates: {
        role_in_store?: 'owner' | 'manager' | 'employee' | 'staff'
        permissions?: Record<string, boolean>
        is_active?: boolean
        can_use_pin_auth?: boolean
        pin_access_level?: 'basic' | 'elevated' | 'admin'
        pin_permissions?: Record<string, unknown>
      }
    }) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for updating store user')
      }
      return updateStoreUser(activeStoreId, userId, updates)
    },

    onMutate: async ({ userId, updates }) => {
      if (!activeStoreId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.storeUsers.detail(activeStoreId, userId),
      })

      // Snapshot previous value
      const previousStoreUser = queryClient.getQueryData(
        queryKeys.storeUsers.detail(activeStoreId, userId),
      )

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.storeUsers.detail(activeStoreId, userId),
        (old: StoreUser | undefined) => (old ? { ...old, ...updates } : undefined),
      )

      queryClient.setQueriesData(
        { queryKey: queryKeys.storeUsers.byStore(activeStoreId) },
        (oldData: InfiniteData<{ data: StoreUser[]; nextPage?: number }, number> | undefined) => {
          if (!oldData?.pages) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              data: page.data.map((user: StoreUser) =>
                user.user_id === userId ? { ...user, ...updates } : user,
              ),
            })),
          }
        },
      )

      return { previousStoreUser, activeStoreId, userId }
    },

    onError: (err, _variables, context) => {
      // Revert on error
      if (context?.previousStoreUser && context?.activeStoreId && context?.userId) {
        queryClient.setQueryData(
          queryKeys.storeUsers.detail(context.activeStoreId, context.userId),
          context.previousStoreUser,
        )
      }
      console.error('Update error:', err)
      toast.error(`Failed to update user: ${err.message}`)
    },

    onSuccess: (updatedUser, { userId }) => {
      if (!activeStoreId) return

      // 🚀 OPTIMIZATION: Update cache with returned data instead of refetching
      // The RPC already returns the complete updated user data
      queryClient.setQueryData(queryKeys.storeUsers.detail(activeStoreId, userId), updatedUser)

      // Update the infinite query cache with the updated user
      queryClient.setQueriesData(
        { queryKey: queryKeys.storeUsers.byStore(activeStoreId) },
        (oldData: InfiniteData<{ data: StoreUser[]; nextPage?: number }, number> | undefined) => {
          if (!oldData?.pages) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              data: page.data.map((user: StoreUser) =>
                user.user_id === userId ? updatedUser : user,
              ),
            })),
          }
        },
      )

      toast.success('User updated successfully')
    },
  })

  // Remove user from store mutation
  const removeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for removing store user')
      }
      return removeUserFromStore(activeStoreId, userId)
    },
    onSuccess: () => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.storeUsers.byStore(activeStoreId),
        })
      }
      toast.success('User removed from store')
    },
    onError: error => {
      console.error('Remove error:', error)
      toast.error(`Failed to remove user: ${error.message}`)
    },
  })

  // Add user to store mutation
  const addMutation = useMutation({
    mutationFn: ({
      userId,
      roleInStore,
      permissions,
    }: {
      userId: string
      roleInStore: 'owner' | 'manager' | 'employee' | 'staff'
      permissions?: Record<string, boolean>
      assignedBy?: string
    }) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for adding store user')
      }
      return addUserToStore(activeStoreId, userId, roleInStore, permissions)
    },
    onSuccess: () => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.storeUsers.byStore(activeStoreId),
        })
      }
      toast.success('User added to store successfully')
    },
    onError: error => {
      console.error('Add user error:', error)
      toast.error(`Failed to add user to store: ${error.message}`)
    },
  })

  const changeUserRole = (userId: string, role: 'owner' | 'manager' | 'employee' | 'staff') =>
    updateMutation.mutate({
      userId,
      updates: { role_in_store: role },
    })

  const toggleUserActiveStatus = (userId: string, isActive: boolean) =>
    updateMutation.mutate({
      userId,
      updates: { is_active: isActive },
    })

  const enablePinAuth = (userId: string, enabled: boolean) =>
    updateMutation.mutate({
      userId,
      updates: { can_use_pin_auth: enabled },
    })

  const changePinAccessLevel = (userId: string, level: 'basic' | 'elevated' | 'admin') =>
    updateMutation.mutate({
      userId,
      updates: { pin_access_level: level },
    })

  const updateUserPermissions = (userId: string, permissions: Record<string, boolean>) =>
    updateMutation.mutate({
      userId,
      updates: { permissions },
    })

  const removeUser = (userId: string) => removeMutation.mutate(userId)

  const addUser = (
    userId: string,
    roleInStore: 'owner' | 'manager' | 'employee' | 'staff',
    permissions?: Record<string, boolean>,
    assignedBy?: string,
  ) =>
    addMutation.mutate({
      userId,
      roleInStore,
      permissions,
      assignedBy,
    })

  const refetch = (storeId: string | null) => {
    if (!storeId) return
    queryClient.invalidateQueries({
      queryKey: queryKeys.storeUsers.byStore(storeId),
    })
  }

  return {
    // Raw mutations
    updateStoreUser: updateMutation.mutate,
    removeUserFromStore: removeMutation.mutate,
    addUserToStore: addMutation.mutate,

    // Convenience methods
    changeUserRole,
    toggleUserActiveStatus,
    enablePinAuth,
    changePinAccessLevel,
    updateUserPermissions,
    removeUser,
    addUser,
    refetch,
    // Loading states
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isAdding: addMutation.isPending,

    // Current store info
    storeId: activeStoreId,
    storeName: undefined, // We'd need to get this from store state if needed
  }
}
