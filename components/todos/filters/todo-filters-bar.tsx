'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  BatchStatus,
  TodoActionType,
  TodoUrgencyLevel,
} from '@/lib/queries/todos-rpc'
import { useTranslations } from 'next-intl'
import { ChevronDown, X } from 'lucide-react'

export interface TodoFilterValues {
  urgency_level?: TodoUrgencyLevel[]
  action_type?: TodoActionType[]
  batch_status?: BatchStatus[]
}

interface TodoFiltersBarProps {
  filters: TodoFilterValues
  onFiltersChange: (filters: TodoFilterValues) => void
  isLoading?: boolean
}

const URGENCY_OPTIONS: {
  value: TodoUrgencyLevel | 'all'
  translationKey: string
  color:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'ghost'
    | 'cyan'
    | 'blue'
    | 'green'
}[] = [
  { value: 'all', translationKey: 'filters.urgency.all', color: 'default' },
  {
    value: 'critical',
    translationKey: 'filters.urgency.critical',
    color: 'destructive',
  },
  {
    value: 'high',
    translationKey: 'filters.urgency.high',
    color: 'destructive',
  },
  { value: 'medium', translationKey: 'filters.urgency.medium', color: 'blue' },
  { value: 'low', translationKey: 'filters.urgency.low', color: 'blue' },
  { value: 'none', translationKey: 'filters.urgency.none', color: 'default' },
]

const ACTION_OPTIONS: {
  value: TodoActionType | 'all'
  translationKey: string
  icon?: string
}[] = [
  { value: 'all', translationKey: 'filters.action.all', icon: '🎯' },
  { value: 'discount', translationKey: 'filters.action.discount', icon: '🏷️' },
  { value: 'donate', translationKey: 'filters.action.donate', icon: '🤝' },
  {
    value: 'donate_prepared',
    translationKey: 'filters.action.donatePrepared',
    icon: '📦',
  },
  { value: 'dispose', translationKey: 'filters.action.dispose', icon: '🗑️' },
  { value: 'maintain', translationKey: 'filters.action.maintain', icon: '📌' },
  { value: 'ignored', translationKey: 'filters.action.ignored', icon: '🚫' },
  { value: 'sold', translationKey: 'filters.action.sold', icon: '💰' },
]

const BATCH_STATUS_OPTIONS: {
  value: BatchStatus | 'all'
  translationKey: string
}[] = [
  { value: 'all', translationKey: 'filters.status.all' },
  { value: 'active', translationKey: 'filters.status.active' },
  { value: 'expired', translationKey: 'filters.status.expired' },
]

export function TodoFiltersBar({
  filters,
  onFiltersChange,
  isLoading = false,
}: TodoFiltersBarProps) {
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
      ? current.filter((u) => u !== urgency)
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
      ? current.filter((a) => a !== action)
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
      ? current.filter((s) => s !== status)
      : [...current, status]

    onFiltersChange({
      ...filters,
      batch_status: updated.length > 0 ? updated : undefined,
    })
  }

  const hasActiveFilters =
    filters.urgency_level?.length ||
    filters.action_type?.length ||
    filters.batch_status?.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
        {/* Urgency Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[180px] justify-between"
              disabled={isLoading}
              id="todos-urgency-filter-trigger"
            >
              <span>
                {filters.urgency_level?.length
                  ? t('filters.urgencyCount', {
                      count: filters.urgency_level.length,
                    })
                  : t('filters.filterByUrgency')}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[200px] p-2">
            <div className="space-y-1">
              {URGENCY_OPTIONS.map((option) => {
                const isAll = option.value === 'all'
                const isSelected = isAll
                  ? !filters.urgency_level?.length
                  : filters.urgency_level?.includes(
                      option.value as TodoUrgencyLevel
                    )

                return (
                  <div
                    key={option.value}
                    onClick={() => handleUrgencyChange(option.value)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        onChange={() => {}}
                        className="rounded"
                      />
                      {t(option.translationKey)}
                    </span>
                    {!isAll && (
                      <Badge
                        variant={option.color}
                        className="ml-2"
                      >
                        {option.value}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[180px] justify-between"
              disabled={isLoading}
              id="todos-action-filter-trigger"
            >
              <span>
                {filters.action_type?.length
                  ? t('filters.actionsCount', {
                      count: filters.action_type.length,
                    })
                  : t('filters.filterByAction')}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] p-2">
            <div className="space-y-1">
              {ACTION_OPTIONS.map((option) => {
                const isAll = option.value === 'all'
                const isSelected = isAll
                  ? !filters.action_type?.length
                  : filters.action_type?.includes(
                      option.value as TodoActionType
                    )

                return (
                  <div
                    key={option.value}
                    onClick={() => handleActionChange(option.value)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <span className="flex items-center gap-1">
                        {option.icon && <span>{option.icon}</span>}
                        {t(option.translationKey)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Batch Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[180px] justify-between"
              disabled={isLoading}
              id="todos-status-filter-trigger"
            >
              <span>
                {filters.batch_status?.length
                  ? t('filters.statusCount', {
                      count: filters.batch_status.length,
                    })
                  : t('filters.filterByStatus')}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] p-2">
            <div className="space-y-1">
              {BATCH_STATUS_OPTIONS.map((option) => {
                const isAll = option.value === 'all'
                const isSelected = isAll
                  ? !filters.batch_status?.length
                  : filters.batch_status?.includes(option.value as BatchStatus)

                return (
                  <div
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        onChange={() => {}}
                        className="rounded"
                      />
                      {t(option.translationKey)}
                    </span>
                    {!isAll && (
                      <Badge
                        variant={option.value === 'active' ? 'default' : 'gray'}
                      >
                        {option.value}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.urgency_level?.map((urgency) => (
            <Badge
              key={urgency}
              variant="default"
              className="gap-1"
            >
              {t('filters.activeUrgency', { urgency })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleUrgencyChange(urgency)}
              />
            </Badge>
          ))}

          {filters.action_type?.map((action) => (
            <Badge
              key={action}
              variant="default"
              className="gap-1"
            >
              {t('filters.activeAction', { action })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleActionChange(action)}
              />
            </Badge>
          ))}

          {filters.batch_status?.map((status) => (
            <Badge
              key={status}
              variant="default"
              className="gap-1"
            >
              {t('filters.activeStatus', { status })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusChange(status)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
