'use client'

import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useMediaQuery } from '@/hooks/use-mobile'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { Filter, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { TodoFilterValues } from './todo-filters-bar'

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
  color: 'default' | 'destructive' | 'secondary' | 'outline'
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.action.all', color: 'default', emoji: '🔍' },
  { value: 'discount', translationKey: 'filters.action.discount', color: 'secondary', emoji: '🏷️' },
  { value: 'donate', translationKey: 'filters.action.donate', color: 'default', emoji: '❤️' },
  {
    value: 'donate_prepared',
    translationKey: 'filters.action.donatePrepared',
    color: 'default',
    emoji: '📦',
  },
  { value: 'maintain', translationKey: 'filters.action.maintain', color: 'secondary', emoji: '🔧' },
  { value: 'dispose', translationKey: 'filters.action.dispose', color: 'destructive', emoji: '🗑️' },
]

const BATCH_STATUS_OPTIONS: {
  value: BatchStatus | 'all'
  translationKey: string
  color: 'default' | 'destructive' | 'secondary' | 'outline'
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.batchStatus.all', color: 'outline', emoji: '🔍' },
  { value: 'active', translationKey: 'filters.batchStatus.active', color: 'default', emoji: '✅' },
  {
    value: 'expired',
    translationKey: 'filters.batchStatus.expired',
    color: 'destructive',
    emoji: '❌',
  },
]

const EXPIRY_OPTIONS: {
  value: string
  translationKey: string
  emoji: string
}[] = [
  { value: 'all', translationKey: 'filters.expiry.all', emoji: '📅' },
  { value: 'expiring_soon', translationKey: 'filters.expiry.expiringSoon', emoji: '⚠️' },
  { value: 'recently_expired', translationKey: 'filters.expiry.recentlyExpired', emoji: '❌' },
]

interface UnifiedFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: TodoFilterValues
  onFiltersChange: (filters: TodoFilterValues) => void
  onClearAll: () => void
  isLoading?: boolean
}

export function UnifiedFiltersModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
  isLoading = false,
}: UnifiedFiltersModalProps) {
  const t = useTranslations('todos')
  const { isMobile } = useMediaQuery()

  const handleUrgencyChange = (urgency: TodoUrgencyLevel | 'all') => {
    if (urgency === 'all') {
      onFiltersChange({ ...filters, urgency_level: undefined })
    } else {
      const currentUrgency = filters.urgency_level || []
      const newUrgency = currentUrgency.includes(urgency)
        ? currentUrgency.filter(u => u !== urgency)
        : [...currentUrgency, urgency]
      onFiltersChange({ ...filters, urgency_level: newUrgency.length > 0 ? newUrgency : undefined })
    }
  }

  const handleActionChange = (action: TodoActionType | 'all') => {
    if (action === 'all') {
      onFiltersChange({ ...filters, action_type: undefined })
    } else {
      const currentAction = filters.action_type || []
      const newAction = currentAction.includes(action)
        ? currentAction.filter(a => a !== action)
        : [...currentAction, action]
      onFiltersChange({ ...filters, action_type: newAction.length > 0 ? newAction : undefined })
    }
  }

  const handleStatusChange = (status: BatchStatus | 'all') => {
    if (status === 'all') {
      onFiltersChange({ ...filters, batch_status: undefined })
    } else {
      const currentStatus = filters.batch_status || []
      const newStatus = currentStatus.includes(status)
        ? currentStatus.filter(s => s !== status)
        : [...currentStatus, status]
      onFiltersChange({ ...filters, batch_status: newStatus.length > 0 ? newStatus : undefined })
    }
  }

  const handleExpiryChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, expiry_range: undefined })
    } else {
      onFiltersChange({ ...filters, expiry_range: value })
    }
  }

  const hasActiveFilters = Boolean(
    filters.urgency_level?.length ||
      filters.action_type?.length ||
      filters.batch_status?.length ||
      filters.expiry_range,
  )

  // Configuration responsive
  const gridCols = isMobile ? 'grid-cols-2' : 'grid-cols-3'
  const buttonSize = isMobile ? 'sm' : 'sm'
  const buttonHeight = isMobile ? 'h-7' : 'h-12'
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
          <Filter className="w-5 h-5" />
          {t('filters.filtersTitle')}
        </div>
      }
    >
      <div className={`space-y-8 ${padding}`}>
        {/* Urgency Filter */}
        <div className={spacing}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-muted-foreground`}>
            {t('filters.urgency.title')}
          </h4>
          <div className={`grid ${gridCols} gap-3`}>
            {URGENCY_OPTIONS.map(option => {
              const isSelected =
                option.value === 'all'
                  ? !filters.urgency_level?.length
                  : filters.urgency_level?.includes(option.value as TodoUrgencyLevel)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleUrgencyChange(option.value as TodoUrgencyLevel | 'all')}
                  disabled={isLoading}
                  className={`${buttonHeight} justify-start ${textSize}`}
                >
                  <span className="mr-2">{option.emoji}</span>
                  {t(option.translationKey)}
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Action Type Filter */}
        <div className={spacing}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-muted-foreground`}>
            {t('filters.action.title')}
          </h4>
          <div className={`grid ${gridCols} gap-3`}>
            {ACTION_OPTIONS.map(option => {
              const isSelected =
                option.value === 'all'
                  ? !filters.action_type?.length
                  : filters.action_type?.includes(option.value as TodoActionType)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleActionChange(option.value as TodoActionType | 'all')}
                  disabled={isLoading}
                  className={`${buttonHeight} justify-start ${textSize}`}
                >
                  <span className="mr-2">{option.emoji}</span>
                  {t(option.translationKey)}
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Batch Status Filter */}
        <div className={spacing}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-muted-foreground`}>
            {t('filters.batchStatus.title')}
          </h4>
          <div className={`grid ${gridCols} gap-3`}>
            {BATCH_STATUS_OPTIONS.map(option => {
              const isSelected =
                option.value === 'all'
                  ? !filters.batch_status?.length
                  : filters.batch_status?.includes(option.value as BatchStatus)

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleStatusChange(option.value as BatchStatus | 'all')}
                  disabled={isLoading}
                  className={`${buttonHeight} justify-start ${textSize}`}
                >
                  <span className="mr-2">{option.emoji}</span>
                  {t(option.translationKey)}
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Expiry Filter */}
        <div className={spacing}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-muted-foreground`}>
            {t('filters.expiry.title')}
          </h4>
          <div className={`grid ${gridCols} gap-3`}>
            {EXPIRY_OPTIONS.map(option => {
              const isSelected =
                option.value === 'all'
                  ? !filters.expiry_range
                  : filters.expiry_range === option.value

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size={buttonSize}
                  onClick={() => handleExpiryChange(option.value)}
                  disabled={isLoading}
                  className={`${buttonHeight} justify-start ${textSize}`}
                >
                  <span className="mr-2">{option.emoji}</span>
                  {t(option.translationKey)}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <h4
              className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-muted-foreground`}
            >
              {t('filters.activeFilters')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {filters.urgency_level?.map(urgency => {
                const option = URGENCY_OPTIONS.find(opt => opt.value === urgency)
                return (
                  <Badge key={urgency} variant="secondary" className="gap-2">
                    <span>{option?.emoji}</span>
                    <span>{t(option?.translationKey || '')}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleUrgencyChange(urgency)}
                    />
                  </Badge>
                )
              })}
              {filters.action_type?.map(action => {
                const option = ACTION_OPTIONS.find(opt => opt.value === action)
                return (
                  <Badge key={action} variant="secondary" className="gap-2">
                    <span>{option?.emoji}</span>
                    <span>{t(option?.translationKey || '')}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleActionChange(action)}
                    />
                  </Badge>
                )
              })}
              {filters.batch_status?.map(status => {
                const option = BATCH_STATUS_OPTIONS.find(opt => opt.value === status)
                return (
                  <Badge key={status} variant="secondary" className="gap-2">
                    <span>{option?.emoji}</span>
                    <span>{t(option?.translationKey || '')}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleStatusChange(status)}
                    />
                  </Badge>
                )
              })}
              {filters.expiry_range && (
                <Badge variant="secondary" className="gap-2">
                  <span>
                    {EXPIRY_OPTIONS.find(opt => opt.value === filters.expiry_range)?.emoji}
                  </span>
                  <span>
                    {t(
                      EXPIRY_OPTIONS.find(opt => opt.value === filters.expiry_range)
                        ?.translationKey || '',
                    )}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => handleExpiryChange('all')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-3 px-8 py-8 ${isMobile ? 'pt-4' : 'py-8 border-t'}`}>
        <Button
          variant="outline"
          onClick={onClearAll}
          disabled={!hasActiveFilters || isLoading}
          className="flex-1"
        >
          {t('filters.clearAll')}
        </Button>
        <Button onClick={onClose} disabled={isLoading} className="flex-1">
          {t('filters.apply')}
        </Button>
      </div>
    </BottomSheet>
  )
}
