'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { TodoFilterDropdown } from './todo-filter-dropdown'
import { TodoFilterSummary } from './todo-filter-summary'
import { TodoSortDropdown } from './todo-sort-dropdown'
import { TodoSearchBar } from './todo-search-bar'
import type { TodoFiltersState } from './types'

interface UnifiedSearchFiltersBarV2Props {
  searchTerm?: string
  onSearchChange: (searchTerm: string | undefined) => void
  onFiltersClick?: () => void
  onSortClick?: () => void
  isLoading?: boolean
  placeholder?: string
  filters: TodoFiltersState
  onFiltersChange: (filters: TodoFiltersState) => void
}

export function UnifiedSearchFiltersBarV2({
  searchTerm,
  onSearchChange,
  isLoading = false,
  placeholder,
  filters,
  onFiltersChange,
}: UnifiedSearchFiltersBarV2Props) {
  const t = useTranslations('todos')

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      ...filters,
      urgency_level: undefined,
      action_type: undefined,
      batch_status: undefined,
      expiry_range: undefined,
      // Preserve search and sort
    })
  }, [filters, onFiltersChange])

  const handleResetSort = useCallback(() => {
    onFiltersChange({
      ...filters,
      sortConfig: { field: 'urgency', direction: 'desc' },
    })
  }, [filters, onFiltersChange])

  return (
    <div className="flex flex-col gap-3">
      {/* Main row: Filter dropdown, Sort dropdown, Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 relative">
          {/* Filter Dropdown */}
          <TodoFilterDropdown filters={filters} onFiltersChange={onFiltersChange} />

          {/* Sort Dropdown */}
          <TodoSortDropdown
            sortConfig={filters.sortConfig || { field: 'urgency', direction: 'desc' }}
            onSortChange={sortConfig => {
              onFiltersChange({ ...filters, sortConfig })
            }}
            onReset={handleResetSort}
          />
        </div>

        {/* Search Input */}
        <div className="w-full md:max-w-sm sm:ml-auto">
          <TodoSearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            isLoading={isLoading}
            placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
            size="default"
          />
        </div>
      </div>

      {/* Filter Summary */}
      <TodoFilterSummary filters={filters} onClear={handleClearFilters} />
    </div>
  )
}
