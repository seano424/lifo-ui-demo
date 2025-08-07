import { redirect } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'

import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchBatchesPage,
  fetchExpiringBatches,
  type BatchFilters,
  type BatchSortField,
} from '@/lib/queries/batches'
import { fetchUserStores, fetchUserPreferences } from '@/lib/queries/stores'

import BatchesHeader from '@/components/batches/batches-header'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'

interface InventoryBatchesPageProps {
  searchParams: Promise<{
    filter?: string
    expiringDays?: string
    status?: string
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
      // User has no stores - redirect to onboarding or show error
      redirect('/onboarding')
    }

    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // Build filters based on search params
    const filters: BatchFilters = { storeId: storeToUse.store_id }

    // Handle expiring filter
    if (params.filter === 'expiring') {
      filters.expiringInDays = parseInt(params.expiringDays || '7')
    }

    // Handle status filter
    if (params.status) {
      filters.status = params.status as 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved'
    }

    // Handle sorting
    if (params.sort) {
      filters.sort = {
        field: params.sort as BatchSortField,
        direction: (params.direction || 'asc') as 'asc' | 'desc',
      }
    }

    // Prefetch the first page of batches with filters
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.batches.infinite(storeToUse.store_id, filters),
      queryFn: ({ pageParam = 0 }) =>
        fetchBatchesPage({ page: pageParam, pageSize: 20 }, filters, serverClient),
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

    console.log(
      '[InventoryBatchesPage] Prefetched data for store:',
      storeToUse.store_name,
      'with filters:',
      filters,
    )
  } catch (error) {
    console.error('[InventoryBatchesPage] Error prefetching data:', error)
    // Continue without prefetch - client will handle loading
  }

  // Determine the header title and description based on filters
  const isExpiringFilter = params.filter === 'expiring'
  const pageTitle = isExpiringFilter ? 'Expiring Items' : 'Inventory Batches'
  const pageDescription = isExpiringFilter
    ? `Items expiring within ${params.expiringDays || '7'} days`
    : "View and manage your store's inventory batches"

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <BatchesHeader title={pageTitle} description={pageDescription} />

        {/* Client-side filtered batch list */}
        <BatchesFilteredList
          initialFilters={{
            filter: params.filter,
            expiringDays: params.expiringDays,
            status: params.status,
            sort: params.sort,
            direction: params.direction,
          }}
        />
      </div>
    </HydrationBoundary>
  )
}
