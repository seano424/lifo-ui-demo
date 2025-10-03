'use client'

import { useCurrentUser } from '@/hooks/use-users'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { useStoreUsers } from '@/hooks/use-store-users'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function useUnifiedSettings() {
  const storeId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  // ✅ SOLUTION: Use React Query hooks to leverage caching
  const { data: storeSettings, isLoading: loadingSettings } = useStoreSettings(storeId || undefined)
  const { data: storeUsers, isLoading: loadingUsers } = useStoreUsers({}, 100)

  const isLoading = loadingSettings || loadingUsers || !currentUser

  return {
    data: {
      store: storeSettings,
      team: storeUsers,
      user: currentUser,
    },
    isLoading,
    store: storeSettings,
    team: storeUsers,
    user: currentUser,
  }
}
