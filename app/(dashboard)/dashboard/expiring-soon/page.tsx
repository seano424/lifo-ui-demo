import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { TodosExpiryList } from '@/components/todos/todos-expiry-list'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

interface ExpiringSoonPageProps {
  searchParams: Promise<{
    tab?: string
    urgency?: string
    sort?: string
    direction?: string
    actionType?: string
    batchStatus?: string
    productName?: string
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

  let stores: Awaited<ReturnType<typeof fetchUserStores>> = []

  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['stores', 'userStores', user.id],
        queryFn: () => fetchUserStores(user.id, serverClient),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['userPreferences', user.id],
        queryFn: () => fetchUserPreferences(serverClient),
        staleTime: 5 * 60 * 1000,
      }),
    ])

    // Read from cache after prefetch, fallback to fetching if not in cache
    stores =
      queryClient.getQueryData(['stores', 'userStores', user.id]) ||
      (await fetchUserStores(user.id, serverClient))
  } catch (error) {
    // Handle errors from prefetch or fallback fetch
    // This catches network failures, auth issues, or database errors
    logger.queryWarn('ExpiringSoonPage', 'Error fetching user stores', error)
    stores = []
  }

  if (stores.length === 0) {
    return <NoStoresError />
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="bg-gray-50">
        <div className="flex flex-col gap-6 container py-6">
          <DashboardInsetHeader page="expiring-soon" />
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex flex-col gap-4">
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                  <div className="h-96 bg-gray-200 rounded animate-pulse" />
                </div>
              }
            >
              <TodosExpiryList
                initialFilters={{
                  tab: params.tab,
                  urgency: params.urgency?.split(','),
                  actionType: params.actionType?.split(','),
                  productName: params.productName,
                  sort: params.sort,
                  direction: params.direction,
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </HydrationBoundary>
  )
}
