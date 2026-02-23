'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCategoriesWithTrackingSettings,
  useSaveBatchTrackingSetup,
} from '@/lib/queries/batch-tracking-onboarding'
import { getDefaultShelfLife } from '@/lib/batch-tracking/shelf-life-lookup'
import { StepWhatToTrack } from './batch-tracking/step-what-to-track'
import { StepHowToTrack } from './batch-tracking/step-how-to-track'
import { StepIntro } from './batch-tracking/step-intro'
import { StepReview } from './batch-tracking/step-review'
import { ActivatingState } from './batch-tracking/activating-state'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
// import { StoreIndicator } from '../store-indicator'

// =============================================================================
// DEMO MODE - Toggle this to test the animation without database changes
// =============================================================================
const DEMO_MODE = false // Set to true to preview animation without saving

// =============================================================================
// TYPES
// =============================================================================

export type WizardSubStep = 'intro' | 'what-to-track' | 'how-to-track' | 'review' | 'activating'

export interface ProcessedCategory {
  id: string
  name: string
  productCount: number
  enabled: boolean
  mode: 'auto' | 'manual' | 'off'
  days: number | null
  matched: boolean
  matchedKeyword: string | null
}

export interface ProductOverride {
  productId: string
  mode: 'auto' | 'manual'
  days: number | null
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Batch Tracking Setup Step
 *
 * Multi-sub-step wizard for configuring batch tracking:
 * - Step 1: Combined What & How to Track (enable/disable categories + configure shelf life inline)
 * - Activating: Progress animation during batch creation
 * - Success: Completion screen with CTA to dashboard
 *
 * Note: Square connection confirmation (previously Step 0) is now shown
 * inline in the Add Store Step for a smoother user experience.
 */
export function BatchTrackingStep() {
  const context = 'BatchTrackingStep'
  const router = useRouter()
  // Get active store from Zustand store context
  const storeId = useActiveStoreId()

  // Setup flow navigation (for going back to Add Store step)
  const { setBatchTrackingSubStep } = useSetupFlowStore()

  // Internal sub-step navigation
  const [subStep, setSubStep] = useState<WizardSubStep>('intro')
  const [showSuccess, setShowSuccess] = useState(false)

  // Sync sub-step into store so the sidebar can reflect it
  useEffect(() => {
    setBatchTrackingSubStep(subStep)
    return () => setBatchTrackingSubStep(null)
  }, [subStep, setBatchTrackingSubStep])

  // Fetch data from backend
  const { data: categories } = useCategoriesWithTrackingSettings(storeId || '')
  const saveMutation = useSaveBatchTrackingSetup()

  // Process categories with shelf life lookup
  const processedCategories = useMemo(() => {
    if (!categories) return []

    return categories.map(cat => {
      const shelfLife = getDefaultShelfLife(cat.display_name_en || cat.display_name_fr || 'Unknown')

      return {
        id: cat.category_id,
        name: cat.display_name_en || cat.display_name_fr || 'Unknown Category',
        productCount: cat.product_count,
        enabled: true, // All categories default to ON
        mode: (shelfLife.days ? 'auto' : 'manual') as 'auto' | 'manual',
        days: shelfLife.days,
        matched: shelfLife.matched,
        matchedKeyword: shelfLife.matchedKeyword,
      }
    })
  }, [categories])

  // Local state for user selections
  const [enabledCategories, setEnabledCategories] = useState<ProcessedCategory[]>([])
  const [categoryModes, setCategoryModes] = useState<Record<string, 'auto' | 'manual'>>({})
  const [shelfLifeDays, setShelfLifeDays] = useState<Record<string, number | null>>({})
  const [productOverrides, setProductOverrides] = useState<Record<string, ProductOverride>>({})
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  // Reset state when store changes
  useEffect(() => {
    logger.log(context, 'Store changed, resetting batch tracking state', { storeId })

    // Reset all state when store changes
    setEnabledCategories([])
    setCategoryModes({})
    setShelfLifeDays({})
    setProductOverrides({})
    setHasInitialized(false)

    // Reset to intro
    setSubStep('intro')
    setBatchTrackingSubStep('intro')
  }, [storeId, setBatchTrackingSubStep])

  // Initialize state when categories load (only once)
  useEffect(() => {
    if (processedCategories.length > 0 && !hasInitialized) {
      // Set initial enabled categories (all food categories)
      setEnabledCategories(processedCategories.filter(c => c.enabled))

      // Set initial modes
      const modes: Record<string, 'auto' | 'manual'> = {}
      const days: Record<string, number | null> = {}
      for (const cat of processedCategories) {
        if (cat.mode === 'auto' || cat.mode === 'manual') {
          modes[cat.id] = cat.mode
          days[cat.id] = cat.days
        }
      }
      setCategoryModes(modes)
      setShelfLifeDays(days)
      setHasInitialized(true)
    }
  }, [processedCategories, hasInitialized])

  // Clean up stale categories when processedCategories changes
  useEffect(() => {
    if (processedCategories.length > 0 && enabledCategories.length > 0) {
      const validCategoryIds = new Set(processedCategories.map(c => c.id))
      const staleCategories = enabledCategories.filter(c => !validCategoryIds.has(c.id))

      if (staleCategories.length > 0) {
        logger.warn(context, 'Removing stale categories from enabled list', {
          staleCount: staleCategories.length,
          staleIds: staleCategories.map(c => c.id),
        })
        setEnabledCategories(prev => prev.filter(c => validCategoryIds.has(c.id)))
      }
    }
  }, [processedCategories, enabledCategories])

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleToggleCategory = (categoryId: string, enabled: boolean) => {
    const category = processedCategories.find(c => c.id === categoryId)
    if (!category) {
      logger.warn(context, 'Attempted to toggle non-existent category', { categoryId })
      return
    }

    if (enabled) {
      // Only add if not already in the list (prevent duplicates)
      setEnabledCategories(prev => {
        // Remove any stale categories that don't exist in processedCategories
        const validCategories = prev.filter(c => processedCategories.some(pc => pc.id === c.id))

        if (validCategories.some(c => c.id === categoryId)) return validCategories
        return [...validCategories, category]
      })
    } else {
      setEnabledCategories(prev => prev.filter(c => c.id !== categoryId))
    }
  }

  const handleUpdateCategoryMode = (categoryId: string, mode: 'auto' | 'manual') => {
    setCategoryModes(prev => ({ ...prev, [categoryId]: mode }))
  }

  const handleUpdateShelfLife = (categoryId: string, days: number | null) => {
    setShelfLifeDays(prev => ({ ...prev, [categoryId]: days }))
  }

  const handleUpdateProductOverride = (productId: string, override: ProductOverride) => {
    setProductOverrides(prev => ({ ...prev, [productId]: override }))
  }

  const handleClearProductOverride = (productId: string) => {
    setProductOverrides(prev => {
      const updated = { ...prev }
      delete updated[productId]
      return updated
    })
  }

  const handleResetToDefaults = () => {
    logger.log(context, 'Resetting all categories to default values')

    // Reset modes and shelf life days to original defaults from processedCategories
    const modes: Record<string, 'auto' | 'manual'> = {}
    const days: Record<string, number | null> = {}

    for (const cat of enabledCategories) {
      const original = processedCategories.find(c => c.id === cat.id)
      if (original) {
        modes[cat.id] =
          original.mode === 'auto' || original.mode === 'manual' ? original.mode : 'auto'
        days[cat.id] = original.days
      }
    }

    setCategoryModes(modes)
    setShelfLifeDays(days)

    // Clear all product overrides
    setProductOverrides({})
  }

  const handleSkip = async () => {
    if (!storeId) {
      logger.error(context, 'Cannot skip batch tracking setup without storeId')
      return
    }

    setIsSkipping(true)

    try {
      logger.log(context, 'Skipping batch tracking setup — saving all categories as manual', {
        storeId,
        categoryCount: processedCategories.length,
      })

      // Save all categories as manual defaults with their typical shelf life days
      const categorySettings = processedCategories.map(cat => ({
        category_id: cat.id,
        is_tracked: true,
        auto_create_batches: false,
        default_shelf_life_days: cat.days,
      }))

      await saveMutation.mutateAsync({
        storeId,
        config: {
          enabled: false,
          setup_completed: false,
          product_selection_mode: 'by_category',
          selected_category_ids: processedCategories.map(c => c.id),
          selected_product_ids: [],
        },
        categorySettings,
        productOverrides: [],
      })

      logger.log(context, 'Skip save complete — navigating to dashboard', { storeId })
      router.replace('/dashboard')
    } catch (error) {
      logger.error(context, 'Failed to skip batch tracking setup', { error, storeId })
      setIsSkipping(false)
    }
  }

  const handleActivate = () => {
    // Advances to the review screen — actual save happens in handleConfirm
    setSubStep('review')
  }

  const handleConfirm = async () => {
    if (!storeId && !DEMO_MODE) {
      logger.error(context, 'Cannot confirm batch tracking without storeId')
      return
    }

    setSubStep('activating')

    try {
      if (DEMO_MODE) {
        // ============================================================
        // DEMO MODE: Preview animation without database changes
        // ============================================================
        logger.log(context, '🎨 DEMO MODE: Simulating batch tracking activation', {
          enabledCount: enabledCategories.length,
          overridesCount: Object.keys(productOverrides).length,
        })

        // Simulate the smart minimum duration (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000))

        logger.log(context, '🎨 DEMO MODE: Simulated activation complete')

        // Show success animation for 1.5 seconds
        setShowSuccess(true)
        await new Promise(resolve => setTimeout(resolve, 1500))

        logger.log(context, '🎨 DEMO MODE: Animation complete - staying on this screen')
        // In demo mode, we stay here. In real mode, setup flow auto-exits to dashboard.
        return
      }

      // ============================================================
      // REAL MODE: Actual database save
      // ============================================================
      logger.log(context, 'Activating batch tracking', {
        storeId,
        enabledCount: enabledCategories.length,
        overridesCount: Object.keys(productOverrides).length,
      })

      // Build category settings array
      const categorySettings = enabledCategories.map(cat => ({
        category_id: cat.id,
        is_tracked: true,
        auto_create_batches: categoryModes[cat.id] === 'auto',
        default_shelf_life_days: categoryModes[cat.id] === 'auto' ? shelfLifeDays[cat.id] : null,
      }))

      // Build product overrides array
      const overrides = Object.entries(productOverrides).map(([productId, override]) => ({
        product_id: productId,
        shelf_life_override_days: override.mode === 'auto' ? override.days : null,
        auto_create_batches: override.mode === 'auto',
      }))

      // Save configuration (includes smart minimum 2s duration)
      await saveMutation.mutateAsync({
        storeId: storeId!,
        config: {
          enabled: true,
          setup_completed: true,
          setup_completed_at: new Date().toISOString(),
          product_selection_mode: 'by_category',
          selected_category_ids: enabledCategories.map(c => c.id),
          selected_product_ids: [],
        },
        categorySettings,
        productOverrides: overrides,
      })

      logger.log(context, 'Batch tracking activated successfully', { storeId })

      // Show success animation for 1.5 seconds
      setShowSuccess(true)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Setup flow will auto-exit to dashboard when it detects hasBatchTrackingSetup: true
      // No manual navigation needed - React Query invalidation handles it
    } catch (error) {
      logger.error(context, 'Failed to activate batch tracking', { error, storeId })
      // Go back to review so user can try again
      setSubStep('review')
      setShowSuccess(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Store Indicator - shown on desktop only */}
      {/* <StoreIndicator className="hidden lg:block" /> */}

      {subStep === 'intro' && (
        <StepIntro
          categories={processedCategories}
          isSkipping={isSkipping}
          onSetup={() => setSubStep('what-to-track')}
          onSkip={handleSkip}
        />
      )}

      {subStep === 'what-to-track' && (
        <StepWhatToTrack
          categories={processedCategories}
          enabledCategories={enabledCategories}
          onToggleCategory={handleToggleCategory}
          onNext={() => setSubStep('how-to-track')}
          onBack={() => setSubStep('intro')}
        />
      )}

      {subStep === 'how-to-track' && (
        <StepHowToTrack
          categories={enabledCategories}
          categoryModes={categoryModes}
          shelfLifeDays={shelfLifeDays}
          productOverrides={productOverrides}
          storeId={storeId}
          onUpdateMode={handleUpdateCategoryMode}
          onUpdateShelfLife={handleUpdateShelfLife}
          onUpdateProductOverride={handleUpdateProductOverride}
          onClearProductOverride={handleClearProductOverride}
          onResetToDefaults={handleResetToDefaults}
          onActivate={handleActivate}
          onBack={() => setSubStep('what-to-track')}
        />
      )}

      {subStep === 'review' && (
        <StepReview
          enabledCategories={enabledCategories}
          categoryModes={categoryModes}
          shelfLifeDays={shelfLifeDays}
          isSaving={saveMutation.isPending}
          onBack={() => setSubStep('how-to-track')}
          onConfirm={handleConfirm}
        />
      )}

      {subStep === 'activating' && <ActivatingState showSuccess={showSuccess} />}
    </div>
  )
}
