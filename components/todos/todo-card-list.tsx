'use client'

import { BatchModal } from '@/components/batches/batch-modal'
import { TodoCardV3 } from '@/components/todos/todo-card-v3'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrency } from '@/hooks/use-currency'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { Typography } from '../ui/typography'
import type { SortConfig } from './filters/types'

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
  const t = useTranslations('todos')
  const currencySymbol = useCurrency()

  // Bottom sheet state for todo actions
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<TodoItem | null>(null)

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
          aVal = a.expiry_date ? parseISODateAsLocal(a.expiry_date).getTime() : 0
          bVal = b.expiry_date ? parseISODateAsLocal(b.expiry_date).getTime() : 0
          break
        case 'current_quantity':
          aVal = a.current_quantity || 0
          bVal = b.current_quantity || 0
          break
        case 'alphabetical':
          aVal = (a.product_name || '').toLowerCase()
          bVal = (b.product_name || '').toLowerCase()
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
    const todo = sortedTodos.find(t => t.batch_id === batchId)
    if (todo) {
      setSelectedBatch(todo)
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
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">{emptyStateIcon}</div>
        <Typography variant="h3" color="primary">
          {emptyStateMessage}
        </Typography>
        <Typography variant="p" color="muted">
          {t('list.adjustFilters')}
        </Typography>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="flex flex-col gap-8 pb-80">
        <div className="flex flex-col gap-8 scroll-m-96">
          {sortedTodos.map(todo => (
            <TodoCardV3
              key={todo.batch_id}
              todo={todo}
              currencySymbol={currencySymbol}
              onClick={() => handleTodoClick(todo.batch_id || '')}
            />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasNextPage && (
          <div ref={targetRef} className="flex justify-center items-center pt-8 pb-4 min-h-[60px]">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{t('list.loadingMore')}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground opacity-60">
                {t('list.scrollToLoad', { count: sortedTodos.length })}
              </div>
            )}
          </div>
        )}

        {/* Loading indicator when fetching */}
        {isFetching && !isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div className="text-sm text-muted-foreground">{t('list.updating')}</div>
          </div>
        )}
      </div>

      {/* Batch Modal */}
      <BatchModal
        isOpen={isBottomSheetOpen}
        onClose={handleCloseBottomSheet}
        batch={selectedBatch}
        currencySymbol={currencySymbol}
      />
    </InfiniteScrollErrorBoundary>
  )
}
