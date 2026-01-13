import { fetchExpiryTodosSummary } from '@/lib/queries/todos-expiry-summary'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useQuery } from '@tanstack/react-query'

/**
 * Hook to fetch expiry-based todo counts for all tabs in a single query
 * More efficient than loading separate counts per tab
 */
export function useExpiryTodosSummary() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: ['todos', 'expiry-summary', activeStoreId || ''],
    queryFn: () => {
      if (!activeStoreId) throw new Error('No active store')
      return fetchExpiryTodosSummary(activeStoreId)
    },
    enabled: !!activeStoreId,
    staleTime: 30 * 1000, // 30 seconds - same as other todo queries
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}
