// app/(dashboard)/dashboard/(settings)/settings/store/page.tsx
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
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Get the current user
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    return (
      <div className="text-center py-12">
        <p>Please log in to view store settings.</p>
      </div>
    )
  }

  // Get user's accessible stores to determine active store
  const userStores = await fetchUserStores(user.id, serverClient)

  if (userStores.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Store Access</h2>
        <p className="text-gray-600">You don&apos;t have access to any stores yet.</p>
      </div>
    )
  }

  // Determine active store
  const cookieStore = await cookies()
  const lastActiveStoreId = cookieStore.get('activeStoreId')?.value

  let targetStore = userStores.find(us => us.store.store_id === lastActiveStoreId)?.store
  if (!targetStore) {
    targetStore = userStores[0].store
  }

  // 🚀 Use the utility to check permissions and handle all error cases
  const accessResult = await withStoreAccess(
    user.id,
    targetStore.store_id,
    'canViewSettings', // Required permission
    serverClient,
  )

  // Handle different access scenarios
  if (!accessResult.hasAccess) {
    const errorMessages = {
      unauthorized: 'Authentication error. Please try logging in again.',
      forbidden:
        "You don't have permission to view store settings. Contact your store manager or owner.",
      'not-found': "Store not found or you don't have access to it.",
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

  // User has access - prefetch store settings data
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.stores.detail(targetStore.store_id),
      queryFn: () => fetchStoreSettings(targetStore.store_id, serverClient),
    })
  } catch (error) {
    console.error('Failed to prefetch store settings:', error)
    // Don't fail the page, just show error in component
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Pass server-computed permissions to client component */}
        <StoreInformation
          serverPermissions={accessResult.permissions}
          storeId={targetStore.store_id}
        />
      </div>
    </HydrationBoundary>
  )
}

// Export the page metadata for better SEO
export const metadata = {
  title: 'Store Settings | LIFO',
  description: 'Manage your store information, contact details, and business settings.',
}
