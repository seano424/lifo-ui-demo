'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from './toggle'
import { ShelfLifeChip } from './shelf-life-chip'
import { useTranslations } from 'next-intl'
import { Package, Zap, Type, Eye, ChevronDown, RotateCcw } from 'lucide-react'
import type { ProcessedCategory, ProductOverride } from '../batch-tracking-step'

interface StepCombinedTrackingProps {
  categories: ProcessedCategory[]
  enabledCategories: ProcessedCategory[]
  categoryModes: Record<string, 'auto' | 'manual'>
  shelfLifeDays: Record<string, number | null>
  // Kept in interface for future product overrides feature
  productOverrides?: Record<string, ProductOverride>
  storeId?: string | null
  onToggleCategory: (categoryId: string, enabled: boolean) => void
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
  // Kept in interface for future product overrides feature
  onUpdateProductOverride?: (productId: string, override: ProductOverride) => void
  onClearProductOverride?: (productId: string) => void
  onResetToDefaults: () => void
  onActivate: () => void
  onBack: () => void
}

/**
 * Combined Step: What & How to Track
 *
 * Single-step interface that combines category selection with configuration.
 * - Toggle categories on/off
 * - When enabled, configure shelf life and tracking mode inline
 * - Preview dashboard shows impact of selections
 * - Summary stats update in real-time
 */
export function StepCombinedTracking({
  categories,
  enabledCategories,
  categoryModes,
  shelfLifeDays,
  onToggleCategory,
  onUpdateMode,
  onUpdateShelfLife,
  onResetToDefaults,
  onActivate,
  onBack,
}: StepCombinedTrackingProps) {
  const t = useTranslations('setupFlow.batchTracking.steps')
  const [previewOpen, setPreviewOpen] = useState(true) // Auto-expand preview

  const enabledIds = new Set(enabledCategories.map(c => c.id))
  const trackedProducts = enabledCategories.reduce((sum, cat) => sum + cat.productCount, 0)
  const autoCount = enabledCategories.filter(c => categoryModes[c.id] === 'auto').length
  const manualCount = enabledCategories.filter(c => categoryModes[c.id] === 'manual').length

  const canProceed = enabledCategories.length > 0
  const allSelected = enabledIds.size === categories.length && categories.length > 0

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      categories.forEach(cat => onToggleCategory(cat.id, true))
    }
  }

  // Generate preview batches based on actual enabled categories
  const previewBatches = enabledCategories
    .filter(c => categoryModes[c.id] === 'auto')
    .slice(0, 4)
    .map(c => ({
      product: `${c.name} Sample Product`,
      category: c.name,
      daysLeft: shelfLifeDays[c.id] || 14,
      qty: Math.floor(Math.random() * 30) + 8,
      confidence: c.matched ? 'high' : 'low',
    }))

  // Add a manual example if any categories are manual
  if (manualCount > 0) {
    const manualCategory = enabledCategories.find(c => categoryModes[c.id] === 'manual')
    if (manualCategory) {
      previewBatches.push({
        product: `${manualCategory.name} Sample Product`,
        category: manualCategory.name,
        daysLeft: 14,
        qty: 15,
        confidence: 'manual',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 mb-80">
      {/* Header */}
      <div>
        <Typography variant="h3" className="mb-2">
          What do you want to track?
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          Choose categories to track and set default shelf life. When deliveries arrive, we'll
          calculate expiry dates automatically. Choose "Manual entry" for categories where you'd
          rather enter dates yourself.
        </Typography>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <Typography variant="small" className="text-muted-foreground">
                {t('whatToTrack.noCategories')}
              </Typography>
            </div>
          ) : (
            <>
              {/* Select All Toggle */}
              <div className="flex items-center justify-between py-2 border-b pb-3">
                <Typography
                  variant="p"
                  className={`font-medium transition-colors ${
                    !allSelected ? 'text-muted-foreground' : ''
                  }`}
                >
                  {t('whatToTrack.selectAll')}
                </Typography>
                <Toggle checked={allSelected} onCheckedChange={handleToggleAll} />
              </div>

              {/* Category List with Inline Configuration */}
              {categories.map(category => {
                const enabled = enabledIds.has(category.id)
                const mode = categoryModes[category.id] || 'auto'
                const days = shelfLifeDays[category.id]

                return (
                  <CategoryRowWithConfig
                    key={category.id}
                    category={category}
                    enabled={enabled}
                    mode={mode}
                    days={days}
                    onToggle={onToggleCategory}
                    onUpdateMode={onUpdateMode}
                    onUpdateShelfLife={onUpdateShelfLife}
                  />
                )
              })}
            </>
          )}
        </Card>

        {/* Legend */}
        {enabledCategories.length > 0 && (
          <Typography
            variant="small"
            className="flex items-center gap-4 py-4 border-t border-muted mt-2"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> = auto-calculate from delivery date
            </span>
            <span className="flex items-center gap-1.5">
              <Type className="w-3 h-3" /> = you'll enter dates per delivery
            </span>
          </Typography>
        )}
      </div>

      {/* Preview Dashboard - Auto-expanded */}
      {enabledCategories.length > 0 && (
        <Card className="overflow-hidden p-4 border border-muted rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5" />
              <Typography variant="p">Preview your dashboard</Typography>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${previewOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {previewOpen && previewBatches.length > 0 && (
            <div className="py-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider">
                      <th className="py-2">Product</th>
                      <th className="py-2">Est. Expiry</th>
                      <th className="py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {previewBatches.map(batch => (
                      <tr key={`${batch.product}-${batch.category}`}>
                        <td className="py-2.5 flex flex-col gap-1">
                          <Typography variant="small" color="muted">
                            {batch.product}
                          </Typography>
                          <Typography variant="extraSmall" color="muted">
                            {batch.category}
                          </Typography>
                        </td>
                        <td className="py-2.5">
                          {batch.confidence === 'manual' ? (
                            <Badge size="sm">
                              <Type className="w-3 h-3" /> Set on delivery
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              variant={batch.daysLeft <= 3 ? 'destructive' : 'success'}
                            >
                              {batch.daysLeft}d from delivery
                              {batch.confidence !== 'high' && '~'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {batch.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-2 pt-4 border-t border-secondary-100">
                <span className="text-xs">
                  Sample of {trackedProducts} tracked products · Tilde (~) = estimated from default
                  shelf life
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Info Box */}
      {enabledCategories.length > 0 && (
        <div className="flex items-start gap-3 p-4 border border-muted rounded-lg shadow-sm">
          <Typography variant="small">
            These are starting defaults. Your team can adjust any date when processing a delivery.
            You can change all of this later in Settings.
          </Typography>
        </div>
      )}

      {/* Summary */}
      {enabledCategories.length > 0 && (
        <Card className="p-4 border border-muted rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="p">{trackedProducts} products ready</Typography>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Typography variant="small">Auto-dated categories:</Typography>
              <Typography variant="small">{autoCount}</Typography>
            </div>
            <div className="flex items-center gap-2">
              <Typography variant="small">Manual categories:</Typography>
              <Typography variant="small">{manualCount}</Typography>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          {enabledCategories.length > 0 && (
            <Button variant="outline" onClick={onResetToDefaults}>
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Reset
            </Button>
          )}
          <Button onClick={onActivate} disabled={!canProceed}>
            <Zap className="w-3.5 h-3.5 mr-2" />
            Activate
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// CATEGORY ROW WITH INLINE CONFIGURATION
// =============================================================================

interface CategoryRowWithConfigProps {
  category: ProcessedCategory
  enabled: boolean
  mode: 'auto' | 'manual'
  days: number | null
  onToggle: (categoryId: string, enabled: boolean) => void
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
}

function CategoryRowWithConfig({
  category,
  enabled,
  mode,
  days,
  onToggle,
  onUpdateMode,
  onUpdateShelfLife,
}: CategoryRowWithConfigProps) {
  const shouldMute = !enabled

  return (
    <div className="flex items-center justify-between py-2 gap-4">
      {/* Left: Category Info + Toggle */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Toggle
          checked={enabled}
          onCheckedChange={(checked: boolean) => onToggle(category.id, checked)}
        />
        <div className="flex-1 min-w-0">
          <Typography
            variant="p"
            className={`font-medium transition-colors truncate ${shouldMute ? 'text-muted-foreground' : ''}`}
          >
            {category.name}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
          </Typography>
        </div>
      </div>

      {/* Right: Configuration (only shown when enabled) */}
      {enabled && (
        <div className="flex items-center gap-2 shrink-0">
          <ShelfLifeChip
            mode={mode}
            days={days}
            onModeChange={newMode => onUpdateMode(category.id, newMode)}
            onDaysChange={newDays => onUpdateShelfLife(category.id, newDays)}
          />
          {/* Mode toggle button */}
          <button
            type="button"
            onClick={() => {
              const newMode = mode === 'auto' ? 'manual' : 'auto'
              onUpdateMode(category.id, newMode)
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={mode === 'auto' ? 'Switch to manual entry' : 'Switch to automatic'}
          >
            {mode === 'auto' ? <Zap className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
