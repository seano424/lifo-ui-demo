'use client'

import { TodoFiltersBarSimple, type TodoFilterValues } from './TodoFiltersBarSimple'
import { TodoSortControls, type SortConfig } from './TodoSortControls'
import { TodoSearchBar } from './TodoSearchBar'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export interface TodoFiltersState {
  // Filters
  urgency_level?: TodoFilterValues['urgency_level']
  action_type?: TodoFilterValues['action_type']
  batch_status?: TodoFilterValues['batch_status']
  product_name?: string

  // Sorting
  sortConfig?: SortConfig
}

interface TodoFiltersPanelProps {
  filters: TodoFiltersState
  onFiltersChange: (filters: TodoFiltersState) => void
  isLoading?: boolean
  className?: string
}

export function TodoFiltersPanel({
  filters,
  onFiltersChange,
  isLoading = false,
  className,
}: TodoFiltersPanelProps) {
  const handleFilterChange = (newFilters: TodoFilterValues) => {
    onFiltersChange({
      ...filters,
      ...newFilters,
    })
  }

  const handleSortChange = (sortConfig: SortConfig) => {
    onFiltersChange({
      ...filters,
      sortConfig,
    })
  }

  const handleSearchChange = (product_name: string | undefined) => {
    onFiltersChange({
      ...filters,
      product_name,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      sortConfig: filters.sortConfig, // Keep sort config or reset it too?
    })
  }

  const hasActiveFilters =
    filters.urgency_level?.length ||
    filters.action_type?.length ||
    filters.batch_status?.length ||
    filters.product_name

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <TodoSearchBar
          searchTerm={filters.product_name}
          onSearchChange={handleSearchChange}
          isLoading={isLoading}
          placeholder="Search products..."
        />

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                Active filters applied
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8"
              >
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1">
            <TodoFiltersBarSimple
              filters={{
                urgency_level: filters.urgency_level,
                action_type: filters.action_type,
                batch_status: filters.batch_status,
              }}
              onFiltersChange={handleFilterChange}
              isLoading={isLoading}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden lg:inline">
              Sort:
            </span>
            <TodoSortControls
              sortConfig={filters.sortConfig}
              onSortChange={handleSortChange}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}