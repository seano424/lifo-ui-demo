import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
// import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { type BatchFilters, type BatchSortField, fetchExpiringBatches } from '@/lib/queries/batches'
import { fetchBatchesPageRPC } from '@/lib/queries/batches-rpc'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'

interface ExpiringSoonPageProps {
  searchParams: Promise<{
    expiringDays?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }>
}

export default async function ExpiringSoonPage({ searchParams }: ExpiringSoonPageProps) {
  const params = await searchParams
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  try {
    // Prefetch user stores and preferences
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => fetchUserStores(user.id, serverClient),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => fetchUserPreferences(serverClient),
        staleTime: 5 * 60 * 1000,
      }),
    ])

    // Get user's stores to determine which store to prefetch batches for
    const stores = await fetchUserStores(user.id, serverClient)
    const preferences = await fetchUserPreferences(serverClient)

    if (stores.length === 0) {
      return <NoStoresError />
    }

    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // Build filters for expiring batches - default to 30 days expiring
    const expiringDays = parseInt(params.expiringDays || '30', 10)
    const filters: BatchFilters = {
      storeId: storeToUse.store_id,
      expiringInDays: expiringDays,
      status:
        (params.status as 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved') || 'active',
    }

    // Handle search
    if (params.search) {
      filters.search = params.search
    }

    // Handle sorting - default to expiry_date ascending for expiring view
    if (params.sort) {
      filters.sort = {
        field: params.sort as BatchSortField,
        direction: (params.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      filters.sort = { field: 'expiry_date', direction: 'asc' }
    }

    // Prefetch the first page of expiring batches
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.batches.infinite(storeToUse.store_id, filters),
      queryFn: ({ pageParam = 0 }) =>
        fetchBatchesPageRPC({ page: pageParam, pageSize: 100 }, filters, serverClient),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1,
    })

    // Prefetch expiring batches summary
    await queryClient.prefetchQuery({
      queryKey: [
        ...queryKeys.batches.byStore(storeToUse.store_id),
        'expiring',
        { daysAhead: expiringDays },
      ],
      queryFn: () => fetchExpiringBatches(storeToUse.store_id, expiringDays, serverClient),
    })
  } catch (error) {
    logger.warn('ExpiringSoonPage', 'Error prefetching data, will load client-side:', error)
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-6 container py-6 min-h-screen">
        {/* <DashboardInsetHeader page="expiring-soon" /> */}
        <BatchesFilteredList
          highlightExpiring={true}
          initialFilters={{
            filter: 'expiring',
            expiringDays: params.expiringDays || '30',
            status: params.status || 'active',
            search: params.search,
            sort: params.sort,
            direction: params.direction,
          }}
        />
      </div>
    </HydrationBoundary>
  )
}
