'use client'

import { useEffect, useState } from 'react'
import { TodoCard } from '@/components/todos/todo-card'
import type { TodoFilters, TodoItem } from '@/components/todos/todos-filtered-list'
import { Button } from '@/components/ui/button'
import { type ActionableBatch, useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface TodosCardListProps {
  tab: string
  filters: TodoFilters
  pageSize: number
}

export function TodosCardList({ tab, filters }: TodosCardListProps) {
  const activeStoreId = useActiveStoreId()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get actionable batches from store analytics for recommendations tab
  const { data: analyticsResponse, isLoading: analyticsLoading } = useStoreAnalytics(
    activeStoreId || '',
  )

  useEffect(() => {
    if (tab === 'recommendations' && analyticsResponse?.analytics?.actionable_batches) {
      // Transform actionable_batches to TodoItem format
      const actionableTodos: TodoItem[] = analyticsResponse.analytics.actionable_batches.map(
        (batch: ActionableBatch) => ({
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
        }),
      )

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
      setHasMore(false) // For now, no pagination on actionable batches
      setIsLoading(false)
    } else if (tab === 'recently_expired') {
      // Mock data for recently expired - replace with real hook later
      setTodos([])
      setHasMore(false)
      setIsLoading(false)
    } else if (tab === 'all_active') {
      // Mock data for all active - replace with real hook later
      setTodos([])
      setHasMore(false)
      setIsLoading(false)
    } else if (tab === 'action_history') {
      // Mock data for action history - replace with real hook later
      setTodos([])
      setHasMore(false)
      setIsLoading(false)
    }
  }, [tab, filters, analyticsResponse])

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
        <div className="flex justify-center pt-6">
          <Button variant="outline" size="lg">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
