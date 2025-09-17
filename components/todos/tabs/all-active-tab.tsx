'use client'

import { TodosCardList } from '@/components/todos/todos-card-list'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { TodosFilters } from '@/components/todos/todos-filters'

interface AllActiveTabProps {
  filters: TodoFilters
  onFiltersChange?: (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => void
}

export function AllActiveTab({ filters, onFiltersChange }: AllActiveTabProps) {
  const handleFiltersChange = (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => {
    onFiltersChange?.(newFilters)
  }

  return (
    <>
      <div className="px-4 mb-4">
        <TodosFilters
          filters={{
            urgency: filters.urgency,
            sort: filters.sort,
          }}
          onFiltersChange={handleFiltersChange}
          isLoading={false}
        />
      </div>

      <div className="p-4">
        <TodosCardList tab="all_active" filters={filters} />
      </div>
    </>
  )
}
