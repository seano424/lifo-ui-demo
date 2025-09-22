'use client'

import { usePendingTodos } from '@/hooks/use-todos-with-filters'
import { TodoCardListV2 } from '../cards/TodoCardListV2'
import type { TodoFiltersState } from '../filters/TodoFiltersPanel'

interface PendingTabProps {
  filters: TodoFiltersState
  pageSize?: number
}

export function PendingTab({ filters, pageSize = 20 }: PendingTabProps) {
  const {
    data: todos,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePendingTodos(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      batch_status: filters.batch_status,
      product_name: filters.product_name,
    },
    pageSize
  )

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading pending todos</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || 'Something went wrong'}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading pending todos...</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold mb-2">No pending todos!</h3>
        <p className="text-muted-foreground">
          {Object.values(filters).some(f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true))
            ? 'Try adjusting your filters to see more items.'
            : 'All caught up! No items need immediate attention.'
          }
        </p>
      </div>
    )
  }

  return (
    <TodoCardListV2
      todos={todos}
      isLoading={isLoading}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
      sortConfig={filters.sortConfig}
      emptyStateMessage="No pending todos match your filters"
      emptyStateIcon="📋"
    />
  )
}