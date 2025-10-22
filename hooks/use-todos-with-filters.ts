import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchTodosWithFilters,
  fetchTodosCounts,
  type TodoActionType,
  type TodoFilters,
  type TodoUrgencyLevel,
} from '@/lib/queries/todos-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

/**
 * Main hook for flexible todo filtering with infinite scroll
 */
export function useTodosWithFilters(filters: TodoFilters = {}, pageSize: number = 20) {
  const activeStoreId = useActiveStoreId()

  const result = useInfiniteQuery({
    queryKey: queryKeys.todos.withFilters(activeStoreId || '', filters, pageSize),
    queryFn: ({ pageParam = 0 }) => {
      if (!activeStoreId) throw new Error('No active store')

      return fetchTodosWithFilters(activeStoreId, filters, {
        limit: pageSize,
        offset: pageParam * pageSize,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      // Fixed: Check if we got exactly 0 items OR less than requested
      // This handles the edge case where the last page has exactly pageSize items
      if (lastPage.length === 0 || lastPage.length < pageSize) {
        return undefined
      }
      // Return the next page number (current page count becomes next page index)
      return allPages.length
    },
    initialPageParam: 0,
    enabled: !!activeStoreId,
    staleTime: 30 * 1000, // 30 seconds - shorter for better responsiveness
    gcTime: 3 * 60 * 1000, // 3 minutes
  })

  // Flatten pages into single array (like your existing pattern)
  const data = result.data?.pages.flat() ?? []

  return {
    data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasNextPage: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    refetch: result.refetch,
  }
}

/**
 * TRELLO-STYLE COLUMN HOOKS - The main hooks you'll use for your Kanban interface
 */

export function usePendingTodos(
  additionalFilters?: Omit<TodoFilters, 'completion_status'>,
  pageSize: number = 20,
) {
  return useTodosWithFilters(
    {
      completion_status: 'pending',
      ...additionalFilters,
    },
    pageSize,
  )
}

export function useInProgressTodos(
  additionalFilters?: Omit<TodoFilters, 'completion_status'>,
  pageSize: number = 20,
) {
  return useTodosWithFilters(
    {
      completion_status: 'in_progress',
      ...additionalFilters,
    },
    pageSize,
  )
}

export function useCompletedTodos(
  additionalFilters?: Omit<TodoFilters, 'completion_status'>,
  pageSize: number = 20,
) {
  return useTodosWithFilters(
    {
      completion_status: 'completed',
      ...additionalFilters,
    },
    pageSize,
  )
}

/**
 * CONVENIENCE HOOKS - Pre-configured filters for common use cases
 */

// Urgent items only (critical + high priority)
export function useUrgentTodos(pageSize: number = 20) {
  return useTodosWithFilters(
    {
      urgency_level: ['critical', 'high'],
      completion_status: 'pending',
    },
    pageSize,
  )
}

// Items expiring soon (with configurable date range)
// Shows items based purely on expiry timeline, regardless of action status
export function useExpiringTodos(
  additionalFilters?: Omit<TodoFilters, 'batch_status'>,
  pageSize: number = 20,
) {
  return useTodosWithFilters(
    {
      batch_status: ['active'],
      // Default to showing all expiring items (min: 0) if no filters provided
      days_to_expiry_min: additionalFilters?.days_to_expiry_min ?? 0,
      // DO NOT filter by completion_status - expiring items should show regardless of action status
      ...additionalFilters,
    },
    pageSize,
  )
}

// Expired items (already past expiry date)
export function useExpiredTodos(
  additionalFilters?: Omit<TodoFilters, 'batch_status'>,
  pageSize: number = 20,
) {
  return useTodosWithFilters(
    {
      batch_status: ['expired'],
      ...additionalFilters,
    },
    pageSize,
  )
}

// Items ready for discount
export function useDiscountableTodos(pageSize: number = 20) {
  return useTodosWithFilters(
    {
      action_type: ['discount'],
      completion_status: 'pending',
      urgency_level: ['high', 'medium'],
    },
    pageSize,
  )
}

// Items ready for donation
export function useDonatableTodos(pageSize: number = 20) {
  return useTodosWithFilters(
    {
      action_type: ['donate', 'donate_prepared'],
      completion_status: 'pending',
    },
    pageSize,
  )
}

// Recently completed actions (for action history)
export function useRecentlyCompletedTodos(pageSize: number = 50) {
  return useTodosWithFilters(
    {
      completion_status: 'completed',
    },
    pageSize,
  )
}

/**
 * PARAMETERIZED HOOKS - For advanced filtering with user input
 */

// Filter by specific urgency levels
export function useTodosByUrgency(urgencyLevels: TodoUrgencyLevel[], pageSize: number = 20) {
  return useTodosWithFilters(
    {
      urgency_level: urgencyLevels,
    },
    pageSize,
  )
}

// Filter by specific action types
export function useTodosByActionType(actionTypes: TodoActionType[], pageSize: number = 20) {
  return useTodosWithFilters(
    {
      action_type: actionTypes,
    },
    pageSize,
  )
}

// Search todos by product name
export function useTodosByProductName(productName: string, pageSize: number = 20) {
  return useTodosWithFilters(
    {
      product_name: productName,
    },
    pageSize,
  )
}

/**
 * HELPER HOOK - For components that need flattened data (your existing pattern)
 */
export function useFlattenedTodosData<T>(query: { data?: { pages?: T[][] } }): T[] {
  return query?.data?.pages?.flatMap((page: T[]) => page) ?? []
}

/**
 * COMBINED HOOKS - Common filter combinations for your Trello interface
 */

// Pending todos with urgency filter
export function usePendingTodosByUrgency(urgency: TodoUrgencyLevel[], pageSize: number = 20) {
  return usePendingTodos({ urgency_level: urgency }, pageSize)
}

// In-progress todos with action type filter
export function useInProgressTodosByAction(actionTypes: TodoActionType[], pageSize: number = 20) {
  return useInProgressTodos({ action_type: actionTypes }, pageSize)
}

// Completed todos with time range
export function useCompletedTodosRecent(daysBack: number = 7, pageSize: number = 50) {
  console.log('daysBack to get completed todos', daysBack)
  return useCompletedTodos(
    {
      // Note: You might need to add date filtering to your RPC function
      // For now, this just gets all completed todos
    },
    pageSize,
  )
}

/**
 * Hook to fetch counts for all todo tabs
 * This is more efficient than loading all todos just to get counts
 */
export function useTodosCounts(filters: TodoFilters = {}) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.todos.counts(activeStoreId || '', filters),
    queryFn: () => {
      if (!activeStoreId) throw new Error('No active store')
      return fetchTodosCounts(activeStoreId, filters)
    },
    enabled: !!activeStoreId,
    staleTime: 30 * 1000, // 30 seconds - same as other todo queries
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}
