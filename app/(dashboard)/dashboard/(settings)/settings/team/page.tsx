// app/(dashboard)/dashboard/(settings)/settings/team/page.tsx
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { fetchUserStores } from '@/lib/queries/stores'
import { withStoreAccess } from '@/lib/server/permissions'
import { StoreAccessDenied, SettingsError } from '@/components/settings/settings-error-boundary'
import { StoreUsersList } from '@/components/store-users/store-users-list'

export default async function TeamSettingsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  try {
    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser()

    if (authError || !user) {
      return (
        <SettingsError
          errorType="unauthorized"
          title="Login Required"
          message="Please log in to access team management."
          showRefreshButton={false}
          customAction={{
            label: 'Go to Login',
            href: '/login',
          }}
        />
      )
    }

    // Get user's accessible stores to determine active store
    const userStores = await fetchUserStores(user.id, serverClient)

    if (userStores.length === 0) {
      return (
        <SettingsError
          errorType="not-found"
          title="No Store Access"
          message="You don't have access to any stores yet. Contact your organization administrator to get added to a store."
          showRefreshButton={false}
          customAction={{
            label: 'Contact Support',
            href: '/support',
          }}
        />
      )
    }

    // Determine active store from cookies
    const cookieStore = await cookies()
    const lastActiveStoreId = cookieStore.get('activeStoreId')?.value

    let targetStore = userStores.find(us => us.store.store_id === lastActiveStoreId)?.store
    if (!targetStore) {
      targetStore = userStores[0].store
    }

    // 🚀 Check team management permissions using server utility
    const accessResult = await withStoreAccess(
      user.id,
      targetStore.store_id,
      'canManageTeam', // Required permission for team management
      serverClient,
    )

    // Handle different access scenarios
    if (!accessResult.hasAccess) {
      // Determine user's role for better error messaging
      const userRole = userStores.find(us => us.store.store_id === targetStore.store_id)?.role

      if (accessResult.errorType === 'forbidden') {
        return <StoreAccessDenied storeName={targetStore.store_name} userRole={userRole} />
      }

      const errorMessages = {
        unauthorized: 'Authentication error. Please try logging in again.',
        'not-found': "Store not found or you don't have access to it.",
        forbidden: "You don't have permission to manage team members.",
      }

      return (
        <SettingsError
          errorType={accessResult.errorType}
          title="Team Management Access Denied"
          message={errorMessages[accessResult.errorType]}
          customAction={{
            label: 'View Account Settings',
            href: '/dashboard/settings/account',
          }}
        />
      )
    }

    // User has team management access - prefetch team data
    try {
      // Prefetch first page of store users
      await queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.storeUsers.infinite(targetStore.store_id, {}),
        queryFn: () => fetchStoreUsersPage(targetStore.store_id, { page: 0, pageSize: 20 }, {}),
        initialPageParam: 0,
      })

      // Prefetch active users specifically
      await queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.storeUsers.infinite(targetStore.store_id, { is_active: true }),
        queryFn: () =>
          fetchStoreUsersPage(targetStore.store_id, { page: 0, pageSize: 20 }, { is_active: true }),
        initialPageParam: 0,
      })

      // Prefetch users by role for role management
      const roles = ['owner', 'manager', 'employee'] as const
      await Promise.all(
        roles.map(role =>
          queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.storeUsers.infinite(targetStore.store_id, { role_in_store: role }),
            queryFn: () =>
              fetchStoreUsersPage(
                targetStore.store_id,
                { page: 0, pageSize: 10 },
                { role_in_store: role },
              ),
            initialPageParam: 0,
          }),
        ),
      )
    } catch (error) {
      console.error('Failed to prefetch team data:', error)
      // Don't fail the page, just show error in component
    }

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Pass server-computed permissions to client component */}
          <StoreUsersList />
        </div>
      </HydrationBoundary>
    )
  } catch (error) {
    console.error('Unexpected error in team settings page:', error)

    return (
      <SettingsError
        errorType="server-error"
        title="Team Management Unavailable"
        message="There was an error loading team management. Please try again."
        customAction={{
          label: 'Contact Support',
          href: '/support',
        }}
      />
    )
  }
}

// Export metadata for SEO
export const metadata = {
  title: 'Team Management | LIFO',
  description: 'Manage store team members, roles, and permissions.',
}
