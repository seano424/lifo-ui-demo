'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { useStoreState } from '@/lib/stores/store-context'

/**
 * This component handles prefetching store users data when the active store changes.
 * It ensures that when a user switches stores, the user data is preloaded for better UX.
 */
export function StoreUsersPrefetch() {
  const queryClient = useQueryClient()
  const { activeStore } = useStoreState()

  useEffect(() => {
    if (!activeStore?.store_id) return

    const storeId = activeStore.store_id

    // Prefetch only the main store users data when store changes
    const prefetchStoreUsers = async () => {
      try {
        // Check if we already have recent data
        const existingData = queryClient.getQueryData(queryKeys.storeUsers.infinite(storeId, {}))

        if (!existingData) {
          // Only prefetch the main unfiltered query
          // Client-side filtering will handle role/status filters without additional queries
          await queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.storeUsers.infinite(storeId, {}),
            queryFn: ({ pageParam = 0 }) =>
              fetchStoreUsersPage(storeId, { page: pageParam, pageSize: 20 }, {}),
            initialPageParam: 0,
            staleTime: 5 * 60 * 1000, // 5 minutes
          })
        }
      } catch (error) {
        console.error('[StoreUsersPrefetch] Error prefetching store users:', error)
      }
    }

    // Small delay to avoid prefetching during rapid store switching
    const timeoutId = setTimeout(prefetchStoreUsers, 500)

    return () => clearTimeout(timeoutId)
  }, [activeStore?.store_id, queryClient])

  // Also invalidate old store data when switching to keep cache clean
  useEffect(() => {
    if (!activeStore?.store_id) return

    // Clean up queries for other stores (keep cache size manageable)
    const allQueries = queryClient.getQueryCache().getAll()
    const storeUserQueries = allQueries.filter(
      query => query.queryKey[0] === 'storeUsers' && query.queryKey[2] !== activeStore.store_id,
    )

    // Remove old store user data (older than 10 minutes)
    storeUserQueries.forEach(query => {
      const queryAge = Date.now() - (query.state.dataUpdatedAt || 0)
      if (queryAge > 10 * 60 * 1000) {
        // 10 minutes
        queryClient.removeQueries({ queryKey: query.queryKey })
      }
    })
  }, [activeStore?.store_id, queryClient])

  // This component doesn't render anything
  return null
}
