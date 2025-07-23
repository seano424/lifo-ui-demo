import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreSettings } from '@/lib/queries/store-settings'
import { fetchUserStores } from '@/lib/queries/stores'
import { withStoreAccess } from '@/lib/server/permissions'
import StoreInformation from '@/components/settings/store-information'

export default async function StoreSettingsPage() {
  try {
    const { queryClient } = await createPrefetchedQuery()
    const serverClient = await createServerClient()

    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return (
        <div className="text-center py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please log in to view store settings.</AlertDescription>
          </Alert>
        </div>
      )
    }

    const userStores = await fetchUserStores(user.id, serverClient)

    if (userStores.length === 0) {
      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have access to any stores yet. Contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    const cookieStore = await cookies()
    const lastActiveStoreId = cookieStore.get('activeStoreId')?.value

    let targetStore = userStores.find(us => us.store.store_id === lastActiveStoreId)?.store
    if (!targetStore) {
      targetStore = userStores[0].store
    }

    // Check permissions
    const accessResult = await withStoreAccess(
      user.id,
      targetStore.store_id,
      'canViewSettings',
      serverClient,
    )

    if (!accessResult.hasAccess) {
      const errorMessages = {
        unauthorized: 'Authentication error. Please try logging in again.',
        forbidden:
          'You don&apos;t have permission to view store settings. Contact your store manager or owner.',
        'not-found': 'Store not found or you don&apos;t have access to it.',
      }

      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessages[accessResult.errorType]}</AlertDescription>
          </Alert>
        </div>
      )
    }

    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.stores.detail(targetStore.store_id),
        queryFn: () => fetchStoreSettings(targetStore.store_id, serverClient),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
    } catch (prefetchError) {
      console.error('⚠️ Failed to prefetch store settings:', prefetchError)
    }

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="max-w-5xl mx-auto space-y-6">
          <StoreInformation
            serverPermissions={accessResult.permissions}
            storeId={targetStore.store_id}
          />
        </div>
      </HydrationBoundary>
    )
  } catch (error) {
    console.error('❌ Store settings page error:', error)

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            An error occurred while loading the page. Please try refreshing.
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                {error instanceof Error ? error.message : 'Unknown error'}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}
