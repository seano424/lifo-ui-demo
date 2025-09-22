'use client'

import { TodoActionBottomSheet } from '@/components/todos/todo-action-bottom-sheet'
import { TodoCard } from '@/components/todos/todo-card'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import type { ActionableBatch } from '@/lib/utils/todo-transformers'
import { useEffect, useMemo, useState } from 'react'
import type { SortConfig } from './filters/todo-sort-controls'

interface TodoCardListProps {
  todos: TodoItem[]
  isLoading: boolean
  isFetching: boolean
  hasNextPage?: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  sortConfig?: SortConfig
  emptyStateMessage?: string
  emptyStateIcon?: string
}

export function TodoCardList({
  todos,
  isLoading,
  isFetching,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  sortConfig,
  emptyStateMessage = 'No todos found',
  emptyStateIcon = '📋',
}: TodoCardListProps) {
  // Bottom sheet state for todo actions
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ActionableBatch | null>(null)

  // Intersection observer for infinite scroll
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

  // Sort todos based on sortConfig (client-side fallback)
  const sortedTodos = useMemo(() => {
    if (!sortConfig || !todos.length) return todos

    return [...todos].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortConfig.field) {
        case 'urgency': {
          const urgencyOrder = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
            none: 0,
          }
          aVal = urgencyOrder[a.urgency_level as keyof typeof urgencyOrder] || 0
          bVal = urgencyOrder[b.urgency_level as keyof typeof urgencyOrder] || 0
          break
        }
        case 'expiry_date':
          aVal = new Date(a.expiry_date).getTime()
          bVal = new Date(b.expiry_date).getTime()
          break
        case 'current_quantity':
          aVal = a.current_quantity
          bVal = b.current_quantity
          break
        case 'alphabetical':
          aVal = a.product_name.toLowerCase()
          bVal = b.product_name.toLowerCase()
          break
        case 'action_date':
          aVal = a.last_action_time ? new Date(a.last_action_time).getTime() : 0
          bVal = b.last_action_time ? new Date(b.last_action_time).getTime() : 0
          break
        default:
          return 0
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sortConfig.direction === 'desc' ? -result : result
      }

      const result = Number(aVal) - Number(bVal)
      return sortConfig.direction === 'desc' ? -result : result
    })
  }, [todos, sortConfig])

  const handleTodoClick = (batchId: string) => {
    // Convert TodoItem to the format expected by the bottom sheet
    const todo = sortedTodos.find(t => t.batch_id === batchId)
    if (todo) {
      // Map TodoItem to ActionableBatch format for the bottom sheet
      const mappedBatch: ActionableBatch = {
        batch_id: todo.batch_id,
        batch_number: todo.batch_number,
        product_name: todo.product_name,
        product_brand: todo.product_brand || '',
        sku: '', // Not available in TodoItem, using empty string
        expiry_date: todo.expiry_date,
        current_quantity: todo.current_quantity,
        location_code: '', // Not available in TodoItem, using empty string
        unit_price: 0, // Not available in TodoItem, using 0
        urgency_level:
          todo.urgency_level === 'none'
            ? 'low'
            : (todo.urgency_level as 'critical' | 'high' | 'medium' | 'low'),
        days_to_expiry: Math.ceil(
          (new Date(todo.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
        ai_recommendation: todo.ai_recommendation || '',
        ai_reasoning: '', // Not available in TodoItem, using empty string
        composite_score: todo.composite_score || 0,
        potential_loss: 0, // Not available in TodoItem, using 0
        discount_percent: 0, // Not available in TodoItem, using 0
        todo_state: 'needs_attention' as const, // Default state
        total_count: 1, // Default count
      }

      setSelectedBatch(mappedBatch)
      setIsBottomSheetOpen(true)
    }
  }

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setSelectedBatch(null)
  }

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

  if (!sortedTodos.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{emptyStateIcon}</div>
        <h3 className="text-lg font-semibold mb-2">{emptyStateMessage}</h3>
        <p className="text-muted-foreground">Try adjusting your filters to see more items.</p>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="space-y-4 flex flex-col">
        <div className="flex flex-col gap-12">
          {sortedTodos.map(todo => (
            <TodoCard
              key={todo.batch_id}
              todo={todo}
              onClick={() => handleTodoClick(todo.batch_id)}
            />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasNextPage && (
          <div ref={targetRef} className="flex justify-center items-center pt-8 pb-4 min-h-[60px]">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading more todos...</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground opacity-60">
                Scroll to load more ({sortedTodos.length} loaded)
              </div>
            )}
          </div>
        )}

        {/* Loading indicator when fetching */}
        {isFetching && !isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div className="text-sm text-muted-foreground">Updating...</div>
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
