'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ShelfLifeChip } from './shelf-life-chip'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import type { ProductOverride } from '../batch-tracking-step'

interface ProductOverrideRowProps {
  productId: string
  productName: string
  override: ProductOverride | null
  categoryMode: 'auto' | 'manual'
  categoryDays: number | null
  onUpdate: (productId: string, override: ProductOverride) => void
  onClear: (productId: string) => void
}

/**
 * Product Override Row
 *
 * Shows individual product with option to override category defaults.
 * Displays within expanded category section.
 */
export function ProductOverrideRow({
  productId,
  productName,
  override,
  categoryMode,
  categoryDays,
  onUpdate,
  onClear,
}: ProductOverrideRowProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.howToTrack.products')
  const hasOverride = override !== null
  const displayMode = override?.mode || categoryMode
  const displayDays = override?.days !== undefined ? override.days : categoryDays

  const handleModeChange = (mode: 'auto' | 'manual') => {
    onUpdate(productId, {
      productId,
      mode,
      days: mode === 'auto' ? displayDays || 14 : null,
    })
  }

  const handleDaysChange = (days: number | null) => {
    if (override) {
      onUpdate(productId, { ...override, days })
    } else {
      onUpdate(productId, {
        productId,
        mode: 'auto',
        days,
      })
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <Typography variant="p" className="font-medium text-sm">
          {productName}
        </Typography>
        {!hasOverride && (
          <Typography variant="small" className="text-muted-foreground">
            {t('inheritsCategorySettings')}
          </Typography>
        )}
        {hasOverride && (
          <Typography variant="small" className="text-blue-600 dark:text-blue-400">
            {t('customOverrideApplied')}
          </Typography>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ShelfLifeChip
          mode={displayMode}
          days={displayDays}
          onModeChange={handleModeChange}
          onDaysChange={handleDaysChange}
        />

        {hasOverride && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onClear(productId)}
            className="h-8 w-8 p-0"
            title={t('removeOverride')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
