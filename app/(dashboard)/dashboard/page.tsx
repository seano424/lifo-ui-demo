import { getTranslations } from 'next-intl/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { createClient } from '@/lib/supabase/server'
import { fetchBatchesPage } from '@/lib/queries/batches'
import { fetchDashboardSummary } from '@/lib/queries/todos-rpc'
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
  const t = await getTranslations('dashboardNav.pages')

  // Check if user has any batches (lightweight query)
  const { count } = await fetchBatchesPage(
    { page: 0, pageSize: 1 },
    { storeId: activeStoreId },
    supabase,
  )

  const hasBatches = count > 0

  // Show welcome screen if no batches exist
  if (!hasBatches) {
    return <DashboardWelcome />
  }

  // Prefetch dashboard summary data on the server
  const { queryClient } = await createPrefetchedQuery()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.todos.dashboardSummary(activeStoreId),
    queryFn: () => fetchDashboardSummary(activeStoreId, supabase),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent title={t('dashboard')} />
    </HydrationBoundary>
  )
}
