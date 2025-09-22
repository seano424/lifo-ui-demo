import { useDashboardSummary } from '@/hooks/use-dashboard-summary'
import { useMemo } from 'react'

/**
 * Hook to get the count of urgent todos (critical + high priority)
 * Used for displaying notification badges in navigation
 */
export function useUrgentTodosCount() {
  const { data, isLoading, error } = useDashboardSummary()

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
