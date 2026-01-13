'use client'

import { Typography } from '@/components/ui/typography'
import { useExpiringTodayTodos } from '@/hooks/use-expiry-todos-tabs'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import type { TodoFiltersState } from '../filters/types'
import { TodoCardList } from '../todo-card-list'

interface ExpiringTodayTabProps {
  filters: TodoFiltersState
  pageSize?: number
  onCountUpdate?: (count: number) => void
}

export function ExpiringTodayTab({ filters, pageSize = 20, onCountUpdate }: ExpiringTodayTabProps) {
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
  } = useExpiringTodayTodos(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
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
    const currentCount = counts?.expiring
    if (onCountUpdate && currentCount !== undefined && currentCount !== prevCountRef.current) {
      prevCountRef.current = currentCount
      onCountUpdate(currentCount)
    }
  }, [counts?.expiring, onCountUpdate])

  // Show loading state during SSR and initial client render to avoid hydration mismatch
  if (!isHydrated || isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t('expiringToday.loading')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{t('expiringToday.errorLoading')}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || tErrors('somethingWrong')}
        </p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">🔥</div>
        <Typography variant="h3" color="primary">
          {t('expiringToday.noItemsHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('expiringToday.allGood')}
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
      emptyStateMessage={t('expiringToday.noMatch')}
      emptyStateIcon="🔥"
    />
  )
}
