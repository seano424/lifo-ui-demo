import { useStoreState } from '@/lib/stores/store-context'
import { useQuery } from '@tanstack/react-query'
import { hasBatchesRPC } from '@/lib/queries/batches-rpc'
import { queryKeys } from '@/lib/queries/query-keys'
import type { SetupStep } from '@/lib/stores/setup-flow-store'

export interface SetupProgress {
  hasStore: boolean
  hasBatches: boolean
  isLoading: boolean
}

/**
 * Hook to derive setup progress from database state
 * This replaces localStorage-based completion tracking with actual data
 */
export function useSetupProgress(): SetupProgress {
  const { activeStore, isLoadingStores } = useStoreState()

  // Check if the active store has any batches
  const { data: hasBatches, isLoading } = useQuery({
    queryKey: activeStore?.store_id
      ? queryKeys.batches.hasBatches(activeStore.store_id)
      : ['hasBatches', 'no-store'],
    queryFn: () => {
      if (!activeStore?.store_id) return false
      return hasBatchesRPC(activeStore.store_id)
    },
    enabled: !!activeStore?.store_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    hasStore: !!activeStore,
    hasBatches: hasBatches ?? false,
    isLoading: isLoading || isLoadingStores,
  }
}

/**
 * Helper to check if a specific step is completed based on database state
 */
export function isStepCompleted(step: SetupStep, progress: SetupProgress): boolean {
  switch (step) {
    case 'create-account':
      // Always completed if they're logged in and viewing this page
      return true
    case 'add-store':
      // Completed when they have a store (either via Square or manual)
      return progress.hasStore
    case 'create-first-batch':
      // Completed when they have at least one batch
      return progress.hasBatches
    default:
      return false
  }
}

/**
 * Calculate overall progress percentage
 */
export function getProgressPercentage(progress: SetupProgress): number {
  const steps: SetupStep[] = ['create-account', 'add-store', 'create-first-batch']

  const completedCount = steps.filter(step => isStepCompleted(step, progress)).length
  return Math.round((completedCount / steps.length) * 100)
}
