'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  useCategoriesWithTrackingSettings,
  useSaveBatchTrackingSetup,
} from '@/lib/queries/batch-tracking-onboarding'
import { getDefaultShelfLife } from '@/lib/batch-tracking/shelf-life-lookup'
import { StepSquareConnected } from './batch-tracking/step-square-connected'
import { StepWhatToTrack } from './batch-tracking/step-what-to-track'
import { StepHowToTrack } from './batch-tracking/step-how-to-track'
import { ActivatingState } from './batch-tracking/activating-state'
import { StepSuccess } from './batch-tracking/step-success'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'

// =============================================================================
// TYPES
// =============================================================================

export type WizardSubStep = 0 | 1 | 2 | 'activating' | 'success'

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
 * - Step 0: Square Connected (catalog sync confirmation)
 * - Step 1: What to Track (enable/disable categories)
 * - Step 2: How to Track (shelf life + auto/manual mode)
 * - Activating: Progress animation during batch creation
 * - Success: Completion screen with CTA to dashboard
 */
export function BatchTrackingStep() {
  const context = 'BatchTrackingStep'

  // Get active store ID from Zustand store context
  const storeId = useActiveStoreId()

  // Internal sub-step navigation
  const [subStep, setSubStep] = useState<WizardSubStep>(0)

  // Fetch data from backend
  const { data: categories, isLoading: isSyncing } = useCategoriesWithTrackingSettings(
    storeId || '',
  )
  const saveMutation = useSaveBatchTrackingSetup()

  // Process categories with shelf life lookup
  const processedCategories = useMemo(() => {
    if (!categories) return []

    return categories.map(cat => {
      const shelfLife = getDefaultShelfLife(
        cat.display_name_en || cat.display_name_fr || cat.display_name_nl || 'Unknown',
      )

      return {
        id: cat.category_id,
        name:
          cat.display_name_en || cat.display_name_fr || cat.display_name_nl || 'Unknown Category',
        productCount: cat.product_count,
        enabled: true, // All categories default to ON
        mode: shelfLife.days ? 'auto' : 'manual', // Auto if we have shelf life, otherwise manual
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

  // Initialize state when categories load
  useEffect(() => {
    if (processedCategories.length > 0 && enabledCategories.length === 0) {
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
    }
  }, [processedCategories, enabledCategories.length])

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleToggleCategory = (categoryId: string, enabled: boolean) => {
    const category = processedCategories.find(c => c.id === categoryId)
    if (!category) return

    if (enabled) {
      setEnabledCategories(prev => [...prev, category])
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

  const handleActivate = async () => {
    if (!storeId) {
      logger.error(context, 'Cannot activate batch tracking without storeId')
      return
    }

    setSubStep('activating')

    try {
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

      // Save configuration
      await saveMutation.mutateAsync({
        storeId,
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

      // Move to success screen
      setSubStep('success')
    } catch (error) {
      logger.error(context, 'Failed to activate batch tracking', { error, storeId })
      // TODO: Show error toast
      // For now, go back to step 2
      setSubStep(2)
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="flex flex-col gap-6">
      {subStep === 0 && (
        <StepSquareConnected
          isSyncing={isSyncing}
          categoryCount={processedCategories.length}
          productCount={processedCategories.reduce((sum, cat) => sum + cat.productCount, 0)}
          storeName="Your Store" // TODO: Get from store data
          onNext={() => setSubStep(1)}
        />
      )}

      {subStep === 1 && (
        <StepWhatToTrack
          categories={processedCategories}
          enabledCategories={enabledCategories}
          onToggleCategory={handleToggleCategory}
          onNext={() => setSubStep(2)}
          onBack={() => setSubStep(0)}
        />
      )}

      {subStep === 2 && (
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
          onActivate={handleActivate}
          onBack={() => setSubStep(1)}
        />
      )}

      {subStep === 'activating' && <ActivatingState />}

      {subStep === 'success' && (
        <StepSuccess
          autoCategories={enabledCategories.filter(c => categoryModes[c.id] === 'auto').length}
          manualCategories={enabledCategories.filter(c => categoryModes[c.id] === 'manual').length}
          productOverrides={Object.keys(productOverrides).length}
        />
      )}
    </div>
  )
}
