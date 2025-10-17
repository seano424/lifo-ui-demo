'use client'

import { Typography } from '@/components/ui/typography'
import { usePendingTodos } from '@/hooks/use-todos-with-filters'
import { useTranslations } from 'next-intl'
import type { TodoFiltersState } from '../filters/types'
import { TodoCardList } from '../todo-card-list'

interface PendingTabProps {
  filters: TodoFiltersState
  pageSize?: number
}

export function PendingTab({ filters, pageSize = 20 }: PendingTabProps) {
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
  } = usePendingTodos(
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
      <div className="text-center py-8">
        <p className="text-destructive">{t('pending.errorLoading')}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || tErrors('common.somethingWrong')}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t('pending.loading')}</p>
      </div>
    )
  }

  if (!todos?.length) {
    return (
      <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">🎉</div>
        <Typography variant="h3" color="primary">
          {t('pending.noPendingHeading')}
        </Typography>
        <Typography variant="p" color="muted">
          {Object.values(filters).some(
            f => f !== undefined && (Array.isArray(f) ? f.length > 0 : true),
          )
            ? t('emptyStateWithFilters')
            : t('pending.allCaughtUp')}
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
      emptyStateMessage={t('pending.noMatch')}
      emptyStateIcon="📋"
    />
  )
}
