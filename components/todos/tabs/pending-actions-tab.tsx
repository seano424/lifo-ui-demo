// Fixed version of your PendingActionsTab
'use client'

import { useEffect, useMemo, useState } from 'react'
import { TodoActionBottomSheet } from '@/components/todos/todo-action-bottom-sheet'
import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { TodosFilters } from '@/components/todos/todos-filters'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import type { ActionableBatch } from '@/hooks/use-todos-rpc'
import { type PendingAction, useFlattenedTodosData, usePendingActions } from '@/hooks/use-todos-rpc'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface PendingActionsTabProps {
  filters: TodoFilters
  pageSize?: number
  onFiltersChange?: (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => void
}

export function PendingActionsTab({
  filters,
  pageSize = 20,
  onFiltersChange,
}: PendingActionsTabProps) {
  const activeStoreId = useActiveStoreId()

  // Bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ActionableBatch | null>(null)

  // Fetch pending actions using the new hook
  const pendingQuery = usePendingActions(activeStoreId || '', {
    limit: pageSize,
    enabled: !!activeStoreId,
  })

  const { isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = pendingQuery

  const pendingActions = useFlattenedTodosData<PendingAction>(pendingQuery)

  // Convert to TodoItem format for existing components
  const todos = useMemo(() => {
    return pendingActions.map(action => ({
      batch_id: action.batch_id,
      product_name: action.product_name,
      expiry_date: action.expiry_date,
      urgency: action.urgency_level as 'critical' | 'high' | 'medium' | 'low',
      recommendation: action.ai_recommendation,
      reason: `${action.days_to_expiry} days to expiry - Priority ${action.priority_order}`,
      location_code: '', // Not provided in pending actions data
      current_quantity: action.current_quantity,
      potential_loss: 0, // Calculate if needed
      composite_score: action.composite_score,
    }))
  }, [pendingActions])

  // Apply urgency filter
  const filteredTodos = useMemo(() => {
    if (filters.urgency && filters.urgency !== 'all') {
      return todos.filter(todo => todo.urgency === filters.urgency)
    }
    return todos
  }, [todos, filters.urgency])

  // Intersection observer for auto-loading more items
  const { targetRef, isIntersecting } = useIntersectionObserver({
    enabled: hasNextPage && !isFetchingNextPage,
    rootMargin: DEFAULT_ROOT_MARGIN,
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Handle todo click
  const handleTodoClick = (batchId: string) => {
    const pendingAction = pendingActions.find(action => action.batch_id === batchId)
    if (pendingAction) {
      // Convert to ActionableBatch format for the bottom sheet
      const batch: ActionableBatch = {
        batch_id: pendingAction.batch_id,
        batch_number: pendingAction.batch_number,
        product_name: pendingAction.product_name,
        product_brand: pendingAction.product_brand,
        sku: '',
        expiry_date: pendingAction.expiry_date,
        current_quantity: pendingAction.current_quantity,
        location_code: '',
        unit_price: 0,
        urgency_level: pendingAction.urgency_level as 'critical' | 'high' | 'medium' | 'low',
        days_to_expiry: pendingAction.days_to_expiry,
        ai_recommendation: pendingAction.ai_recommendation,
        ai_reasoning: `${pendingAction.days_to_expiry} days to expiry`,
        composite_score: pendingAction.composite_score,
        potential_loss: 0,
        discount_percent: 20,
        todo_state: 'needs_attention',
        total_count: 1,
      }
      setSelectedBatch(batch)
      setIsBottomSheetOpen(true)
    }
  }

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setSelectedBatch(null)
  }

  const handleFiltersChange = (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => {
    onFiltersChange?.(newFilters)
  }

  if (isLoading) {
    return (
      <div className="px-4">
        <div className="mb-4">
          <TodosFilters
            filters={{ urgency: filters.urgency, sort: filters.sort }}
            onFiltersChange={handleFiltersChange}
            isLoading={true}
          />
        </div>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-destructive">Error loading pending actions: {error.message}</p>
      </div>
    )
  }

  if (filteredTodos.length === 0) {
    return (
      <>
        <div className="px-4 mb-4">
          <TodosFilters
            filters={{ urgency: filters.urgency, sort: filters.sort }}
            onFiltersChange={handleFiltersChange}
            isLoading={false}
          />
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {filters.urgency && filters.urgency !== 'all'
              ? `No ${filters.urgency} priority pending actions`
              : 'No pending actions available'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Great job! All items have been handled or don't need immediate attention.
          </p>
        </div>
      </>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="px-4 mb-4">
        <TodosFilters
          filters={{ urgency: filters.urgency, sort: filters.sort }}
          onFiltersChange={handleFiltersChange}
          isLoading={false}
        />
      </div>

      <div className="p-4">
        <div className="space-y-4 flex flex-col">
          <div className="flex flex-col gap-12">
            {filteredTodos.map(todo => (
              <TodoCard
                key={todo.batch_id}
                todo={todo}
                onClick={() => handleTodoClick(todo.batch_id)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div
              ref={targetRef}
              className="flex justify-center items-center pt-8 pb-4 min-h-[60px]"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading more pending actions...</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground opacity-60">
                  Scroll to load more ({filteredTodos.length} loaded)
                </div>
              )}
            </div>
          )}
        </div>
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
