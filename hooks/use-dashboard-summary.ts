import { queryKeys } from '@/lib/queries/query-keys'
import { fetchDashboardSummary } from '@/lib/queries/todos-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useQuery } from '@tanstack/react-query'

export function useDashboardSummary() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.todos.dashboardSummary(activeStoreId || ''),
    queryFn: () => fetchDashboardSummary(activeStoreId!),
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnMount: false, // Use cached data if available
  })
}
