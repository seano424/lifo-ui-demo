// hooks/use-scoring-thresholds.ts
import { useCallback } from 'react'
import { DEFAULT_THRESHOLDS, type ThresholdType } from '@/lib/utils/scoring-thresholds'
import { useStoreSettings, useUpdateStoreAdvancedSettings } from './use-store-settings'

/**
 * Hook for managing scoring thresholds in the dashboard
 * Provides current thresholds and functions to update them
 */
export function useScoringThresholds(storeId?: string) {
  const { data: storeSettings, isLoading, error } = useStoreSettings(storeId)
  const updateSettings = useUpdateStoreAdvancedSettings()

  // Get current thresholds with fallbacks
  const thresholds = {
    critical: storeSettings?.settings?.critical_threshold ?? DEFAULT_THRESHOLDS.critical,
    warning: storeSettings?.settings?.warning_threshold ?? DEFAULT_THRESHOLDS.warning,
  }

  // Update a specific threshold
  const updateThreshold = useCallback(
    async (type: ThresholdType, value: number) => {
      if (value < 0 || value > 1) {
        throw new Error('Threshold must be between 0 and 1')
      }

      const updateField = type === 'critical' ? 'critical_threshold' : 'warning_threshold'

      await updateSettings.mutateAsync({
        [updateField]: value,
      })
    },
    [updateSettings],
  )

  // Update both thresholds at once
  const updateThresholds = useCallback(
    async (newThresholds: { critical?: number; warning?: number }) => {
      const updates: { critical_threshold?: number; warning_threshold?: number } = {}

      if (newThresholds.critical !== undefined) {
        if (newThresholds.critical < 0 || newThresholds.critical > 1) {
          throw new Error('Critical threshold must be between 0 and 1')
        }
        updates.critical_threshold = newThresholds.critical
      }

      if (newThresholds.warning !== undefined) {
        if (newThresholds.warning < 0 || newThresholds.warning > 1) {
          throw new Error('Warning threshold must be between 0 and 1')
        }
        updates.warning_threshold = newThresholds.warning
      }

      if (Object.keys(updates).length === 0) {
        return // Nothing to update
      }

      await updateSettings.mutateAsync(updates)
    },
    [updateSettings],
  )

  // Reset to default thresholds
  const resetToDefaults = useCallback(async () => {
    await updateThresholds({
      critical: DEFAULT_THRESHOLDS.critical,
      warning: DEFAULT_THRESHOLDS.warning,
    })
  }, [updateThresholds])

  return {
    // Current threshold values
    thresholds,

    // Loading and error states
    isLoading,
    error,
    isUpdating: updateSettings.isPending,
    updateError: updateSettings.error,

    // Update functions
    updateThreshold,
    updateThresholds,
    resetToDefaults,

    // Convenience getters
    criticalThreshold: thresholds.critical,
    warningThreshold: thresholds.warning,

    // Helper to check if thresholds are at defaults
    isDefault:
      thresholds.critical === DEFAULT_THRESHOLDS.critical &&
      thresholds.warning === DEFAULT_THRESHOLDS.warning,
  }
}
