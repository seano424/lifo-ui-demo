import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchDonationRecipients,
  fetchDonationActions,
  fetchDonationAnalytics,
  checkDonationEligibility,
  executeDonationAction
} from '@/lib/queries/donations'
import { queryKeys } from '@/lib/queries/query-keys'
import { toast } from 'sonner'

// Hook for getting donation recipients
export function useDonationRecipients(
  storeId: string,
  recipientType?: string,
  isActive: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.donations.recipients(storeId),
    queryFn: () => fetchDonationRecipients(storeId, recipientType, isActive),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - recipients don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Hook for getting donation actions/history
export function useDonationActions(
  storeId: string,
  actionType?: string,
  days: number = 30,
  limit: number = 100
) {
  return useQuery({
    queryKey: queryKeys.donations.actions(storeId),
    queryFn: () => fetchDonationActions(storeId, actionType, days, limit),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook for getting donation analytics
export function useDonationAnalytics(storeId: string, days: number = 30) {
  return useQuery({
    queryKey: queryKeys.donations.analytics(storeId),
    queryFn: () => fetchDonationAnalytics(storeId, days),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Hook for checking donation eligibility
export function useDonationEligibility(
  batchId: string,
  options: {
    current_temperature?: number
    packaging_condition?: 'good' | 'damaged' | 'opened'
    force_recalculate?: boolean
  } = {}
) {
  return useQuery({
    queryKey: ['donationEligibility', batchId, options],
    queryFn: () => checkDonationEligibility(batchId, options),
    enabled: !!batchId,
    staleTime: 10 * 60 * 1000, // 10 minutes - eligibility doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Mutation for executing donation actions
export function useDonationAction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      batchId, 
      recipientId, 
      notes 
    }: { 
      batchId: string
      recipientId: string
      notes?: string 
    }) => executeDonationAction(batchId, recipientId, notes),
    onSuccess: (data, variables) => {
      toast.success(`Successfully donated batch to recipient`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeInsights.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.all,
      })
    },
    onError: (error) => {
      toast.error(`Failed to execute donation: ${error.message}`)
    },
  })
}

// Convenience hook for getting active donation recipients for a store
export function useActiveDonationRecipients(storeId: string) {
  const { data, ...rest } = useDonationRecipients(storeId, undefined, true)
  
  return {
    ...rest,
    recipients: data?.recipients || [],
    totalCount: data?.total_count || 0,
  }
}