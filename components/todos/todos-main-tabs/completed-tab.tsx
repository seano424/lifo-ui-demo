'use client'

import { useTranslations } from 'next-intl'
import { useCompletedTodos } from '@/hooks/use-todos-with-filters'
import type { TodoFiltersState } from '../filters/todo-filters-panel'
import { TodoCardList } from '../todo-card-list'
import { Typography } from '@/components/ui/typography'

interface CompletedTabProps {
  filters: TodoFiltersState
  pageSize?: number
}

export function CompletedTab({ filters, pageSize = 20 }: CompletedTabProps) {
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
          {error?.message || tErrors('common.somethingWrong')}
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
