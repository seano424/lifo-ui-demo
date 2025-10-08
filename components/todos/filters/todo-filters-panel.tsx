'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { TodoFiltersBar, type TodoFilterValues } from './todo-filters-bar'
import { TodoSearchBar } from './todo-search-bar'
import { TodoSortControls, type SortConfig } from './todo-sort-controls'
import { TodoExpiryFilter } from './todo-expiry-filter'
import type { TodoTabType } from '../todos-filtered-list'

export interface TodoFiltersState {
  // Filters
  urgency_level?: TodoFilterValues['urgency_level']
  action_type?: TodoFilterValues['action_type']
  batch_status?: TodoFilterValues['batch_status']
  product_name?: string
  days_to_expiry_min?: number
  days_to_expiry_max?: number

  // Sorting
  sortConfig?: SortConfig
}

interface TodoFiltersPanelProps {
  filters: TodoFiltersState
  onFiltersChange: (
    filters: TodoFiltersState | ((prevFilters: TodoFiltersState) => TodoFiltersState),
  ) => void
  isLoading?: boolean
  className?: string
  activeTab?: TodoTabType
}

export function TodoFiltersPanel({
  filters,
  onFiltersChange,
  isLoading = false,
  className,
  activeTab = 'pending',
}: TodoFiltersPanelProps) {
  const t = useTranslations('todos')

  const handleFilterChange = useCallback(
    (newFilters: TodoFilterValues) => {
      onFiltersChange((prevFilters: TodoFiltersState) => ({
        ...prevFilters,
        ...newFilters,
      }))
    },
    [onFiltersChange],
  )

  const handleSortChange = useCallback(
    (sortConfig: SortConfig) => {
      onFiltersChange((prevFilters: TodoFiltersState) => ({
        ...prevFilters,
        sortConfig,
      }))
    },
    [onFiltersChange],
  )

  const handleSearchChange = useCallback(
    (product_name: string | undefined) => {
      onFiltersChange((prevFilters: TodoFiltersState) => ({
        ...prevFilters,
        product_name,
      }))
    },
    [onFiltersChange],
  )

  const handleExpiryChange = useCallback(
    (value: { min?: number; max?: number }) => {
      onFiltersChange((prevFilters: TodoFiltersState) => ({
        ...prevFilters,
        days_to_expiry_min: value.min,
        days_to_expiry_max: value.max,
      }))
    },
    [onFiltersChange],
  )

  const clearAllFilters = useCallback(() => {
    onFiltersChange((prevFilters: TodoFiltersState) => ({
      sortConfig: prevFilters.sortConfig, // Keep sort config
    }))
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.urgency_level?.length ||
    filters.action_type?.length ||
    filters.batch_status?.length ||
    filters.product_name ||
    filters.days_to_expiry_min !== undefined ||
    filters.days_to_expiry_max !== undefined

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <TodoSearchBar
          searchTerm={filters.product_name}
          onSearchChange={handleSearchChange}
          isLoading={isLoading}
          placeholder={t('filters.searchPlaceholder')}
        />

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {t('filters.activeFilters')}
              </span>
              <Button size="sm" variant="secondary" onClick={clearAllFilters} className="h-8">
                {t('filters.clearAll')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-2 items-start justify-between">
          <div className="flex-1 flex flex-wrap gap-2">
            <TodoFiltersBar
              filters={{
                urgency_level: filters.urgency_level,
                action_type: filters.action_type,
                batch_status: filters.batch_status,
              }}
              onFiltersChange={handleFilterChange}
              isLoading={isLoading}
            />
            <TodoExpiryFilter
              activeTab={activeTab}
              daysToExpiryMin={filters.days_to_expiry_min}
              daysToExpiryMax={filters.days_to_expiry_max}
              onExpiryChange={handleExpiryChange}
              isLoading={isLoading}
            />
          </div>

          <TodoSortControls
            sortConfig={filters.sortConfig}
            onSortChange={handleSortChange}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Card>
  )
}
