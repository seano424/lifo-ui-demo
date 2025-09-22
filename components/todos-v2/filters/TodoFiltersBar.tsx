'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  BatchStatus,
  TodoActionType,
  TodoUrgencyLevel,
} from '@/lib/queries/todos-rpc-v2'
import { X } from 'lucide-react'
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
  label: string
  color: string
}[] = [
  { value: 'all', label: 'All Urgency Levels', color: 'gray' },
  { value: 'critical', label: 'Critical', color: 'destructive' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'none', label: 'None', color: 'gray' },
]

const ACTION_OPTIONS: {
  value: TodoActionType | 'all'
  label: string
  icon?: string
}[] = [
  { value: 'all', label: 'All Actions', icon: '🎯' },
  { value: 'discount', label: 'Discount', icon: '🏷️' },
  { value: 'donate', label: 'Donate', icon: '🤝' },
  { value: 'donate_prepared', label: 'Donate Prepared', icon: '📦' },
  { value: 'dispose', label: 'Dispose', icon: '🗑️' },
  { value: 'maintain', label: 'Maintain', icon: '📌' },
  { value: 'ignored', label: 'Ignored', icon: '🚫' },
  { value: 'sold', label: 'Sold', icon: '💰' },
]

const BATCH_STATUS_OPTIONS: { value: BatchStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
]

export function TodoFiltersBar({
  filters,
  onFiltersChange,
  isLoading = false,
}: TodoFiltersBarProps) {
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

  const clearFilter = (type: keyof TodoFilterValues) => {
    onFiltersChange({
      ...filters,
      [type]: undefined,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.urgency_level?.length ||
    filters.action_type?.length ||
    filters.batch_status?.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Urgency Filter */}
        <Select disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={
                filters.urgency_level?.length
                  ? `Urgency (${filters.urgency_level.length})`
                  : 'Filter by urgency'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 space-y-1">
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
                    onClick={(e) => {
                      e.preventDefault()
                      handleUrgencyChange(option.value)
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        readOnly
                        className="rounded pointer-events-none"
                      />
                      {option.label}
                    </span>
                    {!isAll && (
                      <Badge
                        variant={option.color as any}
                        className="ml-2"
                      >
                        {option.value}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </SelectContent>
        </Select>

        {/* Action Type Filter */}
        <Select disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={
                filters.action_type?.length
                  ? `Actions (${filters.action_type.length})`
                  : 'Filter by action'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 space-y-1">
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
                    onClick={(e) => {
                      e.preventDefault()
                      handleActionChange(option.value)
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        readOnly
                        className="rounded pointer-events-none"
                      />
                      <span className="flex items-center gap-1">
                        {option.icon && <span>{option.icon}</span>}
                        {option.label}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </SelectContent>
        </Select>

        {/* Batch Status Filter */}
        <Select disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={
                filters.batch_status?.length
                  ? `Status (${filters.batch_status.length})`
                  : 'Filter by status'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 space-y-1">
              {BATCH_STATUS_OPTIONS.map((option) => {
                const isAll = option.value === 'all'
                const isSelected = isAll
                  ? !filters.batch_status?.length
                  : filters.batch_status?.includes(option.value as BatchStatus)

                return (
                  <div
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault()
                      handleStatusChange(option.value)
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={isAll ? 'radio' : 'checkbox'}
                        checked={isSelected || false}
                        readOnly
                        className="rounded pointer-events-none"
                      />
                      {option.label}
                    </span>
                    {!isAll && (
                      <Badge
                        variant={option.value === 'active' ? 'success' : 'gray'}
                      >
                        {option.value}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </SelectContent>
        </Select>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-10"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.urgency_level?.map((urgency) => (
            <Badge
              key={urgency}
              variant="secondary"
              className="gap-1"
            >
              Urgency: {urgency}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleUrgencyChange(urgency)}
              />
            </Badge>
          ))}

          {filters.action_type?.map((action) => (
            <Badge
              key={action}
              variant="secondary"
              className="gap-1"
            >
              Action: {action}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleActionChange(action)}
              />
            </Badge>
          ))}

          {filters.batch_status?.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1"
            >
              Status: {status}
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
