'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SortConfig, SortField } from './todo-sort-controls'

interface MobileSortOnlyModalProps {
  isOpen: boolean
  onClose: () => void
  sortConfig: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  onReset: () => void
  isLoading?: boolean
}

const SORT_OPTIONS: {
  value: SortField
  translationKey: string
  emoji: string
}[] = [
  { value: 'urgency', translationKey: 'filters.sort.urgency', emoji: '⚡' },
  { value: 'expiry_date', translationKey: 'filters.sort.expiryDate', emoji: '📅' },
  { value: 'current_quantity', translationKey: 'filters.sort.currentQuantity', emoji: '📦' },
  { value: 'potential_loss', translationKey: 'filters.sort.potentialLoss', emoji: '💰' },
  { value: 'alphabetical', translationKey: 'filters.sort.alphabetical', emoji: '🔤' },
  { value: 'action_date', translationKey: 'filters.sort.actionDate', emoji: '📝' },
  { value: 'effectiveness', translationKey: 'filters.sort.effectiveness', emoji: '📊' },
]

export function MobileSortOnlyModal({
  isOpen,
  onClose,
  sortConfig,
  onSortChange,
  onReset,
  isLoading = false,
}: MobileSortOnlyModalProps) {
  const t = useTranslations('todos')

  const handleSortFieldChange = (field: SortField) => {
    onSortChange({
      field,
      direction: sortConfig.direction,
    })
  }

  const handleSortDirectionChange = () => {
    onSortChange({
      field: sortConfig.field,
      direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  const hasCustomSort = sortConfig.field !== 'urgency' || sortConfig.direction !== 'desc'

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex items-center gap-2 text-primary font-bold">
          <ArrowUpDown className="w-4 h-4" />
          {t('filters.sortTitle')}
        </div>
      }
    >
      <div className="px-6 py-4 pb-6 space-y-4">
        {/* Sort Field */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('filters.sort.sortBy')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map(option => {
              const isSelected = sortConfig.field === option.value

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortFieldChange(option.value)}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  <span className="mr-1">{option.emoji}</span>
                  {t(option.translationKey)}
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Sort Direction */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('filters.sort.direction')}
          </h4>
          <div className="flex gap-1.5">
            <Button
              variant={sortConfig.direction === 'asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortDirectionChange()}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              <span className="mr-1">⬆️</span>
              {t('filters.sort.ascending')}
            </Button>
            <Button
              variant={sortConfig.direction === 'desc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortDirectionChange()}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              <span className="mr-1">⬇️</span>
              {t('filters.sort.descending')}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Current Sort Display */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('filters.currentSort')}</h4>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span>{SORT_OPTIONS.find(o => o.value === sortConfig.field)?.emoji}</span>
              <span className="font-medium">
                {t(SORT_OPTIONS.find(o => o.value === sortConfig.field)?.translationKey || '')}
              </span>
              <span className="text-muted-foreground">
                {sortConfig.direction === 'asc' ? '⬆️' : '⬇️'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={!hasCustomSort || isLoading}
            className="flex-1 h-9"
          >
            {t('filters.resetSort')}
          </Button>
          <Button onClick={onClose} disabled={isLoading} className="flex-1 h-9">
            {t('filters.apply')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
