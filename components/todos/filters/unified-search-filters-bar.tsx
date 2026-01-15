'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-mobile'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { ArrowUpDown, Filter, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TodoSearchBar } from './todo-search-bar'

interface UnifiedSearchFiltersBarProps {
  searchTerm?: string
  onSearchChange: (searchTerm: string | undefined) => void
  onFiltersClick: () => void
  onSortClick: () => void
  isLoading?: boolean
  placeholder?: string
  // Active filters
  urgencyLevel?: TodoUrgencyLevel[]
  actionType?: TodoActionType[]
  batchStatus?: BatchStatus[]
  expiryRange?: string
  onRemoveFilter?: (type: 'urgency' | 'action' | 'batch' | 'expiry', value?: string) => void
  onClearAll?: () => void
}

export function UnifiedSearchFiltersBar({
  searchTerm,
  onSearchChange,
  onFiltersClick,
  onSortClick,
  isLoading = false,
  placeholder,
  urgencyLevel,
  actionType,
  batchStatus,
  expiryRange,
  onRemoveFilter,
  onClearAll,
}: UnifiedSearchFiltersBarProps) {
  const t = useTranslations('todos')
  const { isMobile } = useMediaQuery()

  // Filter options for display
  const URGENCY_OPTIONS = [
    { value: 'critical', label: t('filters.urgency.critical'), emoji: '🚨' },
    { value: 'high', label: t('filters.urgency.high'), emoji: '⚠️' },
    { value: 'medium', label: t('filters.urgency.medium'), emoji: '⚡' },
    { value: 'low', label: t('filters.urgency.low'), emoji: '📋' },
    { value: 'none', label: t('filters.urgency.none'), emoji: '✅' },
  ]

  const ACTION_OPTIONS = [
    { value: 'discount', label: t('filters.action.discount'), emoji: '🏷️' },
    { value: 'donate', label: t('filters.action.donate'), emoji: '❤️' },
    { value: 'donate_prepared', label: t('filters.action.donatePrepared'), emoji: '📦' },
    { value: 'maintain', label: t('filters.action.maintain'), emoji: '🔧' },
    { value: 'dispose', label: t('filters.action.dispose'), emoji: '🗑️' },
    { value: 'sold', label: t('filters.action.sold'), emoji: '💰' },
    { value: 'ignored', label: t('filters.action.ignored'), emoji: '👁️' },
  ]

  const BATCH_STATUS_OPTIONS = [
    { value: 'active', label: t('filters.batchStatus.active'), emoji: '✅' },
    { value: 'expired', label: t('filters.batchStatus.expired'), emoji: '❌' },
  ]

  const EXPIRY_OPTIONS = [
    { value: 'expiring_soon', label: t('filters.expiry.expiringSoon'), emoji: '⚠️' },
    { value: 'recently_expired', label: t('filters.expiry.recentlyExpired'), emoji: '❌' },
  ]

  // Check if there are any active filters
  const hasActiveFilters =
    urgencyLevel?.length || actionType?.length || batchStatus?.length || expiryRange

  if (isMobile) {
    return (
      <div className="px-4 py-6 space-y-6">
        {/* Filter and Sort Buttons Row */}
        <div className="flex justify-center gap-3">
          <Button
            variant="subtleTertiary"
            onClick={onFiltersClick}
            className="flex items-center gap-2 h-12 px-6 text-base "
          >
            <Filter className="w-5 h-5" />
            {t('filters.filtersTitle')}
          </Button>
          <Button
            variant="subtleTertiary"
            onClick={onSortClick}
            className="flex items-center gap-2 h-12 px-6 text-base "
          >
            <ArrowUpDown className="w-5 h-5" />
            {t('filters.sortTitle')}
          </Button>
        </div>

        {/* Search Bar Row */}
        <div className="flex justify-center">
          <TodoSearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            isLoading={isLoading}
            placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
            size="medium"
          />
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && onRemoveFilter && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h4 className="text-sm  text-muted-foreground">{t('filters.activeFilters')}</h4>
              {onClearAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="h-7 px-3 text-xs text-primary"
                >
                  {t('filters.clearAll')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {/* Urgency Filters */}
              {urgencyLevel?.map(urgency => {
                const option = URGENCY_OPTIONS.find(opt => opt.value === urgency)
                return (
                  <Badge key={urgency} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('urgency', urgency)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Action Type Filters */}
              {actionType?.map(action => {
                const option = ACTION_OPTIONS.find(opt => opt.value === action)
                return (
                  <Badge key={action} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('action', action)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Batch Status Filters */}
              {batchStatus?.map(status => {
                const option = BATCH_STATUS_OPTIONS.find(opt => opt.value === status)
                return (
                  <Badge key={status} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('batch', status)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Expiry Range Filter */}
              {expiryRange && (
                <Badge variant="secondary" className="gap-1">
                  <span>{EXPIRY_OPTIONS.find(opt => opt.value === expiryRange)?.emoji}</span>
                  <span>{EXPIRY_OPTIONS.find(opt => opt.value === expiryRange)?.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onRemoveFilter('expiry')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="my-8">
      <div className="w-3/4 mx-auto">
        <div className="flex justify-center items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="subtleTertiary"
              onClick={onFiltersClick}
              className="flex items-center gap-2 h-12 px-4 font-semibold"
            >
              <Filter className="w-4 h-4" />
              {t('filters.filtersTitle')}
            </Button>
            <Button
              variant="subtleTertiary"
              onClick={onSortClick}
              className="flex items-center gap-2 h-12 px-4 font-semibold"
            >
              <ArrowUpDown className="w-4 h-4" />
              {t('filters.sortTitle')}
            </Button>
          </div>
          <div>
            <TodoSearchBar
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              isLoading={isLoading}
              placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
              size="large"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && onRemoveFilter && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-center mt-8">
              <div className="w-1/2 border-t border-border" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <h4 className="text-sm  text-muted-foreground">{t('filters.activeFilters')}</h4>
              {onClearAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="h-7 px-3 text-xs text-primary"
                >
                  {t('filters.clearAll')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {/* Urgency Filters */}
              {urgencyLevel?.map(urgency => {
                const option = URGENCY_OPTIONS.find(opt => opt.value === urgency)
                return (
                  <Badge key={urgency} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('urgency', urgency)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Action Type Filters */}
              {actionType?.map(action => {
                const option = ACTION_OPTIONS.find(opt => opt.value === action)
                return (
                  <Badge key={action} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('action', action)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Batch Status Filters */}
              {batchStatus?.map(status => {
                const option = BATCH_STATUS_OPTIONS.find(opt => opt.value === status)
                return (
                  <Badge key={status} variant="secondary" className="gap-1">
                    <span>{option?.emoji}</span>
                    <span>{option?.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveFilter('batch', status)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}

              {/* Expiry Range Filter */}
              {expiryRange && (
                <Badge variant="secondary" className="gap-1">
                  <span>{EXPIRY_OPTIONS.find(opt => opt.value === expiryRange)?.emoji}</span>
                  <span>{EXPIRY_OPTIONS.find(opt => opt.value === expiryRange)?.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onRemoveFilter('expiry')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
