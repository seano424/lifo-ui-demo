// path: /dashboard/users/page.tsx

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import { StoreUsersPrefetch } from '@/components/store-users/store-users-prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'

export default async function UsersPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()
  const t = await getTranslations('common.pages.users')

  // Get the current user to determine their stores
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    // Redirect to login or show error
    return (
      <div className="text-center py-12">
        <p>{t('loginRequired')}</p>
      </div>
    )
  }

  // Fetch user stores to get the primary/first store
  const userStores = await fetchUserStores(user.id, serverClient)
  const primaryStore = userStores[0]?.store // Get first store

  if (!primaryStore) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">{t('noStoreAccess')}</h2>
        <p className="text-gray-600">{t('noStoreAccessDescription')}</p>
      </div>
    )
  }

  // Prefetch only the main store users query once
  // Client-side filtering will handle role/status filters without additional queries
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.storeUsers.infinite(primaryStore.store_id, {}),
    queryFn: ({ pageParam = 0 }) =>
      fetchStoreUsersPage(
        primaryStore.store_id,
        { page: pageParam, pageSize: 20 },
        {},
        serverClient,
      ),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* This component will handle store switching if user has multiple stores */}
      <StoreUsersPrefetch />

      <div className="space-y-6 container md:py-6 lg:py-8">
        <DashboardInsetHeader title="Team Management" />

        <StoreUsersList />
        {/* <StoreUserStats /> */}
      </div>
    </HydrationBoundary>
  )
}
