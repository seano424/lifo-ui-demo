import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import BatchesHeader from '@/components/batches/batches-header'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import {
  type BatchFilters,
  type BatchSortField,
  fetchBatchesPage,
  fetchExpiringBatches,
} from '@/lib/queries/batches'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface InventoryBatchesPageProps {
  searchParams: Promise<{
    filter?: string
    expiringDays?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }>
}

export default async function InventoryBatchesPage({ searchParams }: InventoryBatchesPageProps) {
  // Await searchParams as required in Next.js 15
  const params = await searchParams
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Get current authenticated user
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
      // User has no stores - show error instead of redirecting
      return <NoStoresError />
    }

    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // Build filters based on search params
    const filters: BatchFilters = { storeId: storeToUse.store_id }

    // Handle expiring filter
    if (params.filter === 'expiring') {
      filters.expiringInDays = parseInt(params.expiringDays || '7', 10)
    }

    // Handle status filter
    if (params.status) {
      filters.status = params.status as 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved'
    }

    // Handle search
    if (params.search) {
      filters.search = params.search
    }

    // Handle sorting - set defaults if not provided to match client-side defaults
    if (params.sort) {
      filters.sort = {
        field: params.sort as BatchSortField,
        direction: (params.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      // Set default sort to match client-side behavior in batches-filtered-list.tsx
      filters.sort =
        params.filter === 'expiring'
          ? { field: 'expiry_date', direction: 'asc' }
          : { field: 'created_at', direction: 'desc' }
    }

    // Prefetch the first page of batches with filters
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.batches.infinite(storeToUse.store_id, filters),
      queryFn: ({ pageParam = 0 }) =>
        fetchBatchesPage({ page: pageParam, pageSize: 100 }, filters, serverClient),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1, // Only prefetch first page
    })

    // If showing expiring items, also prefetch expiring batches summary
    if (params.filter === 'expiring') {
      await queryClient.prefetchQuery({
        queryKey: [
          ...queryKeys.batches.byStore(storeToUse.store_id),
          'expiring',
          { daysAhead: filters.expiringInDays },
        ],
        queryFn: () =>
          fetchExpiringBatches(storeToUse.store_id, filters.expiringInDays, serverClient),
      })
    }
  } catch (error) {
    logger.warn('InventoryBatchesPage', 'Error prefetching data, will load client-side:', error)
    // Continue without prefetch - client will handle loading
  }

  // Determine the header title and description based on filters

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-6">
        <BatchesHeader />

        <BatchesFilteredList
          initialFilters={{
            filter: params.filter,
            expiringDays: params.expiringDays,
            status: params.status,
            search: params.search,
            sort: params.sort,
            direction: params.direction,
          }}
        />
      </div>
    </HydrationBoundary>
  )
}
