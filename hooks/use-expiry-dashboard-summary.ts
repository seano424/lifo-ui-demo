import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'

export interface ExpiryDashboardSummary {
  expiring_today: number
  expiring_tomorrow: number
  expiring_this_week: number
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
