'use client'

import { useEffect, useMemo, useState } from 'react'
import { BatchActionCard } from '@/components/todos/batch-action-card'
import type { BatchActionFiltersType } from '@/components/todos/batch-action-filters'
import { TodoActionBottomSheet } from '@/components/todos/todo-action-bottom-sheet'
import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters, TodoItem } from '@/components/todos/todos-filtered-list'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import {
  type ActionableBatch,
  type BatchActionWithDetails,
  useActionableBatches,
} from '@/hooks/use-todos-rpc'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createTodoSorter, validateSortConfig } from '@/lib/utils/todo-sorting'
import { memoizedRpcBatchToTodo } from '@/lib/utils/todo-transformers'

export type { BatchActionFiltersType as BatchActionFilters }

interface TodosCardListProps {
  tab: string
  filters: TodoFilters
  // Pre-processed batch actions for action_history tab
  processedBatchActions?: BatchActionWithDetails[]
  // Action history infinite scroll props
  actionHistoryInfinite?: {
    hasNextPage?: boolean
    fetchNextPage: () => void
    isFetchingNextPage: boolean
    isLoading: boolean
  }
}

export function TodosCardList({
  tab,
  filters,
  processedBatchActions = [],
  actionHistoryInfinite,
}: TodosCardListProps) {
  console.log('🃏 TodosCardList render:', {
    tab,
    urgency: filters.urgency,
    timestamp: Date.now(),
  })

  const activeStoreId = useActiveStoreId()

  // Diagnostic: Check for mount/unmount cycles
  useEffect(() => {
    console.log('🔄 TodosCardList mounted/updated:', {
      tab,
      activeStoreId,
      filtersUrgency: filters.urgency,
    })

    return () => {
      console.log('🔄 TodosCardList cleanup:', { tab })
    }
  }, [tab, activeStoreId, filters.urgency])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ActionableBatch | null>(null)

  // Handler for opening the bottom sheet with selected batch
  const handleTodoClick = (batchId: string) => {
    // Always use RPC data
    const allBatches = rpcActionableBatches.data?.pages?.flat() || []
    const batch = allBatches.find(b => b.batch_id === batchId)

    if (batch) {
      setSelectedBatch(batch)
      setIsBottomSheetOpen(true)
    }
  }

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setSelectedBatch(null)
  }

  // Only use RPC hooks for non-action-history tabs
  const shouldFetchRPC = !!activeStoreId && tab !== 'action_history'

  const rpcActionableBatches = useActionableBatches(activeStoreId || '', {
    enabled: shouldFetchRPC,
    urgencyFilter:
      filters.urgency === 'all' || filters.urgency === 'maintain'
        ? undefined
        : (filters.urgency as 'critical' | 'high' | 'medium' | 'low'),
  })

  // Only log when actually fetching RPC data
  if (shouldFetchRPC) {
    console.log('🟢 RPC ActionableBatches:', {
      dataCount: rpcActionableBatches.data?.pages?.flat().length ?? 0,
      hasNextPage: rpcActionableBatches.hasNextPage,
      currentTab: tab,
      filters,
    })
  }

  // Intersection observer for auto-loading more items
  const { targetRef, isIntersecting } = useIntersectionObserver({
    enabled:
      hasMore &&
      !(tab === 'action_history'
        ? actionHistoryInfinite?.isFetchingNextPage
        : rpcActionableBatches.isFetchingNextPage),
    rootMargin: DEFAULT_ROOT_MARGIN,
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasMore) {
      if (
        tab === 'action_history' &&
        actionHistoryInfinite?.fetchNextPage &&
        !actionHistoryInfinite.isFetchingNextPage
      ) {
        actionHistoryInfinite.fetchNextPage()
      } else if (tab !== 'action_history' && !rpcActionableBatches.isFetchingNextPage) {
        rpcActionableBatches.fetchNextPage()
      }
    }
  }, [isIntersecting, hasMore, tab, actionHistoryInfinite, rpcActionableBatches])

  // Memoized data processing to avoid expensive recalculations
  const processedTodos = useMemo(() => {
    // Get all batches from RPC
    const allBatches = rpcActionableBatches.data?.pages?.flat() || []

    if (tab === 'suggestions') {
      // Filter for suggestions (urgent_action or needs_attention)
      const suggestionBatches = allBatches.filter(
        batch => batch.todo_state === 'urgent_action' || batch.todo_state === 'needs_attention',
      )
      const actionableTodos = memoizedRpcBatchToTodo(suggestionBatches)
      return applySorting(actionableTodos, filters)
    } else if (tab === 'recently_expired') {
      // Filter for expired items
      const expiredBatches = allBatches.filter(batch => batch.todo_state === 'expired')
      const expiredTodos = memoizedRpcBatchToTodo(expiredBatches)
      return applySorting(expiredTodos, filters, {
        field: 'expiry_date',
        direction: 'asc',
      })
    } else if (tab === 'all_active') {
      // Filter for active (non-expired) items
      const activeBatches = allBatches.filter(batch => batch.todo_state !== 'expired')
      const activeTodos = memoizedRpcBatchToTodo(activeBatches)
      const filteredTodos = applyUrgencyFilter(activeTodos, filters)
      return applySorting(filteredTodos, filters, {
        field: 'urgency',
        direction: 'desc',
      })
    }

    return []
  }, [tab, filters, rpcActionableBatches.data])

  // Update state when processed data changes
  useEffect(() => {
    if (tab !== 'action_history') {
      setTodos(processedTodos)
      setHasMore(rpcActionableBatches.hasNextPage || false)
      setIsLoading(rpcActionableBatches.isLoading)
    } else {
      // For action history, we use processedBatchActions directly from props
      setTodos([])
      setHasMore(actionHistoryInfinite?.hasNextPage || false)
      setIsLoading(actionHistoryInfinite?.isLoading || false)
    }
  }, [
    processedTodos,
    tab,
    rpcActionableBatches.hasNextPage,
    rpcActionableBatches.isLoading,
    actionHistoryInfinite,
  ])

  if (isLoading) {
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
          {tab === 'suggestions' && 'No suggestions available'}
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
            : todos.map(todo => (
                <TodoCard
                  key={todo.batch_id}
                  todo={todo}
                  onClick={() => handleTodoClick(todo.batch_id)}
                />
              ))}
        </div>

        {hasMore && (
          <div ref={targetRef} className="flex justify-center items-center pt-8 pb-4 min-h-[60px]">
            {(
              tab === 'action_history'
                ? actionHistoryInfinite?.isFetchingNextPage
                : rpcActionableBatches.isFetchingNextPage
            ) ? (
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

      {/* Todo Action Bottom Sheet */}
      <TodoActionBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={handleCloseBottomSheet}
        selectedBatch={selectedBatch}
      />
    </InfiniteScrollErrorBoundary>
  )
}

// Helper functions for data processing
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
