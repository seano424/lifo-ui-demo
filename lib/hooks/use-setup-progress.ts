import { useStoreState } from '@/lib/stores/store-context'
import { useBatchTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import type { SetupStep } from '@/lib/stores/setup-flow-store'

export interface SetupProgress {
  hasStore: boolean
  hasBatchTrackingSetup: boolean
  isLoading: boolean
}

/**
 * Hook to derive setup progress from database state
 * This replaces localStorage-based completion tracking with actual data
 */
export function useSetupProgress(): SetupProgress {
  const { activeStore, isLoadingStores } = useStoreState()

  // Check if batch tracking setup is completed
  const { data: batchTrackingSetup, isLoading } = useBatchTrackingSetup(activeStore?.store_id || '')

  return {
    hasStore: !!activeStore,
    hasBatchTrackingSetup: batchTrackingSetup?.setup_completed ?? false,
    isLoading: isLoading || isLoadingStores,
  }
}

/**
 * Helper to check if a specific step is completed based on database state
 */
export function isStepCompleted(step: SetupStep, progress: SetupProgress): boolean {
  switch (step) {
    case 'add-store':
      // Completed when they have a store (either via Square or manual)
      return progress.hasStore
    case 'batch-tracking-setup':
      // Completed when batch tracking setup is finished
      return progress.hasBatchTrackingSetup
    default:
      return false
  }
}

/**
 * Calculate overall progress percentage
 */
export function getProgressPercentage(progress: SetupProgress): number {
  const steps: SetupStep[] = ['add-store', 'batch-tracking-setup']

  const completedCount = steps.filter(step => isStepCompleted(step, progress)).length
  return Math.round((completedCount / steps.length) * 100)
}
