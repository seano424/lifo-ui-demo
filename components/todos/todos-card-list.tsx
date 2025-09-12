'use client'

import { useEffect, useMemo, useState } from 'react'
import { BatchActionCard } from '@/components/todos/batch-action-card'
import type { BatchActionFiltersType } from '@/components/todos/batch-action-filters'
import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters, TodoItem } from '@/components/todos/todos-filtered-list'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import {
  type ActionableBatch,
  type BatchActionWithDetails,
  useStoreAnalytics,
} from '@/hooks/use-scoring-analytics'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createTodoSorter, validateSortConfig } from '@/lib/utils/todo-sorting'
import { memoizedBatchToTodo } from '@/lib/utils/todo-transformers'

export type { BatchActionFiltersType as BatchActionFilters }

interface TodosCardListProps {
  tab: string
  filters: TodoFilters
  // Infinite query props (optional for backward compatibility)
  infiniteData?: {
    data: ActionableBatch[]
    hasNextPage?: boolean
    fetchNextPage: () => void
    isFetchingNextPage: boolean
    isLoading: boolean
    error?: Error | null
  }
  // Pre-processed batch actions for action_history tab
  processedBatchActions?: BatchActionWithDetails[]
}

export function TodosCardList({
  tab,
  filters,
  infiniteData,
  processedBatchActions = [],
}: TodosCardListProps) {
  const activeStoreId = useActiveStoreId()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get actionable batches from store analytics for recommendations tab
  const { data: analyticsResponse, isLoading: analyticsLoading } = useStoreAnalytics(
    activeStoreId || '',
  )

  // Intersection observer for auto-loading more items
  const { targetRef, isIntersecting } = useIntersectionObserver({
    enabled: hasMore && !infiniteData?.isFetchingNextPage,
    rootMargin: DEFAULT_ROOT_MARGIN,
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasMore) {
      if (
        tab !== 'action_history' &&
        infiniteData?.fetchNextPage &&
        !infiniteData.isFetchingNextPage
      ) {
        infiniteData.fetchNextPage()
      } else if (
        tab === 'action_history' &&
        infiniteData?.fetchNextPage &&
        !infiniteData.isFetchingNextPage
      ) {
        // For action_history, the fetchNextPage is for batch actions
        infiniteData.fetchNextPage()
      }
    }
  }, [isIntersecting, hasMore, infiniteData, tab])

  // Memoized data processing to avoid expensive recalculations
  const processedTodos = useMemo(() => {
    if (tab === 'recommendations') {
      // Use infinite data for consistency - avoid mixing data sources
      if (infiniteData) {
        const batches = infiniteData.data || []
        const actionableTodos = memoizedBatchToTodo(batches)
        // Only apply sorting since urgency filtering is already done in the hook
        return applySorting(actionableTodos, filters)
      }
      // Fallback to analytics data only if infinite data is not available
      else if (analyticsResponse?.analytics?.actionable_batches) {
        const batches = analyticsResponse.analytics.actionable_batches
        const actionableTodos = memoizedBatchToTodo(batches)
        return applyFiltersAndSorting(actionableTodos, filters)
      }
    } else if (tab === 'recently_expired' && analyticsResponse?.analytics?.actionable_batches) {
      const expiredBatches = analyticsResponse.analytics.actionable_batches.filter(
        (batch: ActionableBatch) => new Date(batch.expiry_date) < new Date(),
      )

      const expiredTodos = memoizedBatchToTodo(expiredBatches)
      return applySorting(expiredTodos, filters, {
        field: 'expiry_date',
        direction: 'asc',
      })
    } else if (tab === 'all_active' && analyticsResponse?.analytics?.actionable_batches) {
      const activeBatches = analyticsResponse.analytics.actionable_batches.filter(
        (batch: ActionableBatch) => new Date(batch.expiry_date) >= new Date(),
      )

      const activeTodos = memoizedBatchToTodo(activeBatches)
      const filteredTodos = applyUrgencyFilter(activeTodos, filters)
      return applySorting(filteredTodos, filters, {
        field: 'urgency',
        direction: 'desc',
      })
    }

    return []
  }, [tab, filters, infiniteData, analyticsResponse?.analytics?.actionable_batches])

  // Update state when processed data changes
  useEffect(() => {
    if (tab !== 'action_history') {
      setTodos(processedTodos)
      setHasMore(infiniteData?.hasNextPage || false)
      setIsLoading(infiniteData?.isLoading || analyticsLoading)
    } else {
      // For action history, we don't use todos state since we use processedBatchActions directly
      setTodos([])
      setHasMore(infiniteData?.hasNextPage || false)
      setIsLoading(infiniteData?.isLoading || false)
    }
  }, [processedTodos, tab, infiniteData?.hasNextPage, infiniteData?.isLoading, analyticsLoading])

  if (isLoading || analyticsLoading) {
    return (
      <div className="flex flex-col gap-16">
        {Array.from({ length: 4 }, () => (
          <div key={crypto.randomUUID()} className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-8 flex-shrink-0 bg-muted animate-pulse" />
              <div className="w-full flex flex-col gap-2">
                <Skeleton className="h-6 w-64 bg-muted animate-pulse" />
                <Skeleton className="h-6 w-8/12 bg-muted animate-pulse" />
                <div className="flex gap-2 justify-between mt-6">
                  <Skeleton className="h-6 w-1/4 bg-muted animate-pulse" />
                  <Skeleton className="h-6 w-1/5 bg-muted animate-pulse" />
                </div>
                <div className="flex gap-2 justify-between">
                  <Skeleton className="h-6 w-2/5 bg-muted animate-pulse" />
                  <Skeleton className="h-6 w-1/4 bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Check if we have no data to display
  const hasNoData =
    tab === 'action_history' ? processedBatchActions.length === 0 : todos.length === 0

  if (hasNoData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {tab === 'recommendations' && 'No recommendations available'}
          {tab === 'recently_expired' && 'No recently expired batches'}
          {tab === 'all_active' && 'No active batches'}
          {tab === 'action_history' && 'No action history available'}
        </p>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="space-y-4 flex flex-col">
        <div className="flex flex-col gap-12">
          {tab === 'action_history'
            ? processedBatchActions.map(action => (
                <BatchActionCard key={action.action_id} action={action} />
              ))
            : todos.map(todo => <TodoCard key={todo.batch_id} todo={todo} />)}
        </div>

        {hasMore && (
          <div ref={targetRef} className="flex justify-center items-center pt-8 pb-4 min-h-[60px]">
            {infiniteData?.isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">
                  Loading more {tab === 'action_history' ? 'actions' : 'todos'}...
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground opacity-60">
                Scroll to load more (
                {tab === 'action_history' ? processedBatchActions.length : todos.length} loaded)
              </div>
            )}
          </div>
        )}
      </div>
    </InfiniteScrollErrorBoundary>
  )
}

// Helper functions for data processing
function applyFiltersAndSorting(todos: TodoItem[], filters: TodoFilters): TodoItem[] {
  const filtered = applyUrgencyFilter(todos, filters)
  return applySorting(filtered, filters)
}

function applyUrgencyFilter(todos: TodoItem[], filters: TodoFilters): TodoItem[] {
  if (filters.urgency && filters.urgency !== 'all') {
    return todos.filter(todo => todo.urgency === filters.urgency)
  }
  return todos
}

function applySorting(
  todos: TodoItem[],
  filters: TodoFilters,
  defaultSort?: Partial<{ field: string; direction: string }>,
): TodoItem[] {
  if (filters.sort) {
    const validatedSort = validateSortConfig(filters.sort)
    const sorter = createTodoSorter(validatedSort)
    return [...todos].sort(sorter)
  } else if (defaultSort) {
    const validatedSort = validateSortConfig(defaultSort)
    const sorter = createTodoSorter(validatedSort)
    return [...todos].sort(sorter)
  }
  return todos
}
