import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreSettings } from '@/lib/queries/store-settings'
import { fetchStoreUsers } from '@/lib/queries/store-users'
import UnifiedSettingsPage from './settings-client'

export default async function SettingsPage() {
  const activeStoreId = await getActiveStoreCookie()

  if (!activeStoreId) {
    // If no active store, just render client component
    return <UnifiedSettingsPage />
  }

  const supabase = await createClient()
  const { queryClient } = await createPrefetchedQuery()

  // Prefetch store settings
  await queryClient.prefetchQuery({
    queryKey: queryKeys.stores.detail(activeStoreId),
    queryFn: () => fetchStoreSettings(activeStoreId, supabase),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Prefetch store users (limit to 20 for settings page)
  await queryClient.prefetchQuery({
    queryKey: queryKeys.storeUsers.byStore(activeStoreId),
    queryFn: () => fetchStoreUsers(activeStoreId, supabase),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UnifiedSettingsPage />
    </HydrationBoundary>
  )
}
