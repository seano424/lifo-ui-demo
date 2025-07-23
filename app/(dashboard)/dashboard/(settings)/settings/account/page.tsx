// app/(dashboard)/dashboard/(settings)/settings/account/page.tsx
import { createClient as createServerClient } from '@/lib/supabase/server'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserById } from '@/lib/queries/users'
import UserAccountInformation from '@/components/account/user-account-information'
import { SettingsError } from '@/components/settings/settings-error-boundary'

export default async function AccountSettingsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  try {
    // Get the current authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await serverClient.auth.getUser()

    if (authError || !authUser) {
      return (
        <SettingsError
          errorType="unauthorized"
          title="Login Required"
          message="Please log in to access your account settings."
          showRefreshButton={false}
          customAction={{
            label: 'Go to Login',
            href: '/login',
          }}
        />
      )
    }

    // Prefetch current user data with enhanced fields
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.users.detail(authUser.id),
        queryFn: () => fetchUserById(authUser.id, serverClient),
      })
    } catch (error) {
      console.error('Failed to prefetch user data:', error)
      // Don't fail the page, just show error in component
    }

    // Also prefetch current auth user for immediate access
    await queryClient.prefetchQuery({
      queryKey: ['currentAuthUser'],
      queryFn: async () => authUser,
    })

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="max-w-5xl mx-auto space-y-6">
          <UserAccountInformation />
        </div>
      </HydrationBoundary>
    )
  } catch (error) {
    console.error('Unexpected error in account settings page:', error)

    return (
      <SettingsError
        errorType="server-error"
        title="Account Settings Unavailable"
        message="There was an error loading your account settings. Please try again."
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
  title: 'Account Settings | LIFO',
  description: 'Manage your personal account information, phone number, and language preferences.',
}
