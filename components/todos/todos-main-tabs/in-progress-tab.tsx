'use client'

import { Typography } from '@/components/ui/typography'
import { useInProgressTodos } from '@/hooks/use-todos-with-filters'
import type { TodoFiltersState } from '../filters/todo-filters-panel'
import { TodoCardList } from '../todo-card-list'

interface InProgressTabProps {
  filters: TodoFiltersState
  pageSize?: number
}

export function InProgressTab({ filters, pageSize = 20 }: InProgressTabProps) {
  const {
    data: todos,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInProgressTodos(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      batch_status: filters.batch_status,
      product_name: filters.product_name,
    },
    pageSize,
  )

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading in-progress todos</p>
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
        <p className="text-muted-foreground mt-2">Loading in-progress todos...</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚡</div>
        <Typography variant="h3" color="primary">
          No todos in progress
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? 'Try adjusting your filters to see more items.'
            : 'No items are currently being worked on.'}
        </Typography>
      </div>
    )
  }

  return (
    <TodoCardList
      todos={todos}
      isLoading={isLoading}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
      sortConfig={filters.sortConfig}
      emptyStateMessage="No in-progress todos match your filters"
      emptyStateIcon="⚡"
    />
  )
}
