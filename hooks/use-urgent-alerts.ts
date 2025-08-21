// hooks/use-urgent-alerts.ts

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUrgentAlerts, type UrgentAlertData } from '@/lib/queries/urgent-alerts'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Store-aware urgent alerts hook
export function useUrgentAlerts() {
  const activeStoreId = useActiveStoreId()

  return useQuery<UrgentAlertData>({
    queryKey: queryKeys.urgentAlerts.byStore(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchUrgentAlerts(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on "No active store" errors
      if (error?.message?.includes('No active store')) {
        return false
      }
      return failureCount < 3
    },
  })
}
