import { useQuery } from '@tanstack/react-query'
import { 
  fetchStoreInsights, 
  fetchActionableBatches, 
  fetchAllStoresInsights 
} from '@/lib/queries/store-insights'
import { queryKeys } from '@/lib/queries/query-keys'

// Hook for getting high-level store insights
export function useStoreInsights(storeId: string) {
  return useQuery({
    queryKey: queryKeys.storeInsights.store(storeId),
    queryFn: () => fetchStoreInsights(storeId),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes - insights change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  })
}

// Hook for getting detailed actionable batches
export function useActionableBatches(storeId: string) {
  return useQuery({
    queryKey: queryKeys.storeInsights.actionable(storeId),
    queryFn: () => fetchActionableBatches(storeId),
    enabled: !!storeId,
    staleTime: 1 * 60 * 1000, // 1 minute - actionable items change quickly
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  })
}

// Hook for getting insights across all stores (admin/manager view)
export function useAllStoresInsights() {
  return useQuery({
    queryKey: queryKeys.storeInsights.allStores(),
    queryFn: () => fetchAllStoresInsights(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  })
}

// Convenience hooks for specific insights
export function useStoreCriticalBatches(storeId: string) {
  const { data: insights, ...rest } = useStoreInsights(storeId)
  
  return {
    ...rest,
    criticalBatches: insights?.insights.expiring_soon.count || 0,
    readyForDiscountItems: insights?.insights.ready_for_discount.count || 0,
    perfectForDonationBatches: insights?.insights.perfect_for_donation.count || 0,
    highUrgencyItems: insights?.insights.high_urgency.count || 0,
    actionRequiredPercentage: insights?.insights.summary.action_required_percentage || 0,
    totalActiveBatches: insights?.insights.summary.total_active_batches || 0,
    totalActionableItems: insights?.insights.summary.total_actionable_items || 0,
  }
}

// Hook for urgent actions needed across all stores
export function useSystemWideUrgentActions() {
  const { data: allStoresInsights, ...rest } = useAllStoresInsights()
  
  const urgentActions = allStoresInsights?.reduce((acc, store) => {
    const insights = store.insights
    acc.totalExpiringSoon += insights.expiring_soon.count
    acc.totalReadyForDiscount += insights.ready_for_discount.count
    acc.totalPerfectForDonation += insights.perfect_for_donation.count
    acc.totalHighUrgency += insights.high_urgency.count
    acc.storesWithActions += (
      insights.expiring_soon.count + 
      insights.ready_for_discount.count + 
      insights.perfect_for_donation.count
    ) > 0 ? 1 : 0
    return acc
  }, {
    totalExpiringSoon: 0,
    totalReadyForDiscount: 0,
    totalPerfectForDonation: 0,
    totalHighUrgency: 0,
    storesWithActions: 0,
    totalStores: allStoresInsights?.length || 0
  })
  
  return {
    ...rest,
    urgentActions,
    hasSystemWideUrgentActions: (urgentActions?.totalExpiringSoon || 0) > 0,
  }
}