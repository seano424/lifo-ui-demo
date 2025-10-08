import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { createClient } from '@/lib/supabase/server'
import { hasBatchesRPC } from '@/lib/queries/batches-rpc'
import { fetchDashboardSummary } from '@/lib/queries/todos-rpc'
import { fetchStoreSettings } from '@/lib/queries/store-settings'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'

export default async function DashboardPage() {
  const activeStoreId = await getActiveStoreCookie()

  // Show welcome screen if no active store selected
  if (!activeStoreId) {
    return <DashboardWelcome />
  }

  const supabase = await createClient()

  // Check if user has any batches (optimized RPC: 555ms → ~20ms)
  const hasBatches = await hasBatchesRPC(activeStoreId, supabase)

  // Show welcome screen if no batches exist
  if (!hasBatches) {
    return <DashboardWelcome />
  }

  // Prefetch dashboard data on the server
  const { queryClient } = await createPrefetchedQuery()

  // Prefetch dashboard summary
  await queryClient.prefetchQuery({
    queryKey: queryKeys.todos.dashboardSummary(activeStoreId),
    queryFn: () => fetchDashboardSummary(activeStoreId, supabase),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Prefetch store settings (needed by AlertSensitivityControls)
  await queryClient.prefetchQuery({
    queryKey: queryKeys.stores.detail(activeStoreId),
    queryFn: () => fetchStoreSettings(activeStoreId, supabase),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  )
}
