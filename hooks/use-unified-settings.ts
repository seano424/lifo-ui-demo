'use client'

import { useQuery } from '@tanstack/react-query'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useCurrentUser } from '@/hooks/use-users'
import { fetchStoreSettings } from '@/lib/queries/store-settings'
import { fetchStoreUsers } from '@/lib/queries/store-users'

export function useUnifiedSettings() {
  const storeId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['unified-settings', storeId, currentUser?.id],
    queryFn: async () => {
      if (!storeId) {
        throw new Error('No store ID available')
      }

      // Fetch all settings data in parallel for optimal performance
      const [storeSettings, storeUsers] = await Promise.all([
        fetchStoreSettings(storeId),
        fetchStoreUsers(storeId),
      ])

      return {
        store: storeSettings,
        team: storeUsers,
        user: currentUser,
      }
    },
    enabled: !!storeId && !!currentUser,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}
