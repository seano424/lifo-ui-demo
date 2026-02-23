import { useStoreState, useActiveStoreId } from '@/lib/stores/store-context'
import { useCurrentUser } from '@/hooks/use-users'
import { useSquareStatus } from '@/hooks/use-square-integration'
import { useBatchTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'

export interface SetupProgress {
  hasSquareConnection: boolean
  hasAutomation: boolean
  isLoading: boolean
}

/**
 * Checks setup progress across both onboarding steps.
 *
 * Uses useSquareStatus (backend API) instead of querying
 * integrations.square_connections directly, because the client-side
 * anon key lacks RLS read access to that table.
 *
 * hasAutomation reflects whether batch tracking setup_completed is true
 * for the active store. Only checked once Square is connected.
 */
export function useSetupProgress(): SetupProgress {
  const { isLoading: isLoadingUser } = useCurrentUser()
  const { isLoadingStores } = useStoreState()
  const { data: squareStatus, isLoading: isLoadingSquare } = useSquareStatus()
  const storeId = useActiveStoreId()

  const hasSquareConnection = squareStatus?.is_connected ?? false

  const { data: batchSetup, isLoading: isLoadingBatch } = useBatchTrackingSetup(storeId ?? '')

  return {
    hasSquareConnection,
    hasAutomation: batchSetup?.config?.setup_completed ?? false,
    isLoading:
      isLoadingUser ||
      isLoadingStores ||
      isLoadingSquare ||
      (hasSquareConnection && !!storeId && isLoadingBatch),
  }
}
