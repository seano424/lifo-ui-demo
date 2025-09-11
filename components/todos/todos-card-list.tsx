'use client'

import { useEffect, useState } from 'react'
import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters, TodoItem } from '@/components/todos/todos-filtered-list'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { type ActionableBatch, useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface TodosCardListProps {
  tab: string
  filters: TodoFilters
  pageSize: number
  // Infinite query props (optional for backward compatibility)
  infiniteData?: {
    data: ActionableBatch[]
    hasNextPage?: boolean
    fetchNextPage: () => void
    isFetchingNextPage: boolean
    isLoading: boolean
    error?: Error | null
  }
}

export function TodosCardList({ tab, filters, infiniteData }: TodosCardListProps) {
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
    rootMargin: '100px', // Start loading 100px before the sentinel comes into view
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (
      isIntersecting &&
      hasMore &&
      infiniteData?.fetchNextPage &&
      !infiniteData.isFetchingNextPage
    ) {
      infiniteData.fetchNextPage()
    }
  }, [isIntersecting, hasMore, infiniteData])

  useEffect(() => {
    if (tab === 'recommendations') {
      // Use infinite data if provided, otherwise fallback to analytics response
      const batches = infiniteData?.data || analyticsResponse?.analytics?.actionable_batches || []

      // Transform actionable_batches to TodoItem format
      const actionableTodos: TodoItem[] = batches.map((batch: ActionableBatch) => ({
        batch_id: batch.batch_id,
        product_name: batch.product_name,
        expiry_date: batch.expiry_date,
        urgency: batch.urgency as TodoItem['urgency'],
        recommendation: batch.recommendation,
        reason: batch.reason,
        location_code: batch.location_code,
        current_quantity: batch.current_quantity,
        potential_loss: batch.potential_loss,
        composite_score: batch.composite_score,
        discount_percent: batch.discount_percent,
      }))

      // Apply urgency filter if set
      let filteredTodos = actionableTodos
      if (filters.urgency && filters.urgency !== 'all') {
        filteredTodos = actionableTodos.filter(todo => todo.urgency === filters.urgency)
      }

      // Apply sorting
      if (filters.sort) {
        filteredTodos.sort((a, b) => {
          const { field, direction } = filters.sort!
          let aVal: number | string, bVal: number | string

          switch (field) {
            case 'urgency': {
              const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, maintain: 0 }
              aVal = urgencyOrder[a.urgency] || 0
              bVal = urgencyOrder[b.urgency] || 0
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
            case 'potential_loss':
              aVal = a.potential_loss || 0
              bVal = b.potential_loss || 0
              break
            default:
              return 0
          }

          if (direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
      }

      setTodos(filteredTodos)
      setHasMore(infiniteData?.hasNextPage || false)
      setIsLoading(infiniteData?.isLoading || analyticsLoading)
    } else if (tab === 'recently_expired' && analyticsResponse?.analytics?.actionable_batches) {
      // Show critical items (expired items) from actionable batches
      const criticalTodos: TodoItem[] = analyticsResponse.analytics.actionable_batches
        .filter((batch: ActionableBatch) => batch.urgency === 'critical')
        .map((batch: ActionableBatch) => ({
          batch_id: batch.batch_id,
          product_name: batch.product_name,
          expiry_date: batch.expiry_date,
          urgency: batch.urgency as TodoItem['urgency'],
          recommendation: batch.recommendation,
          reason: batch.reason,
          location_code: batch.location_code,
          current_quantity: batch.current_quantity,
          potential_loss: batch.potential_loss,
          composite_score: batch.composite_score,
          discount_percent: batch.discount_percent,
        }))

      // Apply sorting (default to expiry date for recently expired)
      const sortedTodos = criticalTodos
      if (filters.sort) {
        sortedTodos.sort((a, b) => {
          const { field, direction } = filters.sort!
          let aVal: number | string, bVal: number | string

          switch (field) {
            case 'urgency': {
              const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, maintain: 0 }
              aVal = urgencyOrder[a.urgency] || 0
              bVal = urgencyOrder[b.urgency] || 0
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
            case 'potential_loss':
              aVal = a.potential_loss || 0
              bVal = b.potential_loss || 0
              break
            default:
              return 0
          }

          if (direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
      } else {
        // Default sort by expiry date (oldest first) for recently expired
        sortedTodos.sort(
          (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime(),
        )
      }

      setTodos(sortedTodos)
      setHasMore(false)
      setIsLoading(false)
    } else if (tab === 'all_active' && analyticsResponse?.analytics?.actionable_batches) {
      // Show non-critical items (active, non-expired items) from actionable batches
      const activeTodos: TodoItem[] = analyticsResponse.analytics.actionable_batches
        .filter((batch: ActionableBatch) => batch.urgency !== 'critical')
        .map((batch: ActionableBatch) => ({
          batch_id: batch.batch_id,
          product_name: batch.product_name,
          expiry_date: batch.expiry_date,
          urgency: batch.urgency as TodoItem['urgency'],
          recommendation: batch.recommendation,
          reason: batch.reason,
          location_code: batch.location_code,
          current_quantity: batch.current_quantity,
          potential_loss: batch.potential_loss,
          composite_score: batch.composite_score,
          discount_percent: batch.discount_percent,
        }))

      // Apply urgency filter if set
      let filteredTodos = activeTodos
      if (filters.urgency && filters.urgency !== 'all') {
        filteredTodos = activeTodos.filter(todo => todo.urgency === filters.urgency)
      }

      // Apply sorting
      if (filters.sort) {
        filteredTodos.sort((a, b) => {
          const { field, direction } = filters.sort!
          let aVal: number | string, bVal: number | string

          switch (field) {
            case 'urgency': {
              const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, maintain: 0 }
              aVal = urgencyOrder[a.urgency] || 0
              bVal = urgencyOrder[b.urgency] || 0
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
            case 'potential_loss':
              aVal = a.potential_loss || 0
              bVal = b.potential_loss || 0
              break
            default:
              return 0
          }

          if (direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
      } else {
        // Default sort by urgency (highest first) for all active
        filteredTodos.sort((a, b) => {
          const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, maintain: 0 }
          return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0)
        })
      }

      setTodos(filteredTodos)
      setHasMore(false)
      setIsLoading(false)
    } else if (tab === 'action_history') {
      // Mock data for action history - replace with real hook later
      setTodos([])
      setHasMore(false)
      setIsLoading(false)
    }
  }, [tab, filters, analyticsResponse, infiniteData, analyticsLoading])

  if (isLoading || analyticsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, () => (
          <div key={crypto.randomUUID()} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {tab === 'recommendations' && 'No recommendations available'}
          {tab === 'recently_expired' && 'No recently expired batches'}
          {tab === 'all_active' && 'No active batches'}
          {tab === 'action_history' && 'No action history'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todos.map(todo => (
          <TodoCard key={todo.batch_id} todo={todo} />
        ))}
      </div>

      {hasMore && (
        <div ref={targetRef} className="flex justify-center items-center pt-8 pb-4 min-h-[60px]">
          {infiniteData?.isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading more todos...</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground opacity-60">
              Scroll to load more ({todos.length} loaded)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
