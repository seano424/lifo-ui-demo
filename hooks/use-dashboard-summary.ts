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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
