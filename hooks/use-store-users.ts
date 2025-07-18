// hooks/use-store-users.ts - Fixed to use centralized query keys

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useActiveStoreId } from '@/lib/stores/store-context' // ✅ Use helper like products
import { queryKeys } from '@/lib/queries/query-keys' // ✅ Use centralized query keys
import {
  fetchStoreUsersPage,
  fetchStoreUserById,
  updateStoreUser,
  removeUserFromStore,
  addUserToStore,
  type StoreUser,
  type StoreUserFilters,
} from '@/lib/queries/store-users'

// ✅ READING DATA - Store-aware infinite scroll users list
export function useStoreUsers(filters: StoreUserFilters = {}, pageSize: number = 20) {
  const activeStoreId = useActiveStoreId()

  const result = useInfiniteQuery({
    queryKey: queryKeys.storeUsers.infinite(activeStoreId || '', filters), // ✅ Centralized keys
    queryFn: ({ pageParam = 0 }) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for fetching store users') // ✅ Same validation as products
      }
      return fetchStoreUsersPage(activeStoreId, { page: pageParam, pageSize }, filters)
    },
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId, // ✅ Only fetch when we have a store
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

// ✅ READING DATA - Single store user by ID (store-aware)
export function useStoreUser(userId: string) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.storeUsers.detail(activeStoreId || '', userId), // ✅ Centralized keys
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for fetching store user')
      }
      return fetchStoreUserById(activeStoreId, userId)
    },
    enabled: !!activeStoreId && !!userId,
  })
}

// ✅ Convenience hooks for different user roles (same as before)
export function useStoreOwners() {
  return useStoreUsers({ role_in_store: 'owner' })
}

export function useStoreManagers() {
  return useStoreUsers({ role_in_store: 'manager' })
}

export function useStoreEmployees() {
  return useStoreUsers({ role_in_store: 'employee' })
}

export function useActiveStoreUsers() {
  return useStoreUsers({ is_active: true })
}

export function useInactiveStoreUsers() {
  return useStoreUsers({ is_active: false })
}

export function usePinEnabledUsers() {
  return useStoreUsers({ can_use_pin_auth: true })
}

// ✅ WRITING DATA - Store user CRUD actions with proper cache invalidation
export function useStoreUserActions() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId() // ✅ Same pattern as products

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
        throw new Error('Store ID is required for updating store user') // ✅ Validation
      }
      return updateStoreUser(activeStoreId, userId, updates)
    },

    onMutate: async ({ userId, updates }) => {
      if (!activeStoreId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.storeUsers.detail(activeStoreId, userId), // ✅ Centralized keys
      })

      // Snapshot previous value
      const previousStoreUser = queryClient.getQueryData(
        queryKeys.storeUsers.detail(activeStoreId, userId), // ✅ Centralized keys
      )

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.storeUsers.detail(activeStoreId, userId), // ✅ Centralized keys
        (old: StoreUser | undefined) => (old ? { ...old, ...updates } : undefined),
      )

      // ✅ Also update in store-specific infinite query caches (same as products)
      queryClient.setQueriesData(
        { queryKey: queryKeys.storeUsers.byStore(activeStoreId) }, // ✅ Centralized keys
        (oldData: any) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
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

    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousStoreUser && context?.activeStoreId && context?.userId) {
        queryClient.setQueryData(
          queryKeys.storeUsers.detail(context.activeStoreId, context.userId), // ✅ Centralized keys
          context.previousStoreUser,
        )
      }
      console.error('Update error:', err)
      toast.error(`Failed to update user: ${err.message}`)
    },

    onSettled: (data, error, { userId }) => {
      if (!activeStoreId) return

      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeUsers.detail(activeStoreId, userId), // ✅ Centralized keys
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeUsers.byStore(activeStoreId), // ✅ Centralized keys
      })
    },

    onSuccess: () => {
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
          queryKey: queryKeys.storeUsers.byStore(activeStoreId), // ✅ Centralized keys
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
      assignedBy,
    }: {
      userId: string
      roleInStore: 'owner' | 'manager' | 'employee' | 'staff'
      permissions?: Record<string, boolean>
      assignedBy?: string
    }) => {
      if (!activeStoreId) {
        throw new Error('Store ID is required for adding store user')
      }
      return addUserToStore(activeStoreId, userId, roleInStore, permissions, assignedBy)
    },
    onSuccess: () => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.storeUsers.byStore(activeStoreId), // ✅ Centralized keys
        })
      }
      toast.success('User added to store successfully')
    },
    onError: error => {
      console.error('Add user error:', error)
      toast.error(`Failed to add user to store: ${error.message}`)
    },
  })

  // ✅ Convenience methods for common actions (same as products pattern)
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
