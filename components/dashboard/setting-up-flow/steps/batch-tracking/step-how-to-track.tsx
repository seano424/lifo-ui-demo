'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ShelfLifeChip } from './shelf-life-chip'
// import { CategoryProductExpand } from './category-product-expand' // Hidden for now
import { useTranslations } from 'next-intl'
import { Zap, Type, Eye, ChevronDown, RotateCcw } from 'lucide-react'
import type { ProcessedCategory, ProductOverride } from '../batch-tracking-step'
import { Badge } from '@/components/ui/badge'

interface StepHowToTrackProps {
  categories: ProcessedCategory[]
  categoryModes: Record<string, 'auto' | 'manual'>
  shelfLifeDays: Record<string, number | null>
  productOverrides: Record<string, ProductOverride>
  storeId: string | null
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
  onUpdateProductOverride: (productId: string, override: ProductOverride) => void
  onClearProductOverride: (productId: string) => void
  onResetToDefaults: () => void
  onActivate: () => void
  onBack: () => void
}

/**
 * Step 2: How to Track
 *
 * Configure shelf life and tracking mode for each category.
 * - Auto mode: System calculates expiry dates
 * - Manual mode: User enters expiry dates manually
 * - Optional per-product overrides within categories
 */
export function StepHowToTrack({
  categories,
  categoryModes,
  shelfLifeDays,
  productOverrides,
  storeId,
  onUpdateMode,
  onUpdateShelfLife,
  onUpdateProductOverride,
  onClearProductOverride,
  onResetToDefaults,
  onActivate,
  onBack,
}: StepHowToTrackProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.howToTrack')
  const [previewOpen, setPreviewOpen] = useState(false)

  const autoCount = categories.filter(c => categoryModes[c.id] === 'auto').length
  const manualCount = categories.filter(c => categoryModes[c.id] === 'manual').length
  const trackedProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0)

  // Generate preview batches based on actual enabled categories
  const previewBatches = categories
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
    const manualCategory = categories.find(c => categoryModes[c.id] === 'manual')
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Typography variant="h3" className="mb-2">
          How should we track expiration dates?
        </Typography>
        <Typography variant="p" color="muted">
          Set a default shelf life for each category. When deliveries arrive, we'll calculate the
          expiry automatically. Choose "Manual entry" for categories where you'd rather enter dates
          yourself.
        </Typography>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        {/* <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
          <Typography variant="h4">
            {t('sections.categories')}
          </Typography>
          <Typography variant="h4">
            {t('sections.defaultShelfLife')}
          </Typography>
        </div> */}
        <Card className="flex flex-col gap-3">
          {categories.map(category => (
            <CategoryConfigRow
              key={category.id}
              category={category}
              mode={categoryModes[category.id] || 'auto'}
              days={shelfLifeDays[category.id]}
              productOverrides={productOverrides}
              storeId={storeId}
              onUpdateMode={onUpdateMode}
              onUpdateShelfLife={onUpdateShelfLife}
              onUpdateProductOverride={onUpdateProductOverride}
              onClearProductOverride={onClearProductOverride}
              t={t}
            />
          ))}
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center select-none">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> = auto-calculate from delivery date
          </div>
          <div className="flex items-center gap-1.5">
            <Type className="w-3 h-3" /> = you'll enter dates per delivery
          </div>
        </div>
      </div>

      {/* Batch preview — collapsible */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setPreviewOpen(!previewOpen)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-primary-900" />

            <Typography variant="p">Preview your dashboard</Typography>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${previewOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {previewOpen && (
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
                        <Typography variant="small" color="primary">
                          {batch.product}
                        </Typography>
                        <Typography variant="extraSmall">{batch.category}</Typography>
                      </td>
                      <td className="py-2.5">
                        {batch.confidence === 'manual' ? (
                          <Badge size="sm">
                            <Type className="w-3 h-3" /> Set on delivery
                          </Badge>
                        ) : (
                          <Badge size="sm" variant={batch.daysLeft <= 3 ? 'danger' : 'primary'}>
                            {batch.daysLeft}d from delivery
                            {batch.confidence !== 'high' && '~'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-2.5  text-right tabular-nums">{batch.qty}</td>
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

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 border border-muted rounded-lg shadow-sm">
        <Typography variant="small">
          These are starting defaults. Your team can adjust any date when processing a delivery. You
          can change all of this later in Settings.
        </Typography>
      </div>

      {/* Summary */}
      <Card className="p-4 border border-muted rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="p">{trackedProducts} products ready</Typography>
        </div>
        <div className="flex items-center gap-6 ">
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

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('backButton')}
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onResetToDefaults}>
            <RotateCcw className="w-3 h-3 mr-1.5" />
            {t('resetButton')}
          </Button>
          <Button onClick={onActivate}>
            <Zap className="w-3.5 h-3.5 mr-2" />
            {t('activateButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// CATEGORY CONFIG ROW
// =============================================================================

interface CategoryConfigRowProps {
  category: ProcessedCategory
  mode: 'auto' | 'manual'
  days: number | null
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
  // Kept in interface but unused - for future product overrides feature
  productOverrides?: Record<string, ProductOverride>
  storeId?: string | null
  onUpdateProductOverride?: (productId: string, override: ProductOverride) => void
  onClearProductOverride?: (productId: string) => void
  t?: (key: string) => string
}

function CategoryConfigRow({
  category,
  mode,
  days,
  onUpdateMode,
  onUpdateShelfLife,
}: CategoryConfigRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <Typography variant="p" className="font-medium">
          {category.name}
        </Typography>
        <Typography variant="small" className="text-muted-foreground">
          {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
        </Typography>
      </div>
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

      {/* Optional Product Overrides - Hidden for now as requested */}
      {/* {category.id !== 'uncategorized' && (
        <CategoryProductExpand
          categoryId={category.id}
          storeId={storeId}
          categoryMode={mode}
          categoryDays={days}
          productOverrides={productOverrides}
          onUpdateProductOverride={onUpdateProductOverride}
          onClearProductOverride={onClearProductOverride}
        />
      )} */}
    </div>
  )
}
