'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useMediaQuery } from '@/hooks/use-mobile'
import { ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SortDirection, SortField } from './types'
import { Typography } from '@/components/ui/typography'

const SORT_OPTIONS: {
  value: SortField
  labelKey: string
  descriptionKey: string
  emoji: string
}[] = [
  {
    value: 'urgency',
    labelKey: 'sort.urgency.label',
    descriptionKey: 'sort.urgency.description',
    emoji: '⚡',
  },
  {
    value: 'expiry_date',
    labelKey: 'sort.expiryDate.label',
    descriptionKey: 'sort.expiryDate.description',
    emoji: '📅',
  },
  {
    value: 'current_quantity',
    labelKey: 'sort.currentQuantity.label',
    descriptionKey: 'sort.currentQuantity.description',
    emoji: '📦',
  },
  {
    value: 'potential_loss',
    labelKey: 'sort.potentialLoss.label',
    descriptionKey: 'sort.potentialLoss.description',
    emoji: '💰',
  },
  {
    value: 'alphabetical',
    labelKey: 'sort.alphabetical.label',
    descriptionKey: 'sort.alphabetical.description',
    emoji: '🔤',
  },
  {
    value: 'action_date',
    labelKey: 'sort.actionDate.label',
    descriptionKey: 'sort.actionDate.description',
    emoji: '📝',
  },
  {
    value: 'effectiveness',
    labelKey: 'sort.effectiveness.label',
    descriptionKey: 'sort.effectiveness.description',
    emoji: '📊',
  },
]

const SORT_DIRECTION_OPTIONS: {
  value: SortDirection
  labelKey: string
  emoji: string
}[] = [
  { value: 'asc', labelKey: 'filters.ascending', emoji: '⬆️' },
  { value: 'desc', labelKey: 'filters.descending', emoji: '⬇️' },
]

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface UnifiedSortModalProps {
  isOpen: boolean
  onClose: () => void
  sortConfig: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  onReset: () => void
  isLoading?: boolean
}

export function UnifiedSortModal({
  isOpen,
  onClose,
  sortConfig,
  onSortChange,
  onReset,
  isLoading = false,
}: UnifiedSortModalProps) {
  const t = useTranslations('todos')
  const { isMobile } = useMediaQuery()

  const handleSortFieldChange = (field: SortField) => {
    onSortChange({ ...sortConfig, field })
  }

  const handleSortDirectionChange = (direction: SortDirection) => {
    onSortChange({ ...sortConfig, direction })
  }

  // Configuration responsive
  const gridCols = isMobile ? 'grid-cols-1' : 'grid-cols-2'
  const buttonSize = isMobile ? 'sm' : 'sm'
  const buttonHeight = isMobile ? 'h-7' : 'h-16'
  const textSize = isMobile ? 'text-xs' : 'text-base'
  const spacing = isMobile ? 'space-y-2' : 'space-y-4'
  const padding = isMobile ? 'px-6 py-4 pb-6' : 'px-8 py-6'

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="fullHeight"
      titleElement={
        <div
          className={`flex items-center ${isMobile ? 'px-6' : 'px-8'} gap-2 text-primary font-bold`}
        >
          <ArrowUpDown className="w-5 h-5" />
          {t('filters.sortTitle')}
        </div>
      }
    >
      <div className={`space-y-8 ${padding}`}>
        {/* Sort Field Selection */}
        <div className={spacing}>
          <Typography variant="h4" color="muted">
            {t('filters.sortBy')}
          </Typography>
          <div className={`grid ${gridCols} gap-3`}>
            {SORT_OPTIONS.map(option => {
              const isSelected = sortConfig.field === option.value

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleSortFieldChange(option.value)}
                  disabled={isLoading}
                  className={`${buttonHeight} justify-start py-5 sm:py-5 ${textSize}`}
                >
                  <span className={`mr-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {option.emoji}
                  </span>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className={` ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                      {t(option.labelKey)}
                    </span>
                    <span
                      className={`${isMobile ? 'text-xs' : 'text-xs'} line-clamp-2 leading-tight`}
                    >
                      {t(option.descriptionKey)}
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Sort Direction Selection */}
        <div className={spacing}>
          <Typography variant="h4" color="muted">
            {t('filters.sortDirection')}
          </Typography>
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
            {SORT_DIRECTION_OPTIONS.map(option => {
              const isSelected = sortConfig.direction === option.value

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleSortDirectionChange(option.value)}
                  disabled={isLoading}
                  className={`${isMobile ? 'h-7' : 'h-10'} justify-center ${textSize} px-4`}
                >
                  <span className={`mr-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    {option.emoji}
                  </span>
                  <span className="truncate">{t(option.labelKey)}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Current Sort Display */}
        <div className="space-y-2">
          <Typography variant="h4" color="muted">
            {t('filters.currentSort')}
          </Typography>
          <div className={`p-3 bg-muted rounded-lg ${isMobile ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center gap-2 flex-wrap`}>
              <Typography variant="h4" color="primary">
                {SORT_OPTIONS.find(o => o.value === sortConfig.field)?.emoji}
              </Typography>
              <Typography variant="h4" color="primary">
                {t(SORT_OPTIONS.find(o => o.value === sortConfig.field)?.labelKey || '')}
              </Typography>
              <Typography variant="h4" color="primary">
                {t(
                  SORT_DIRECTION_OPTIONS.find(o => o.value === sortConfig.direction)?.labelKey ||
                    '',
                )}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-3 py-8 px-8 ${isMobile ? 'pt-2' : ' border-t '}`}>
        <Button variant="outline" onClick={onReset} disabled={isLoading} className="flex-1">
          {t('filters.resetSort')}
        </Button>
        <Button onClick={onClose} disabled={isLoading} className="flex-1">
          {t('filters.apply')}
        </Button>
      </div>
    </BottomSheet>
  )
}
