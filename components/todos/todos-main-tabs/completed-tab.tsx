'use client'

import { Typography } from '@/components/ui/typography'
import { useCompletedTodos, useCompletedTodosWithCounts } from '@/hooks/use-todos-with-filters'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import type { TodoFiltersState } from '../filters/types'
import { TodoCardList } from '../todo-card-list'

interface CompletedTabProps {
  filters: TodoFiltersState
  pageSize?: number
  onCountUpdate?: (count: number) => void
}

// Original component without counts (for backward compatibility)
export function CompletedTab({ filters, pageSize = 20 }: Omit<CompletedTabProps, 'onCountUpdate'>) {
  const t = useTranslations('todos')
  const tErrors = useTranslations('errors.common')

  const {
    data: todos,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCompletedTodos(
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
      <div className="text-center py-8 flex flex-col items-center justify-center gap-4">
        <Typography variant="p" color="destructive">
          {t('completed.errorLoading')}
        </Typography>
        <Typography variant="p" color="muted">
          {error?.message || tErrors('somethingWrong')}
        </Typography>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <Typography variant="p" color="muted">
          {t('completed.loading')}
        </Typography>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">✅</div>
        <Typography variant="h3" color="primary">
          {t('completed.noCompletedHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('completed.notFound')}
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
      emptyStateMessage={t('completed.noMatch')}
      emptyStateIcon="✅"
    />
  )
}

// New component with counts
export function CompletedTabWithCounts({
  filters,
  pageSize = 20,
  onCountUpdate,
}: CompletedTabProps) {
  const t = useTranslations('todos')
  const tErrors = useTranslations('errors.common')

  // Track hydration to avoid SSR/client mismatch
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    data: todos,
    counts,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCompletedTodosWithCounts(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      batch_status: filters.batch_status,
      product_name: filters.product_name,
    },
    pageSize,
  )

  // Track previous count to avoid unnecessary updates
  const prevCountRef = useRef<number | undefined>(undefined)

  // Set hydration flag
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Update parent component with count whenever it changes
  useEffect(() => {
    const currentCount = counts?.completed
    if (onCountUpdate && currentCount !== undefined && currentCount !== prevCountRef.current) {
      prevCountRef.current = currentCount
      onCountUpdate(currentCount)
    }
  }, [counts?.completed, onCountUpdate])

  // Show loading state during SSR and initial client render to avoid hydration mismatch
  if (!isHydrated || isLoading) {
    return (
      <div className="text-center min-h-screen pt-20 flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <Typography variant="p" color="muted">
          {t('completed.loading')}
        </Typography>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center min-h-screen pt-20 flex flex-col items-center gap-4">
        <Typography variant="p" color="destructive">
          {t('completed.errorLoading')}
        </Typography>
        <Typography variant="p" color="muted">
          {error?.message || tErrors('somethingWrong')}
        </Typography>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center min-h-screen pt-20 flex flex-col items-center gap-4">
        <div className="text-6xl mb-4">✅</div>
        <Typography variant="h3" color="primary">
          {t('completed.noCompletedHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('completed.notFound')}
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
      emptyStateMessage={t('completed.noMatch')}
      emptyStateIcon="✅"
    />
  )
}
