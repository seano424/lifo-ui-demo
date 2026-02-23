import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import AutomationsClient from './automations-client'

export default async function AutomationsPage() {
  const activeStoreId = await getActiveStoreCookie()

  if (!activeStoreId) {
    return <AutomationsClient />
  }

  const supabase = await createClient()
  const { queryClient } = await createPrefetchedQuery()

  // Prefetch categories with tracking settings
  await queryClient.prefetchQuery({
    queryKey: queryKeys.batchTrackingOnboarding.categories(activeStoreId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_categories_with_tracking_settings', {
        p_store_id: activeStoreId,
      })
      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AutomationsClient />
    </HydrationBoundary>
  )
}
