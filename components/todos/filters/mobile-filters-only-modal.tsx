'use client'

import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { Filter, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface TodoFilterValues {
  urgency_level?: TodoUrgencyLevel[]
  action_type?: TodoActionType[]
  batch_status?: BatchStatus[]
}

interface MobileFiltersOnlyModalProps {
  isOpen: boolean
  onClose: () => void
  filters: TodoFilterValues
  onFiltersChange: (filters: TodoFilterValues) => void
  onClearAll: () => void
  isLoading?: boolean
}

const URGENCY_OPTIONS: {
  value: TodoUrgencyLevel | 'all'
  translationKey: string
  color: 'default' | 'destructive' | 'secondary' | 'outline'
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.urgency.all', color: 'default', emoji: '🔍' },
  {
    value: 'critical',
    translationKey: 'filters.urgency.critical',
    color: 'destructive',
    emoji: '🚨',
  },
  { value: 'high', translationKey: 'filters.urgency.high', color: 'destructive', emoji: '⚠️' },
  { value: 'medium', translationKey: 'filters.urgency.medium', color: 'secondary', emoji: '⚡' },
  { value: 'low', translationKey: 'filters.urgency.low', color: 'outline', emoji: '📋' },
  { value: 'none', translationKey: 'filters.urgency.none', color: 'outline', emoji: '✅' },
]

const ACTION_OPTIONS: {
  value: TodoActionType | 'all'
  translationKey: string
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.action.all', emoji: '🔍' },
  { value: 'discount', translationKey: 'filters.action.discount', emoji: '🏷️' },
  { value: 'donate', translationKey: 'filters.action.donate', emoji: '❤️' },
  { value: 'donate_prepared', translationKey: 'filters.action.donatePrepared', emoji: '🍽️' },
  { value: 'dispose', translationKey: 'filters.action.dispose', emoji: '🗑️' },
  { value: 'maintain', translationKey: 'filters.action.maintain', emoji: '🔧' },
  { value: 'ignored', translationKey: 'filters.action.ignored', emoji: '👁️‍🗨️' },
]

const BATCH_STATUS_OPTIONS: {
  value: BatchStatus | 'all'
  translationKey: string
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.status.all', emoji: '🔍' },
  { value: 'active', translationKey: 'filters.status.active', emoji: '🟢' },
  { value: 'expired', translationKey: 'filters.status.expired', emoji: '🔴' },
]

export function MobileFiltersOnlyModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
  isLoading = false,
}: MobileFiltersOnlyModalProps) {
  const t = useTranslations('todos')

  const handleUrgencyChange = (urgency: TodoUrgencyLevel | 'all') => {
    if (urgency === 'all') {
      onFiltersChange({
        ...filters,
        urgency_level: undefined,
      })
      return
    }

    const current = filters.urgency_level || []
    const updated = current.includes(urgency)
      ? current.filter(u => u !== urgency)
      : [...current, urgency]

    onFiltersChange({
      ...filters,
      urgency_level: updated.length > 0 ? updated : undefined,
    })
  }

  const handleActionChange = (action: TodoActionType | 'all') => {
    if (action === 'all') {
      onFiltersChange({
        ...filters,
        action_type: undefined,
      })
      return
    }

    const current = filters.action_type || []
    const updated = current.includes(action)
      ? current.filter(a => a !== action)
      : [...current, action]

    onFiltersChange({
      ...filters,
      action_type: updated.length > 0 ? updated : undefined,
    })
  }

  const handleStatusChange = (status: BatchStatus | 'all') => {
    if (status === 'all') {
      onFiltersChange({
        ...filters,
        batch_status: undefined,
      })
      return
    }

    const current = filters.batch_status || []
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status]

    onFiltersChange({
      ...filters,
      batch_status: updated.length > 0 ? updated : undefined,
    })
  }

  const hasActiveFilters =
    filters.urgency_level?.length || filters.action_type?.length || filters.batch_status?.length

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="fullHeight"
      titleElement={
        <div className="flex items-center gap-2 text-primary font-bold">
          <Filter className="w-4 h-4" />
          {t('filters.filtersTitle')}
        </div>
      }
    >
      <div className="px-6 py-4 pb-6 space-y-4">
        {/* Urgency Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('filters.urgency.title')}{' '}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {URGENCY_OPTIONS.map(option => {
              const isAll = option.value === 'all'
              const isSelected = isAll
                ? !filters.urgency_level?.length
                : filters.urgency_level?.includes(option.value as TodoUrgencyLevel)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUrgencyChange(option.value)}
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

        {/* Action Type Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('filters.action.title')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_OPTIONS.map(option => {
              const isAll = option.value === 'all'
              const isSelected = isAll
                ? !filters.action_type?.length
                : filters.action_type?.includes(option.value as TodoActionType)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleActionChange(option.value)}
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

        {/* Batch Status Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('filters.status.title')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {BATCH_STATUS_OPTIONS.map(option => {
              const isAll = option.value === 'all'
              const isSelected = isAll
                ? !filters.batch_status?.length
                : filters.batch_status?.includes(option.value as BatchStatus)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(option.value)}
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

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t('filters.activeFilters')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {filters.urgency_level?.map(urgency => {
                const option = URGENCY_OPTIONS.find(o => o.value === urgency)
                return (
                  <Badge key={urgency} variant="secondary" className="gap-1 text-xs">
                    {option && <span>{option.emoji}</span>}
                    {option ? t(option.translationKey) : urgency}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleUrgencyChange(urgency)}
                    />
                  </Badge>
                )
              })}

              {filters.action_type?.map(action => {
                const option = ACTION_OPTIONS.find(o => o.value === action)
                return (
                  <Badge key={action} variant="secondary" className="gap-1 text-xs">
                    {option && <span>{option.emoji}</span>}
                    {option ? t(option.translationKey) : action}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleActionChange(action)}
                    />
                  </Badge>
                )
              })}

              {filters.batch_status?.map(status => {
                const option = BATCH_STATUS_OPTIONS.find(o => o.value === status)
                return (
                  <Badge key={status} variant="secondary" className="gap-1 text-xs">
                    {option && <span>{option.emoji}</span>}
                    {option ? t(option.translationKey) : status}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleStatusChange(status)}
                    />
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={!hasActiveFilters || isLoading}
            className="flex-1 h-9"
          >
            {t('filters.clearAll')}
          </Button>
          <Button onClick={onClose} disabled={isLoading} className="flex-1 h-9">
            {t('filters.apply')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
