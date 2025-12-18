'use client'

import { useCallback, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { TodoFilterDropdown } from './todo-filter-dropdown'
import { TodoFilterSummary } from './todo-filter-summary'
import { UnifiedSortModal } from './unified-sort-modal'
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
  const [showSort, setShowSort] = useState(false)

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

  return (
    <div className="flex flex-col gap-3">
      {/* Main row: Filter dropdown, Sort button, Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3 relative">
          {/* Filter Dropdown (NEW) */}
          <TodoFilterDropdown filters={filters} onFiltersChange={onFiltersChange} />

          {/* Sort Button */}
          <Button
            variant="outline"
            onClick={() => setShowSort(true)}
            className="gap-2 w-full md:w-auto"
          >
            <ArrowUpDown className="h-4 w-4" />
            {t('filters.sortTitle')}
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex-1 md:max-w-xs md:ml-auto">
          <TodoSearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            isLoading={isLoading}
            placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
            size="default"
          />
        </div>
      </div>

      {/* Filter Summary (NEW - replaces badge chips) */}
      <TodoFilterSummary filters={filters} onClear={handleClearFilters} />

      {/* Sort Modal (EXISTING - unchanged) */}
      <UnifiedSortModal
        isOpen={showSort}
        onClose={() => setShowSort(false)}
        sortConfig={filters.sortConfig || { field: 'urgency', direction: 'desc' }}
        onSortChange={sortConfig => {
          onFiltersChange({ ...filters, sortConfig })
        }}
        onReset={() => {
          onFiltersChange({
            ...filters,
            sortConfig: { field: 'urgency', direction: 'desc' },
          })
        }}
        isLoading={false}
      />
    </div>
  )
}
