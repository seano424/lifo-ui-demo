import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { TodosFilteredList } from '@/components/todos/todos-filtered-list'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'

interface TodosPageProps {
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

export default async function TodosPage({ searchParams }: TodosPageProps) {
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

    stores = await fetchUserStores(user.id, serverClient)
  } catch (error) {
    // Silently handle - retry logic already attempted recovery
    // If all retries failed, stores will be empty array
    logger.queryWarn('TodosPage', 'Error prefetching data after retries', error)
    stores = []
  }

  if (stores.length === 0) {
    return <NoStoresError />
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-6 container py-6">
        <DashboardInsetHeader page="todos" />
        <ErrorBoundary>
          <TodosFilteredList
            initialFilters={{
              tab: params.tab,
              urgency: params.urgency?.split(','),
              actionType: params.actionType?.split(','),
              batchStatus: params.batchStatus?.split(','),
              productName: params.productName,
              sort: params.sort,
              direction: params.direction,
            }}
          />
        </ErrorBoundary>
      </div>
    </HydrationBoundary>
  )
}
