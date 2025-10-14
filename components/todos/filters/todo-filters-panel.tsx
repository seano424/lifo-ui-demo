'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowUpDown, Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import type { TodoTabType } from '../todos-filtered-list'
import { TodoExpiryFilter } from './todo-expiry-filter'
import { TodoFiltersBar, type TodoFilterValues } from './todo-filters-bar'
import { TodoSortControls, type SortConfig } from './todo-sort-controls'

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
    <Card className={`p-6 space-y-6 ${className}`}>
      {/* Filters Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px bg-border flex-1" />
          <div className="flex items-center gap-2 text-primary font-bold px-2">
            <Filter className="w-4 h-4" />
            <h4 className="text-sm font-medium">{t('filters.filtersTitle')}</h4>
          </div>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="space-y-3">
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

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <div className="flex justify-center pt-2">
            <Button size="sm" variant="outline" onClick={clearAllFilters} className="h-8">
              {t('filters.clearAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Sort Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px bg-border flex-1" />
          <div className="flex items-center gap-2 text-primary font-bold px-2">
            <ArrowUpDown className="w-4 h-4" />
            <h4 className="text-sm font-medium">{t('filters.sortTitle')}</h4>
          </div>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="flex ">
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
