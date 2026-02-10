'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Toggle } from './toggle'
import { useTranslations } from 'next-intl'
import { Package } from 'lucide-react'
import type { ProcessedCategory } from '../batch-tracking-step'

interface StepWhatToTrackProps {
  categories: ProcessedCategory[]
  enabledCategories: ProcessedCategory[]
  onToggleCategory: (categoryId: string, enabled: boolean) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Step 1: What to Track
 *
 * Allows users to enable/disable categories for batch tracking.
 * - Food categories default to ON
 * - Non-food categories default to OFF
 * - Shows product count per category
 * - Summary of tracked products
 */
export function StepWhatToTrack({
  categories,
  enabledCategories,
  onToggleCategory,
  onNext,
  onBack,
}: StepWhatToTrackProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.whatToTrack')

  const enabledIds = new Set(enabledCategories.map(c => c.id))
  const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0)
  const trackedProducts = enabledCategories.reduce((sum, cat) => sum + cat.productCount, 0)

  const canProceed = enabledCategories.length > 0
  const allSelected = enabledIds.size === categories.length && categories.length > 0

  const handleToggleAll = (checked: boolean) => {
    // Only allow selecting all - once all are selected, toggle is disabled
    if (checked) {
      categories.forEach(cat => onToggleCategory(cat.id, true))
    }
  }

  return (
    <div className="flex flex-col gap-6 mb-80">
      <div>
        <Typography variant="h3" className="mb-2">
          {t('title')}
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          {t('description')}
        </Typography>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <Typography variant="small" className="text-muted-foreground">
                {t('noCategories')}
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
                  {t('selectAll')}
                </Typography>
                <Toggle
                  checked={allSelected}
                  onCheckedChange={handleToggleAll}
                  disabled={allSelected}
                />
              </div>

              {/* Category List */}
              {categories.map(category => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  enabled={enabledIds.has(category.id)}
                  allSelected={allSelected}
                  onToggle={onToggleCategory}
                />
              ))}
            </>
          )}
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-secondary-100/30 p-4">
        <div className="flex items-center justify-between">
          <Typography variant="p" color="secondary" className="text-sm font-medium">
            {t('summary.tracking')}
          </Typography>
          <Typography variant="p" color="secondary" className="text-sm font-semibold">
            {trackedProducts.toLocaleString()} {t('summary.of')} {totalProducts.toLocaleString()}{' '}
            {t('summary.products')}
          </Typography>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('backButton')}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t('nextButton')}
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// CATEGORY ROW
// =============================================================================

interface CategoryRowProps {
  category: ProcessedCategory
  enabled: boolean
  allSelected: boolean
  onToggle: (categoryId: string, enabled: boolean) => void
}

function CategoryRow({ category, enabled, onToggle }: CategoryRowProps) {
  // Mute text when disabled
  const shouldMute = !enabled

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <Typography
          variant="p"
          className={`font-medium transition-colors ${shouldMute ? 'text-muted-foreground' : ''}`}
        >
          {category.name}
        </Typography>
        <Typography variant="small" className="text-muted-foreground">
          {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
        </Typography>
      </div>
      <Toggle checked={enabled} onCheckedChange={checked => onToggle(category.id, checked)} />
    </div>
  )
}
