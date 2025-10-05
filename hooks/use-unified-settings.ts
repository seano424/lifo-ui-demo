'use client'

import { useCurrentUser } from '@/hooks/use-users'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { useStoreUsers } from '@/hooks/use-store-users'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function useUnifiedSettings() {
  const storeId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  // ✅ SOLUTION: Use React Query hooks to leverage caching
  const {
    data: storeSettings,
    isLoading: loadingSettings,
    error: settingsError,
  } = useStoreSettings(storeId || undefined)
  const { data: storeUsers, isLoading: loadingUsers, error: usersError } = useStoreUsers({}, 20)

  const isLoading = loadingSettings || loadingUsers || !currentUser
  const error = settingsError || usersError

  return {
    data: {
      store: storeSettings,
      team: storeUsers,
      user: currentUser,
    },
    isLoading,
    error,
    store: storeSettings,
    team: storeUsers,
    user: currentUser,
  }
}
