'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SettingUpFlow } from '@/components/dashboard/setting-up-flow'
import { hasBatchesRPC } from '@/lib/queries/batches-rpc'
import { useStoreState } from '@/lib/stores/store-context'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import { Skeleton } from '@/components/ui/skeleton'
import { queryKeys } from '@/lib/queries/query-keys'

export function DashboardPageClient() {
  const { activeStore } = useStoreState()
  const { isSetupComplete } = useSetupFlowStore()

  // Check if the active store has any batches
  const { data: hasBatches, isLoading } = useQuery({
    queryKey: activeStore?.store_id
      ? queryKeys.batches.hasBatches(activeStore.store_id)
      : ['hasBatches', 'no-store'],
    queryFn: () => {
      if (!activeStore?.store_id) return false
      return hasBatchesRPC(activeStore.store_id)
    },
    enabled: !!activeStore?.store_id,
    staleTime: 2 * 60 * 1000, // 2 minutes - batches don't change too frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch to prevent stale "no batches" state when user creates first batch
  })

  // Show loading skeleton while checking
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Show setup flow if setup is not complete
  if (!isSetupComplete && (!activeStore || !hasBatches)) {
    return <SettingUpFlow />
  }

  // Show welcome screen if no active store or no batches exist
  if (!activeStore || !hasBatches) {
    return <DashboardWelcome />
  }

  return <DashboardContent />
}
