import { useStoreState } from '@/lib/stores/store-context'
import { useCurrentUser } from '@/hooks/use-users'
import { useSquareStatus } from '@/hooks/use-square-integration'

export interface SetupProgress {
  hasSquareConnection: boolean
  isLoading: boolean
}

/**
 * Checks if the user has an active Square connection.
 *
 * Uses useSquareStatus (backend API) instead of querying
 * integrations.square_connections directly, because the client-side
 * anon key lacks RLS read access to that table.
 *
 * The setup modal shows when hasSquareConnection is false.
 */
export function useSetupProgress(): SetupProgress {
  const { isLoading: isLoadingUser } = useCurrentUser()
  const { isLoadingStores } = useStoreState()
  const { data: squareStatus, isLoading: isLoadingSquare } = useSquareStatus()

  return {
    hasSquareConnection: squareStatus?.is_connected ?? false,
    isLoading: isLoadingUser || isLoadingStores || isLoadingSquare,
  }
}
