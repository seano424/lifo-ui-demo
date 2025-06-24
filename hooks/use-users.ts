// hooks/use-users.ts

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUsersPage,
  fetchUserById,
  fetchUserRoles,
  checkUserHasRole,
  createUser,
  updateUser,
  deleteUser,
  type UserFilters,
} from '@/lib/queries/users'
import { queryKeys } from '@/lib/queries/query-keys'
import { toast } from 'sonner'

// Main infinite scroll hook for users list
export function useUsers(filters: UserFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.users.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchUsersPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
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
  }
}

// Single user query
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  })
}

// User roles query
export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'roles'],
    queryFn: () => fetchUserRoles(userId),
    enabled: !!userId,
  })
}

// Check if user has specific role
export function useUserHasRole(userId: string, roleName: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'hasRole', roleName],
    queryFn: () => checkUserHasRole(userId, roleName),
    enabled: !!userId && !!roleName,
  })
}

// Convenience hooks for common filters
export function useActiveUsers() {
  return useUsers({ is_active: true })
}

export function useInactiveUsers() {
  return useUsers({ is_active: false })
}

export function useUsersByRole(roleName: string) {
  return useUsers({ role: roleName })
}

// CRUD Actions with optimistic updates and cache invalidation
export function useUserActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() })
      toast.success('User created successfully')
    },
    onError: () => {
      toast.error('Failed to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateUser(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) })

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id))

      // Optimistically update
      queryClient.setQueryData(queryKeys.users.detail(id), (old: any) => ({
        ...old,
        ...updates,
      }))

      return { previousUser, id }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(context.id), context.previousUser)
      }
      toast.error('Failed to update user')
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after mutation
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

  return {
    createUser: createMutation.mutate,
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    activateUser,
    deactivateUser,
    updateUserProfile,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
