'use client'

import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import {
  type RecentlyExpired,
  useFlattenedTodosData,
  useRecentlyExpired,
} from '@/hooks/use-todos-rpc'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useEffect, useMemo } from 'react'

interface RecentlyExpiredTabProps {
  filters: TodoFilters
  pageSize?: number
}

export function RecentlyExpiredTab({ pageSize = 20 }: RecentlyExpiredTabProps) {
  const activeStoreId = useActiveStoreId()

  // Fetch recently expired items using the new enhanced hook
  const expiredQuery = useRecentlyExpired(activeStoreId || '', {
    limit: pageSize,
    enabled: !!activeStoreId,
  })

  const { isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    expiredQuery

  // Flatten the infinite query data - pass the complete query object
  const expiredItems = useFlattenedTodosData<RecentlyExpired>(expiredQuery)

  // Convert to TodoItem format for existing components
  const todos = useMemo(() => {
    return expiredItems.map((item) => ({
      batch_id: item.batch_id,
      product_name: item.product_name,
      expiry_date: item.expiry_date,
      urgency:
        item.days_since_expiry <= 3
          ? ('critical' as const)
          : item.days_since_expiry <= 7
            ? ('high' as const)
            : ('medium' as const),
      recommendation: item.ai_recommendation,
      reason: `Expired ${item.days_since_expiry} day${item.days_since_expiry === 1 ? '' : 's'} ago`,
      location_code: '', // Not provided in expired data
      current_quantity: item.current_quantity,
      potential_loss: 0, // Could calculate based on selling price if available
      composite_score: 0, // Not provided in expired data
    }))
  }, [expiredItems])

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

  // Handle todo click - could add bottom sheet for expired items if needed
  const handleTodoClick = (batchId: string) => {
    // For now, just log or could add a modal for expired item details
    console.log('Clicked expired item:', batchId)
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex flex-col gap-16">
          {Array.from({ length: 4 }, () => (
            <div
              key={crypto.randomUUID()}
              className="flex flex-col gap-4"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48 bg-muted animate-pulse" />
                    <Skeleton className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
                    <Skeleton className="h-4 w-24 bg-muted animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 py-8 text-center">
        <p className="text-destructive">
          Error loading expired items: {error.message}
        </p>
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-muted-foreground">No recently expired items</p>
          <p className="text-sm text-muted-foreground mt-2">
            Great job! No items have expired recently.
          </p>
        </div>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="p-4">
        <div className="space-y-4 flex flex-col">
          <div className="flex flex-col gap-12">
            {todos.map((todo) => (
              <TodoCard
                key={todo.batch_id}
                todo={{
                  ai_recommendation: todo.recommendation,
                  batch_id: todo.batch_id,
                  store_id: todo.location_code,
                  batch_number: todo.batch_id,
                  product_name: todo.product_name,
                  product_brand: todo.product_name,
                  current_quantity: todo.current_quantity,
                  last_action_type: null,
                  last_action_time: null,
                  completion_status: 'pending',
                  todo_state: 'ok',
                  urgency_level: 'high',
                  days_to_expiry: 0,
                  priority_order: 0,
                  expiry_date: todo.expiry_date,
                  composite_score: todo.composite_score || null,
                  last_discount_percent: null,
                  hours_since_last_action: 0,
                  total_actions_ever: 0,
                  view_refreshed_at: new Date().toISOString(),
                }}
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
                  <span className="text-sm">Loading more expired items...</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground opacity-60">
                  Scroll to load more ({todos.length} loaded)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InfiniteScrollErrorBoundary>
  )
}
