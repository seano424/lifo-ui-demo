import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queries/query-keys'
import {
  type DashboardSummary,
  type TodoItem,
  type TodoSection,
  type TodosDashboardOverview,
  fetchDashboardSummary,
  fetchTodosBySection,
  fetchTodosDashboardOverview,
  getAllSections,
  getSectionConfig,
  getSectionDisplayName,
} from '@/lib/queries/todos-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Individual section hook for maximum flexibility
export function useTodosSection(section: TodoSection, customPageSize?: number) {
  const activeStoreId = useActiveStoreId()
  const config = getSectionConfig(section)
  const pageSize = customPageSize || config.defaultPageSize

  const result = useInfiniteQuery({
    queryKey: [
      ...queryKeys.todos.lists(),
      'bySection',
      activeStoreId || '',
      section,
      pageSize,
    ],
    queryFn: ({ pageParam = 0 }) =>
      fetchTodosBySection(activeStoreId!, section, {
        page: pageParam,
        pageSize,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId,
    staleTime: config.staleTimeMs,
    gcTime: config.cacheTimeMs,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors except 408 (timeout)
      if (
        error?.status >= 400 &&
        error?.status < 500 &&
        error?.status !== 408
      ) {
        return false
      }
      return failureCount < 2 // Fewer retries for todos since they're real-time sensitive
    },
  })

  // Flatten pages into single array (same pattern as your batches hook)
  const data = result.data?.pages.flatMap((page) => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? null,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,

    // Section-specific metadata
    section,
    sectionConfig: config,
    displayName: getSectionDisplayName(section),
  }
}

// Comprehensive todos sections hook - manages multiple sections
export function useTodosSections() {
  const activeStoreId = useActiveStoreId()

  // Individual section queries using the optimized configurations
  const immediateAction = useTodosSection('immediate_action')
  const recentlyExpired = useTodosSection('recently_expired')
  const inProgress = useTodosSection('in_progress')
  const discounted = useTodosSection('discounted')
  const readyForDonation = useTodosSection('ready_for_donation')
  const completedToday = useTodosSection('completed_today')
  const actionHistory = useTodosSection('action_history')
  const needsReeval = useTodosSection('needs_reeval')

  // FIXED: Dashboard summary query - calls the right function with correct types
  const summary = useQuery({
    queryKey: queryKeys.todos.dashboardSummary(activeStoreId || ''),
    queryFn: () => fetchDashboardSummary(activeStoreId!),
    enabled: !!activeStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // FIXED: Dashboard overview query - separate query for overview data
  const overview = useQuery({
    queryKey: [...queryKeys.todos.lists(), 'overview', activeStoreId || ''],
    queryFn: () => fetchTodosDashboardOverview(activeStoreId!),
    enabled: !!activeStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Aggregate loading states
  const isAnyLoading =
    immediateAction.isLoading ||
    recentlyExpired.isLoading ||
    inProgress.isLoading ||
    discounted.isLoading ||
    readyForDonation.isLoading ||
    completedToday.isLoading ||
    actionHistory.isLoading ||
    needsReeval.isLoading ||
    summary.isLoading ||
    overview.isLoading

  const isAnyFetching =
    immediateAction.isFetching ||
    recentlyExpired.isFetching ||
    inProgress.isFetching ||
    discounted.isFetching ||
    readyForDonation.isFetching ||
    completedToday.isFetching ||
    actionHistory.isFetching ||
    needsReeval.isFetching ||
    summary.isFetching ||
    overview.isFetching

  const hasAnyError =
    immediateAction.isError ||
    recentlyExpired.isError ||
    inProgress.isError ||
    discounted.isError ||
    readyForDonation.isError ||
    completedToday.isError ||
    actionHistory.isError ||
    needsReeval.isError ||
    summary.isError ||
    overview.isError

  const sections = {
    immediateAction,
    recentlyExpired,
    inProgress,
    discounted,
    readyForDonation,
    completedToday,
    actionHistory,
    needsReeval,
  }

  return {
    // Individual sections with consistent interface
    sections,

    // FIXED: Dashboard summary data (single object)
    summary: {
      data: summary.data,
      isLoading: summary.isLoading,
      isError: summary.isError,
      error: summary.error,
    },

    // FIXED: Dashboard overview data (array of objects)
    overview: {
      data: overview.data || [],
      isLoading: overview.isLoading,
      isError: overview.isError,
      error: overview.error,
    },

    // Aggregate states
    isAnyLoading,
    isAnyFetching,
    hasAnyError,

    // Helper functions
    getSectionByKey: (key: keyof typeof sections) => {
      return sections[key]
    },

    // Quick access to high-priority sections
    urgent: {
      immediateAction: immediateAction.data,
      recentlyExpired: recentlyExpired.data,
      needsReeval: needsReeval.data,
    },

    // Quick access to work-in-progress sections
    workInProgress: {
      inProgress: inProgress.data,
      discounted: discounted.data,
      readyForDonation: readyForDonation.data,
    },

    // Quick access to completion tracking
    completed: {
      today: completedToday.data,
      history: actionHistory.data,
    },
  }
}

// Convenience hooks for specific sections (same pattern as your batches hook)
export function useImmediateActionTodos(customPageSize?: number) {
  return useTodosSection('immediate_action', customPageSize)
}

export function useRecentlyExpiredTodos(customPageSize?: number) {
  return useTodosSection('recently_expired', customPageSize)
}

export function useInProgressTodos(customPageSize?: number) {
  return useTodosSection('in_progress', customPageSize)
}

export function useDiscountedTodos(customPageSize?: number) {
  return useTodosSection('discounted', customPageSize)
}

export function useReadyForDonationTodos(customPageSize?: number) {
  return useTodosSection('ready_for_donation', customPageSize)
}

export function useCompletedTodayTodos(customPageSize?: number) {
  return useTodosSection('completed_today', customPageSize)
}

export function useActionHistoryTodos(customPageSize?: number) {
  return useTodosSection('action_history', customPageSize)
}

export function useNeedsReevalTodos(customPageSize?: number) {
  return useTodosSection('needs_reeval', customPageSize)
}

// FIXED: Dashboard summary hook - returns single object
export function useDashboardSummary() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.todos.dashboardSummary(activeStoreId || ''),
    queryFn: () => fetchDashboardSummary(activeStoreId!),
    enabled: !!activeStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// FIXED: Dashboard overview hook - returns array
export function useTodosDashboardOverview() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: [...queryKeys.todos.lists(), 'overview', activeStoreId || ''],
    queryFn: () => fetchTodosDashboardOverview(activeStoreId!),
    enabled: !!activeStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to get section metadata and configurations
export function useTodosSectionMetadata() {
  return {
    allSections: getAllSections(),
    getSectionConfig,
    getSectionDisplayName,
  }
}

// FIXED: Hook for section-specific counts (derived from summary)
export function useTodosSectionCounts() {
  const summary = useDashboardSummary()

  if (!summary.data) {
    return {
      counts: {},
      isLoading: summary.isLoading,
      isError: summary.isError,
    }
  }

  // Transform summary data into section counts
  // NOTE: This works with the single object structure from get_dashboard_summary
  const counts = {
    immediateAction: summary.data.needs_attention_count || 0,
    critical: summary.data.critical_count || 0,
    high: summary.data.high_count || 0,
    medium: summary.data.medium_count || 0,
    low: summary.data.low_count || 0,
    ok: summary.data.ok_count || 0,
    expired: summary.data.expired_items_count || 0,
  }

  return {
    counts,
    isLoading: summary.isLoading,
    isError: summary.isError,
    totalItems: summary.data.total_active_batches || 0,
    needsAttentionPercentage: summary.data.needs_attention_percentage || 0,
    expiredItemsValue: summary.data.expired_items_value || 0,
  }
}

// Type exports for external use
export type { DashboardSummary, TodoItem, TodoSection, TodosDashboardOverview }
export type TodosSectionHook = ReturnType<typeof useTodosSection>
export type TodosSectionsHook = ReturnType<typeof useTodosSections>
