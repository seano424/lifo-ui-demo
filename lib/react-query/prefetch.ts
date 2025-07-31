import { dehydrate } from '@tanstack/react-query'
import { createQueryClient } from './client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { fetchCurrentUser } from '@/lib/queries/users'
import { fetchUserStores } from '@/lib/queries/stores'
import { queryKeys } from '@/lib/queries/query-keys'

export async function createPrefetchedQuery() {
  const queryClient = createQueryClient()
  return { queryClient, dehydratedState: dehydrate(queryClient) }
}

export async function prefetchCurrentUser() {
  const queryClient = createQueryClient()
  const supabase = await createServerClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: ['currentUser'],
      queryFn: () => fetchCurrentUser(supabase),
      staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    })

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
    }
  } catch (error) {
    console.error('Failed to prefetch current user:', error)
    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
    }
  }
}

export async function prefetchDashboardData() {
  const queryClient = createQueryClient()
  const supabase = await createServerClient()

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Prefetch current user data
    await queryClient.prefetchQuery({
      queryKey: ['currentUser'],
      queryFn: () => fetchCurrentUser(supabase),
      staleTime: 5 * 60 * 1000,
    })

    // Prefetch auth user data
    await queryClient.prefetchQuery({
      queryKey: ['currentAuthUser'],
      queryFn: async () => user,
      staleTime: 5 * 60 * 1000,
    })

    // Fetch and prefetch user stores
    const userStores = await fetchUserStores(user.id, supabase)

    await queryClient.prefetchQuery({
      queryKey: queryKeys.stores.userStores(user.id),
      queryFn: () => userStores,
      staleTime: 2 * 60 * 1000, // 2 minutes - stores don't change often
    })

    // Get active store from cookies and prefetch it
    const cookieStore = await cookies()
    const lastActiveStoreId = cookieStore.get('activeStoreId')?.value

    let targetStore = userStores.find(us => us.store.store_id === lastActiveStoreId)?.store
    if (!targetStore && userStores.length > 0) {
      targetStore = userStores[0].store
    }

    if (targetStore) {
      await queryClient.prefetchQuery({
        queryKey: ['activeStore'],
        queryFn: async () => targetStore,
        staleTime: 2 * 60 * 1000,
      })
    }

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores,
      activeStore: targetStore,
    }
  } catch (error) {
    console.error('Failed to prefetch dashboard data:', error)

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      error,
    }
  }
}
