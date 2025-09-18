import { useMemo } from 'react'
import { useDashboardSummary } from '@/hooks/use-todos-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Hook to get the count of urgent todos (critical + high priority)
 * Used for displaying notification badges in navigation
 */
export function useUrgentTodosCount() {
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useDashboardSummary(activeStoreId || '')

  const urgentCount = useMemo(() => {
    if (!data) {
      return 0
    }

    // Critical + High priority = urgent todos
    return data.critical_count + data.high_count
  }, [data])

  return {
    count: urgentCount,
    isLoading,
    error,
  }
}
