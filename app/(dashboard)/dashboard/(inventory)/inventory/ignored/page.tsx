import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { IgnoredBatchesFilteredList } from '@/components/inventory/ignored-batches-filtered-list'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface IgnoredBatchesPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
  }>
}

/**
 * Fetch ignored batches summary for prefetching
 */
async function fetchIgnoredBatchesSummary(
  storeId: string,
  serverClient: Awaited<ReturnType<typeof createServerClient>>,
) {
  const { data, error } = await serverClient
    .schema('inventory')
    .rpc('get_ignored_batches_summary', {
      p_store_id: storeId,
    })

  if (error) {
    logger.queryWarn('fetchIgnoredBatchesSummary', 'RPC error', {
      error: error.message,
      storeId,
    })
    throw error
  }

  return data
}

/**
 * Fetch ignored batches by product for prefetching
 */
async function fetchIgnoredBatchesByProduct(
  storeId: string,
  options: { category_codes?: string[]; limit?: number; offset?: number },
  serverClient: Awaited<ReturnType<typeof createServerClient>>,
) {
  const { data, error } = await serverClient
    .schema('inventory')
    .rpc('get_ignored_batches_by_product', {
      p_store_id: storeId,
      p_category_codes: options.category_codes || null,
      p_limit: options.limit || null,
      p_offset: options.offset || null,
    })

  if (error) {
    logger.queryWarn('fetchIgnoredBatchesByProduct', 'RPC error', {
      error: error.message,
      storeId,
    })
    throw error
  }

  return data
}

export default async function IgnoredBatchesPage({ searchParams }: IgnoredBatchesPageProps) {
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

    // Build options based on search params
    const options = {
      category_codes: params.category ? [params.category] : undefined,
      limit: 20,
      offset: 0,
    }

    // Prefetch ignored batches summary
    await queryClient.prefetchQuery({
      queryKey: queryKeys.batches.ignoredSummary(storeToUse.store_id),
      queryFn: () => fetchIgnoredBatchesSummary(storeToUse.store_id, serverClient),
      staleTime: 2 * 60 * 1000,
    })

    // Prefetch ignored batches by product
    await queryClient.prefetchQuery({
      queryKey: queryKeys.batches.ignoredByProduct(storeToUse.store_id, options),
      queryFn: () => fetchIgnoredBatchesByProduct(storeToUse.store_id, options, serverClient),
      staleTime: 2 * 60 * 1000,
    })
  } catch (error) {
    logger.warn('IgnoredBatchesPage', 'Error prefetching data, will load client-side:', error)
    // Continue without prefetch - client will handle loading
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IgnoredBatchesFilteredList
        initialFilters={{
          category: params.category,
          search: params.search,
        }}
      />
    </HydrationBoundary>
  )
}
