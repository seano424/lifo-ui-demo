import { useQuery } from '@tanstack/react-query'
import { fetchUrgentTodosCount } from '@/lib/queries/todos-urgent-count'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Ultra-fast hook to get urgent todos count for sidebar badge
 *
 * Uses materialized view for 300x faster performance:
 * - Before: 1006ms (full dashboard summary)
 * - After: 3-10ms (materialized view count)
 *
 * @returns Object with count, isLoading, and error properties
 */
export function useUrgentTodosCount() {
  const activeStoreId = useActiveStoreId()

  const query = useQuery({
    queryKey: queryKeys.todos.urgentCount(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchUrgentTodosCount(activeStoreId)
    },
    enabled: !!activeStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance freshness vs performance
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: true, // Do refetch when user returns to window
  })

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
