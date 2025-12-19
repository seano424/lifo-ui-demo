'use client'

import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { sortFieldOptions } from '@/lib/todo-filter-config'
import type { SortConfig, SortDirection } from './types'
import { useTranslations } from 'next-intl'

// Helper to convert snake_case to camelCase for translation keys
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

interface TodoSortDirectionProps {
  sortConfig: SortConfig
  onDirectionChange: (direction: SortDirection) => void
  onReset: () => void
}

export function TodoSortDirection({
  sortConfig,
  onDirectionChange,
  onReset,
}: TodoSortDirectionProps) {
  const selectedOption = sortFieldOptions.find(opt => opt.value === sortConfig.field)
  const isDefaultSort = sortConfig.field === 'urgency' && sortConfig.direction === 'desc'
  const t = useTranslations('todos')
  const tSort = useTranslations('todos.sort')
  const translationKey = toCamelCase(sortConfig.field)
  return (
    <div className="flex-1 p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">{t('filters.sortDirection')}</h3>
        {!isDefaultSort && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            {t('filters.reset')}
          </button>
        )}
      </div>

      {/* Direction Toggle */}
      <div className="space-y-1 mb-4">
        <label
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
            'hover:bg-gray-50',
            sortConfig.direction === 'asc' && 'bg-violet-50',
          )}
        >
          <div className="relative">
            <input
              type="radio"
              checked={sortConfig.direction === 'asc'}
              onChange={() => onDirectionChange('asc')}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                sortConfig.direction === 'asc' ? 'border-violet-500' : 'border-gray-300',
              )}
            >
              {sortConfig.direction === 'asc' && (
                <div className="w-2 h-2 rounded-full bg-violet-500" />
              )}
            </div>
          </div>
          <ArrowUp className="h-4 w-4 text-gray-600" />
          <span
            className={cn(
              'text-sm flex-1',
              sortConfig.direction === 'asc' ? 'font-medium text-violet-700' : 'text-gray-700',
            )}
          >
            {t('filters.ascending')}
          </span>
        </label>
        <label
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
            'hover:bg-gray-50',
            sortConfig.direction === 'desc' && 'bg-violet-50',
          )}
        >
          <div className="relative">
            <input
              type="radio"
              checked={sortConfig.direction === 'desc'}
              onChange={() => onDirectionChange('desc')}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                sortConfig.direction === 'desc' ? 'border-violet-500' : 'border-gray-300',
              )}
            >
              {sortConfig.direction === 'desc' && (
                <div className="w-2 h-2 rounded-full bg-violet-500" />
              )}
            </div>
          </div>
          <ArrowDown className="h-4 w-4 text-gray-600" />
          <span
            className={cn(
              'text-sm flex-1',
              sortConfig.direction === 'desc' ? 'font-medium text-violet-700' : 'text-gray-700',
            )}
          >
            {t('filters.descending')}
          </span>
        </label>
      </div>

      {/* Current Sort Display */}
      <div className="mt-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2">{t('filters.currentSort')}</h4>
        <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">{selectedOption?.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-violet-900 truncate">
                {tSort(`${translationKey}.label`)}
              </div>
              <div className="text-xs text-violet-700">
                {tSort(`${translationKey}.description`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
