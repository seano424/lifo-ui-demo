'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import {
  filterCategories,
  filterOptions,
  isUrgencyLevel,
  isActionType,
  isBatchStatus,
} from '@/lib/todo-filter-config'
import type { TodoFiltersState } from './types'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

interface TodoFilterOptionsProps {
  categoryId: string
  filters: TodoFiltersState
  onFiltersChange: (filters: TodoFiltersState) => void
}

export function TodoFilterOptions({
  categoryId,
  filters,
  onFiltersChange,
}: TodoFilterOptionsProps) {
  const t = useTranslations('todos.filters')
  const category = filterCategories.find(c => c.id === categoryId)
  const options = filterOptions[categoryId] || []

  if (!category) return null

  const isMultiSelect = category.multiSelect

  // Get current selections for this category
  const getCurrentSelections = (): string[] => {
    switch (categoryId) {
      case 'urgency_level':
        return filters.urgency_level || []
      case 'action_type':
        return filters.action_type || []
      case 'batch_status':
        return filters.batch_status || []
      case 'expiry_range':
        return filters.expiry_range ? [filters.expiry_range] : []
      default:
        return []
    }
  }

  const currentSelections = getCurrentSelections()
  const hasNoSelections = currentSelections.length === 0

  // Handle multi-select checkbox change
  const handleMultiSelectChange = (value: string) => {
    const newFilters = { ...filters }

    switch (categoryId) {
      case 'urgency_level': {
        if (!isUrgencyLevel(value)) {
          console.error(`Invalid urgency level: ${value}`)
          return
        }
        const current = filters.urgency_level || []
        const isSelected = current.includes(value)
        const newValue = isSelected ? current.filter(v => v !== value) : [...current, value]
        newFilters.urgency_level = newValue.length > 0 ? newValue : undefined
        break
      }
      case 'action_type': {
        if (!isActionType(value)) {
          console.error(`Invalid action type: ${value}`)
          return
        }
        const current = filters.action_type || []
        const isSelected = current.includes(value)
        const newValue = isSelected ? current.filter(v => v !== value) : [...current, value]
        newFilters.action_type = newValue.length > 0 ? newValue : undefined
        break
      }
      case 'batch_status': {
        if (!isBatchStatus(value)) {
          console.error(`Invalid batch status: ${value}`)
          return
        }
        const current = filters.batch_status || []
        const isSelected = current.includes(value)
        const newValue = isSelected ? current.filter(v => v !== value) : [...current, value]
        newFilters.batch_status = newValue.length > 0 ? newValue : undefined
        break
      }
    }

    onFiltersChange(newFilters)
  }

  // Handle single-select radio change
  const handleSingleSelectChange = (value: string) => {
    const newFilters = { ...filters }

    switch (categoryId) {
      case 'expiry_range':
        newFilters.expiry_range = value
        break
    }

    onFiltersChange(newFilters)
  }

  // Handle "Clear" button for this category
  const handleClearCategory = () => {
    const newFilters = { ...filters }

    switch (categoryId) {
      case 'urgency_level':
        newFilters.urgency_level = undefined
        break
      case 'action_type':
        newFilters.action_type = undefined
        break
      case 'batch_status':
        newFilters.batch_status = undefined
        break
      case 'expiry_range':
        newFilters.expiry_range = undefined
        break
    }

    onFiltersChange(newFilters)
  }

  return (
    <div className="flex-1 p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h3" color="primary">
          {category.label}
        </Typography>
        {!hasNoSelections && (
          <button
            type="button"
            onClick={handleClearCategory}
            className="text-xs text-violet-600 hover:text-violet-700 "
          >
            {t('clear')}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {/* "All" option for multi-select */}
        {isMultiSelect && (
          <label
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
              'hover:bg-gray-50',
              hasNoSelections && 'bg-violet-50 hover:bg-violet-50',
            )}
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={hasNoSelections}
                onChange={handleClearCategory}
                className="sr-only"
              />
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                  hasNoSelections ? 'bg-violet-500 border-violet-500' : 'bg-white border-gray-300',
                )}
              >
                {hasNoSelections && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
            </div>
            <Typography variant="p" color={hasNoSelections ? 'primary' : 'muted'}>
              {t('all')}
            </Typography>
          </label>
        )}

        {/* Regular options */}
        {options.map(option => {
          const isSelected = currentSelections.includes(option.value)

          if (isMultiSelect) {
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  'hover:bg-gray-50',
                  isSelected && 'bg-violet-50 hover:bg-violet-50',
                )}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleMultiSelectChange(option.value)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-violet-500 border-violet-500' : 'bg-white border-gray-300',
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <Typography variant="p" color={isSelected ? 'primary' : 'muted'}>
                  {option.label}
                </Typography>
              </label>
            )
          }

          // Single-select (radio)
          return (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-gray-50',
                isSelected && 'bg-violet-50 hover:bg-violet-50',
              )}
            >
              <div className="relative">
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => handleSingleSelectChange(option.value)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-violet-500' : 'border-gray-300',
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                </div>
              </div>
              <Typography variant="p" color={isSelected ? 'primary' : 'muted'}>
                {option.label}
              </Typography>
            </label>
          )
        })}
      </div>
    </div>
  )
}
