import { useQuery } from '@tanstack/react-query'
import { fetchExpiryTodosCount } from '@/lib/queries/todos-expiry-count'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Ultra-fast hook to get expiring todos count for notification bell
 *
 * Uses store's configured expiry_alert_days setting (defaults to 3 days).
 * Performance: ~3-10ms (similar to urgent count query)
 *
 * @returns Object with count, isLoading, and error properties
 */
export function useExpiryTodosCount() {
  const activeStoreId = useActiveStoreId()

  const query = useQuery({
    queryKey: queryKeys.todos.expiryCount(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchExpiryTodosCount(activeStoreId)
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
