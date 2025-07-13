// hooks/use-store-users.ts
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useStoreState } from '@/lib/stores/store-context'
import {
  fetchStoreUsersPage,
  fetchStoreUserById,
  updateStoreUser,
  removeUserFromStore,
  addUserToStore,
  type StoreUser,
  type StoreUserFilters,
} from '@/lib/queries/store-users'

// Updated query keys to include store users
const storeUserQueryKeys = {
  all: ['storeUsers'] as const,
  byStore: (storeId: string) => [...storeUserQueryKeys.all, 'byStore', storeId] as const,
  list: (storeId: string, filters: StoreUserFilters) =>
    [...storeUserQueryKeys.byStore(storeId), 'list', { filters }] as const,
  infinite: (storeId: string, filters: StoreUserFilters) =>
    [...storeUserQueryKeys.byStore(storeId), 'infinite', { filters }] as const,
  detail: (storeId: string, userId: string) =>
    [...storeUserQueryKeys.byStore(storeId), 'detail', userId] as const,
}

// Main hook for fetching store users with infinite scroll
export function useStoreUsers(filters: StoreUserFilters = {}, pageSize: number = 20) {
  const { activeStore } = useStoreState()
  const storeId = activeStore?.store_id

  const result = useInfiniteQuery({
    queryKey: storeUserQueryKeys.infinite(storeId || '', filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchStoreUsersPage(storeId!, { page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!storeId,
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
    storeId, // Return current store ID for reference
  }
}

// Hook for getting a specific store user
export function useStoreUser(userId: string) {
  const { activeStore } = useStoreState()
  const storeId = activeStore?.store_id

  return useQuery({
    queryKey: storeUserQueryKeys.detail(storeId || '', userId),
    queryFn: () => fetchStoreUserById(storeId!, userId),
    enabled: !!storeId && !!userId,
  })
}

// Convenience hooks for different user roles
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

// Actions hook for managing store users
export function useStoreUserActions() {
  const queryClient = useQueryClient()
  const { activeStore } = useStoreState()
  const storeId = activeStore?.store_id

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
    }) => updateStoreUser(storeId!, userId, updates),
    onMutate: async ({ userId, updates }) => {
      if (!storeId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: storeUserQueryKeys.detail(storeId, userId) })

      // Snapshot previous value
      const previousStoreUser = queryClient.getQueryData(storeUserQueryKeys.detail(storeId, userId))

      // Optimistically update
      queryClient.setQueryData(storeUserQueryKeys.detail(storeId, userId), (old: StoreUser) => ({
        ...old,
        ...updates,
      }))

      return { previousStoreUser, storeId, userId }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousStoreUser && context?.storeId && context?.userId) {
        queryClient.setQueryData(
          storeUserQueryKeys.detail(context.storeId, context.userId),
          context.previousStoreUser,
        )
      }
      console.error('Update error:', err)
      toast.error(`Failed to update user: ${err.message}`)
    },
    onSettled: (data, error, { userId }) => {
      if (!storeId) return

      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: storeUserQueryKeys.detail(storeId, userId) })
      queryClient.invalidateQueries({ queryKey: storeUserQueryKeys.byStore(storeId) })
    },
    onSuccess: () => {
      toast.success('User updated successfully')
    },
  })

  // Remove user from store mutation
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeUserFromStore(storeId!, userId),
    onSuccess: () => {
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: storeUserQueryKeys.byStore(storeId) })
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
    }) => addUserToStore(storeId!, userId, roleInStore, permissions, assignedBy),
    onSuccess: () => {
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: storeUserQueryKeys.byStore(storeId) })
      }
      toast.success('User added to store successfully')
    },
    onError: error => {
      console.error('Add user error:', error)
      toast.error(`Failed to add user to store: ${error.message}`)
    },
  })

  // Convenience methods for common actions
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

    // Loading states
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isAdding: addMutation.isPending,

    // Current store info
    storeId,
    storeName: activeStore?.store_name,
  }
}
