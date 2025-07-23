// app/(dashboard)/dashboard/(settings)/settings/store/page.tsx

import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserStores } from '@/lib/queries/stores'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

import { StoreUsersPrefetch } from '@/components/store-users/store-users-prefetch'

export default async function SettingsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Get the current user
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    return (
      <div className="text-center py-12">
        <p>Please log in to view users.</p>
      </div>
    )
  }

  // Fetch user stores
  const userStores = await fetchUserStores(user.id, serverClient)

  if (userStores.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Store Access</h2>
        <p className="text-gray-600">You don&apos;t have access to any stores yet.</p>
      </div>
    )
  }

  // ✅ IMPROVED: Try to get last active store from cookie, fallback to first store
  const cookieStore = await cookies()
  const lastActiveStoreId = cookieStore.get('activeStoreId')?.value

  let targetStore = userStores.find(us => us.store.store_id === lastActiveStoreId)?.store
  if (!targetStore) {
    targetStore = userStores[0].store // Fallback to first store
  }

  // ✅ Prefetch store users for the target store using centralized query keys
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.storeUsers.infinite(targetStore.store_id, {}), // ✅ Centralized keys
    queryFn: ({ pageParam = 0 }) =>
      fetchStoreUsersPage(
        targetStore.store_id,
        { page: pageParam, pageSize: 20 },
        {},
        serverClient,
      ),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1,
  })

  // ✅ Prefetch active users and role-based queries using centralized keys
  const filterVariants = [
    { is_active: true },
    { role_in_store: 'owner' as const },
    { role_in_store: 'manager' as const },
    { role_in_store: 'employee' as const },
  ]

  await Promise.all(
    filterVariants.map(filters =>
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.storeUsers.infinite(targetStore.store_id, filters), // ✅ Centralized keys
        queryFn: ({ pageParam = 0 }) =>
          fetchStoreUsersPage(
            targetStore.store_id,
            { page: pageParam, pageSize: 20 },
            filters,
            serverClient,
          ),
        initialPageParam: 0,
        getNextPageParam: lastPage => lastPage.nextPage,
        pages: 1,
      }),
    ),
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* This component will handle store switching if user has multiple stores */}
      <StoreUsersPrefetch />
    </HydrationBoundary>
  )
}
