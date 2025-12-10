'use client'

import { Typography } from '@/components/ui/typography'
import { useExpiringTodos, useExpiringTodosWithCounts } from '@/hooks/use-todos-with-filters'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import type { TodoFiltersState } from '../filters/types'
import { TodoCardList } from '../todo-card-list'

interface ExpiringTabProps {
  filters: TodoFiltersState
  pageSize?: number
  onCountUpdate?: (count: number) => void
}

// Original component without counts (for backward compatibility)
export function ExpiringTab({ filters, pageSize = 20 }: Omit<ExpiringTabProps, 'onCountUpdate'>) {
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
  } = useExpiringTodos(
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
        <p className="text-destructive">{t('expiring.errorLoading')}</p>
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
        <p className="text-muted-foreground mt-2">{t('expiring.loading')}</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">⏰</div>
        <Typography variant="h3" color="primary">
          {t('expiring.noExpiringHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('expiring.allGood')}
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
      emptyStateMessage={t('expiring.noMatch')}
      emptyStateIcon="⏰"
    />
  )
}

// New component with counts
export function ExpiringTabWithCounts({ filters, pageSize = 20, onCountUpdate }: ExpiringTabProps) {
  const t = useTranslations('todos')
  const tErrors = useTranslations('errors.common')

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
  } = useExpiringTodosWithCounts(
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

  // Update parent component with count whenever it changes
  useEffect(() => {
    const currentCount = counts?.expiring
    if (onCountUpdate && currentCount !== undefined && currentCount !== prevCountRef.current) {
      prevCountRef.current = currentCount
      onCountUpdate(currentCount)
    }
  }, [counts?.expiring, onCountUpdate])

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{t('expiring.errorLoading')}</p>
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
        <p className="text-muted-foreground mt-2">{t('expiring.loading')}</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">⏰</div>
        <Typography variant="h3" color="primary">
          {t('expiring.noExpiringHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('expiring.allGood')}
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
      emptyStateMessage={t('expiring.noMatch')}
      emptyStateIcon="⏰"
    />
  )
}
