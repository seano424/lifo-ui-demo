import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'

export interface ExpiryDashboardSummary {
  expiring_today: number // Day 0
  expiring_tomorrow: number // Day 1
  expiring_in_two_days: number // Day 2
  expiring_in_three_days: number // Day 3
  expiring_this_week: number // Sum of above (matches sidebar badge)
  total_expiring: number // Same as expiring_this_week
  total_active_batches: number
  total_products: number
}

export function useExpiryDashboardSummary(storeId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.dashboard.expirySummary(storeId || ''),
    queryFn: async (): Promise<ExpiryDashboardSummary> => {
      if (!storeId) throw new Error('Store ID required')

      const { data, error } = await supabase.rpc('get_expiry_dashboard_summary', {
        p_store_id: storeId,
      })

      if (error) throw error
      return data as ExpiryDashboardSummary
    },
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
