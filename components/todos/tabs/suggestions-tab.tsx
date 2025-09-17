'use client'

import { TodosCardList } from '@/components/todos/todos-card-list'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { TodosFilters } from '@/components/todos/todos-filters'
import { useTodosInfinite } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface SuggestionsTabProps {
  filters: TodoFilters
  pageSize?: number
  onFiltersChange?: (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => void
}

export function SuggestionsTab({ filters, pageSize = 20, onFiltersChange }: SuggestionsTabProps) {
  const activeStoreId = useActiveStoreId()

  // Primary data source: infinite query for suggestions
  const {
    data: infiniteData,
    isLoading: isLoadingInfinite,
    error: infiniteError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTodosInfinite(activeStoreId || '', pageSize, '7d', undefined, {
    urgency: filters.urgency,
  })

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
        <TodosCardList
          tab="suggestions"
          filters={filters}
          infiniteData={{
            data: infiniteData?.pages?.flatMap(page => page.data) || [],
            hasNextPage,
            fetchNextPage,
            isFetchingNextPage,
            isLoading: isLoadingInfinite,
            error: infiniteError,
          }}
        />
      </div>
    </>
  )
}
