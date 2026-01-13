'use client'

import { Typography } from '@/components/ui/typography'
import { useExpiredTodos, useExpiredTodosWithCounts } from '@/hooks/use-todos-with-filters'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import type { TodoFiltersState } from '../filters/types'
import { TodoCardList } from '../todo-card-list'

interface ExpiredTabProps {
  filters: TodoFiltersState
  pageSize?: number
  onCountUpdate?: (count: number) => void
}

// Original component without counts (for backward compatibility)
export function ExpiredTab({ filters, pageSize = 20 }: Omit<ExpiredTabProps, 'onCountUpdate'>) {
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
  } = useExpiredTodos(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      product_name: filters.product_name,
      days_to_expiry_min: filters.days_to_expiry_min,
      days_to_expiry_max: filters.days_to_expiry_max,
    },
    pageSize,
  )

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{t('expired.errorLoading')}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || tErrors('somethingWrong')}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t('expired.loading')}</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">📦</div>
        <Typography variant="h3" color="primary">
          {t('expired.noExpiredHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('expired.allCleared')}
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
      emptyStateMessage={t('expired.noMatch')}
      emptyStateIcon="📦"
    />
  )
}

// New component with counts
export function ExpiredTabWithCounts({ filters, pageSize = 20, onCountUpdate }: ExpiredTabProps) {
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
  } = useExpiredTodosWithCounts(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      product_name: filters.product_name,
      days_to_expiry_min: filters.days_to_expiry_min,
      days_to_expiry_max: filters.days_to_expiry_max,
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
    const currentCount = counts?.expired
    if (onCountUpdate && currentCount !== undefined && currentCount !== prevCountRef.current) {
      prevCountRef.current = currentCount
      onCountUpdate(currentCount)
    }
  }, [counts?.expired, onCountUpdate])

  // Show loading state during SSR and initial client render to avoid hydration mismatch
  if (!isHydrated || isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t('expired.loading')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{t('expired.errorLoading')}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || tErrors('somethingWrong')}
        </p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">📦</div>
        <Typography variant="h3" color="primary">
          {t('expired.noExpiredHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('expired.allCleared')}
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
      emptyStateMessage={t('expired.noMatch')}
      emptyStateIcon="📦"
    />
  )
}
