import { dehydrate } from '@tanstack/react-query'
import { createQueryClient } from './client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { fetchCurrentUser } from '@/lib/queries/users'

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
