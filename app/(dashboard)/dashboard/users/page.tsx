// path: /dashboard/users/page.tsx

import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import { StoreUsersPrefetch } from '@/components/store-users/store-users-prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Get the current user to determine their stores
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    // Redirect to login or show error
    return (
      <div className="text-center py-12">
        <p>Please log in to view users.</p>
      </div>
    )
  }

  // Fetch user stores to get the primary/first store
  const userStores = await fetchUserStores(user.id, serverClient)
  const primaryStore = userStores[0]?.store // Get first store

  if (!primaryStore) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Store Access</h2>
        <p className="text-gray-600">You don&apos;t have access to any stores yet.</p>
      </div>
    )
  }

  // Prefetch store users for the primary store
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

  // Also prefetch active store users for stats
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.storeUsers.infinite(primaryStore.store_id, { is_active: true }),
    queryFn: ({ pageParam = 0 }) =>
      fetchStoreUsersPage(
        primaryStore.store_id,
        { page: pageParam, pageSize: 20 },
        { is_active: true },
        serverClient,
      ),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1,
  })

  // Prefetch users by role for stats
  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.storeUsers.infinite(primaryStore.store_id, { role_in_store: 'owner' }),
      queryFn: ({ pageParam = 0 }) =>
        fetchStoreUsersPage(
          primaryStore.store_id,
          { page: pageParam, pageSize: 20 },
          { role_in_store: 'owner' },
          serverClient,
        ),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.storeUsers.infinite(primaryStore.store_id, { role_in_store: 'manager' }),
      queryFn: ({ pageParam = 0 }) =>
        fetchStoreUsersPage(
          primaryStore.store_id,
          { page: pageParam, pageSize: 20 },
          { role_in_store: 'manager' },
          serverClient,
        ),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.storeUsers.infinite(primaryStore.store_id, { role_in_store: 'employee' }),
      queryFn: ({ pageParam = 0 }) =>
        fetchStoreUsersPage(
          primaryStore.store_id,
          { page: pageParam, pageSize: 20 },
          { role_in_store: 'employee' },
          serverClient,
        ),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* This component will handle store switching if user has multiple stores */}
      <StoreUsersPrefetch />

      <div className="space-y-6">
        <DashboardInsetHeader title="Team Management" />

        <StoreUsersList />
        {/* <StoreUserStats /> */}
      </div>
    </HydrationBoundary>
  )
}
