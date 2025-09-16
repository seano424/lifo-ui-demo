import { useMemo } from 'react'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Hook to get the count of urgent todos (critical + high priority)
 * Used for displaying notification badges in navigation
 */
export function useUrgentTodosCount() {
  const activeStoreId = useActiveStoreId()
  const { data: analyticsData, isLoading, error } = useStoreAnalytics(activeStoreId || '', '7d')

  const urgentCount = useMemo(() => {
    if (!analyticsData?.analytics?.actionable_batches) {
      return 0
    }

    const actionableBatches = analyticsData.analytics.actionable_batches
    return actionableBatches.filter(
      batch => batch.urgency === 'critical' || batch.urgency === 'high',
    ).length
  }, [analyticsData?.analytics?.actionable_batches])

  return {
    count: urgentCount,
    isLoading,
    error,
  }
}
