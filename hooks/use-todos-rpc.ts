// hooks/use-todos-rpc.ts
import { useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchTodosSummary,
  fetchDashboardSummary,
  fetchPendingActions,
  fetchRecentlyDiscounted,
  fetchDonatedItems,
  fetchRecentlyExpired,
  fetchActionHistory,
  fetchAllActiveWithStates,
  fetchItemsNeedingReeval,
  fetchActionableBatches,
  type TodosSummary,
  type PendingAction,
  type RecentlyDiscounted,
  type DonatedItem,
  type RecentlyExpired,
  type ActionHistory,
  type AllActive,
  type NeedsReeval,
  type ActionableBatch,
  type DashboardSummary,
} from '@/lib/queries/todos-rpc'

// Utility hook to get flattened data from infinite queries
export function useFlattenedTodosData<T>(query: { data?: { pages?: T[][] } }): T[] {
  return query?.data?.pages?.flatMap((page: T[]) => page) ?? []
}

// Summary hooks - simple queries with no pagination
export function useTodosSummary(storeId: string) {
  return useQuery({
    queryKey: queryKeys.todos.summary(storeId),
    queryFn: () => fetchTodosSummary(storeId),
    enabled: !!storeId && storeId !== '',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes (reduced from 30 seconds)
  })
}

export function useDashboardSummary(storeId: string) {
  return useQuery({
    queryKey: queryKeys.todos.dashboardSummary(storeId),
    queryFn: () => fetchDashboardSummary(storeId),
    enabled: !!storeId && storeId !== '',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes (reduced from 1 minute)
    refetchOnWindowFocus: true,
  })
}

// Infinite query hooks for paginated data
export function usePendingActions(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.pending(storeId, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchPendingActions(storeId, { limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}

export function useRecentlyDiscounted(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.discounted(storeId, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchRecentlyDiscounted(storeId, { limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}

export function useDonatedItems(
  storeId: string,
  {
    limit = 20,
    daysBack = 7,
    enabled = true,
  }: { limit?: number; daysBack?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.donated(storeId, limit, daysBack),
    queryFn: ({ pageParam = 0 }) =>
      fetchDonatedItems(storeId, { limit, offset: pageParam * limit }, daysBack),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 3 * 60 * 1000, // 3 minutes - donation data changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useRecentlyExpired(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.expired(storeId, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchRecentlyExpired(storeId, { limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useActionHistory(
  storeId: string,
  {
    limit = 20,
    actionType,
    enabled = true,
  }: { limit?: number; actionType?: string; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.history(storeId, limit, actionType),
    queryFn: ({ pageParam = 0 }) =>
      fetchActionHistory(storeId, { limit, offset: pageParam * limit }, actionType),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 5 * 60 * 1000, // 5 minutes - history changes less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

export function useAllActiveWithStates(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.active(storeId, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchAllActiveWithStates(storeId, { limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useItemsNeedingReeval(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.reeval(storeId, limit),
    queryFn: ({ pageParam = 0 }) =>
      fetchItemsNeedingReeval(storeId, { limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useActionableBatches(
  storeId: string,
  {
    limit = 50,
    enabled = true,
    urgencyFilter,
    stateFilter
  }: {
    limit?: number
    enabled?: boolean
    urgencyFilter?: 'critical' | 'high' | 'medium' | 'low' | 'all'
    stateFilter?: 'expired' | 'urgent_action' | 'needs_attention' | 'monitor' | 'ok' | 'all'
  } = {}
) {
  return useInfiniteQuery({
    queryKey: queryKeys.todos.actionableBatches(storeId, limit, urgencyFilter, stateFilter),
    queryFn: async ({ pageParam = 0 }) => {
      const data = await fetchActionableBatches(storeId, {
        limit,
        offset: pageParam * limit
      })

      // Apply client-side filters if needed
      let filteredData = data

      if (urgencyFilter && urgencyFilter !== 'all') {
        filteredData = filteredData.filter(batch => batch.urgency_level === urgencyFilter)
      }

      if (stateFilter && stateFilter !== 'all') {
        filteredData = filteredData.filter(batch => batch.todo_state === stateFilter)
      }

      return filteredData
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: enabled && !!storeId && storeId !== '',
    staleTime: 1 * 60 * 1000, // 1 minute - actionable items change quickly
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60 * 1000, // Every 3 minutes (reduced from 1 minute)
  })
}

// Helper hook to get filtered data for specific tabs
export function useTabActionableBatches(storeId: string, tab: string, filters?: any) {
  const baseQuery = useActionableBatches(storeId, {
    enabled: !!storeId,
    urgencyFilter: filters?.urgency,
  })

  return useMemo(() => {
    const allData = baseQuery.data?.pages.flatMap(page => page) || []

    let filteredData = allData

    switch (tab) {
      case 'suggestions':
        // Items needing immediate attention
        filteredData = allData.filter((batch: ActionableBatch) =>
          batch.todo_state === 'urgent_action' || batch.todo_state === 'needs_attention'
        )
        break
      case 'recently_expired':
        // Recently expired items
        filteredData = allData.filter((batch: ActionableBatch) => batch.todo_state === 'expired')
        break
      case 'all_active':
        // All non-expired items
        filteredData = allData.filter((batch: ActionableBatch) => batch.todo_state !== 'expired')
        break
      default:
        filteredData = allData
    }

    return {
      data: filteredData,
      isLoading: baseQuery.isLoading,
      hasNextPage: baseQuery.hasNextPage,
      fetchNextPage: baseQuery.fetchNextPage,
      isFetchingNextPage: baseQuery.isFetchingNextPage,
      error: baseQuery.error
    }
  }, [baseQuery, tab])
}

// Export types for use in components
export type {
  TodosSummary,
  PendingAction,
  RecentlyDiscounted,
  DonatedItem,
  RecentlyExpired,
  ActionHistory,
  AllActive,
  NeedsReeval,
  ActionableBatch,
  DashboardSummary,
}