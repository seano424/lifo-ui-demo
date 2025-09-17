'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BatchActionFilters,
  type BatchActionFiltersType,
} from '@/components/todos/batch-action-filters'
import { TodosCardList } from '@/components/todos/todos-card-list'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { useBatchActionsInfinite } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ActionHistoryTabProps {
  filters: TodoFilters
  pageSize?: number
}

export function ActionHistoryTab({ filters, pageSize = 20 }: ActionHistoryTabProps) {
  const activeStoreId = useActiveStoreId()

  // Local state for batch action specific filters
  const [batchActionFilters, setBatchActionFilters] = useState<BatchActionFiltersType>({
    sort: { field: 'action_date', direction: 'desc' },
  })

  const batchActionsQuery = useBatchActionsInfinite(activeStoreId || null, pageSize)

  console.log('[ActionHistoryTab] Batch actions query status:', {
    status: batchActionsQuery.status,
    fetchStatus: batchActionsQuery.fetchStatus,
    isLoading: batchActionsQuery.isLoading,
    isFetching: batchActionsQuery.isFetching,
    isStale: batchActionsQuery.isStale,
    dataUpdatedAt: batchActionsQuery.dataUpdatedAt,
    data: batchActionsQuery.data,
    error: batchActionsQuery.error,
  })

  // Force refetch when tab becomes active and data is stale
  useEffect(() => {
    if (batchActionsQuery.isStale) {
      console.log('[ActionHistoryTab] Refetching stale batch actions data')
      batchActionsQuery.refetch()
    }
  }, [batchActionsQuery.isStale, batchActionsQuery.refetch])

  const {
    data: batchActionsData,
    isLoading: isBatchActionsLoading,
    hasNextPage: hasBatchActionsNextPage,
    fetchNextPage: fetchBatchActionsNextPage,
    isFetchingNextPage: isFetchingBatchActionsNextPage,
  } = batchActionsQuery

  // Memoized batch actions processing with filtering and sorting
  const processedBatchActions = useMemo(() => {
    console.log('[ActionHistoryTab.processedBatchActions] Debug info:', {
      hasBatchActionsData: !!batchActionsData,
      hasPages: !!batchActionsData?.pages,
      pagesLength: batchActionsData?.pages?.length,
      firstPageData: batchActionsData?.pages?.[0]?.data,
      firstPageCount: batchActionsData?.pages?.[0]?.count,
      batchActionsData,
      isBatchActionsLoading,
    })

    if (!batchActionsData?.pages) {
      console.log('[ActionHistoryTab.processedBatchActions] Early return - no data')
      return []
    }

    let actions = batchActionsData.pages.flatMap(page => page.data)
    console.log('[ActionHistoryTab.processedBatchActions] Starting with actions:', actions.length)
    if (actions.length > 0) {
      console.log('[ActionHistoryTab.processedBatchActions] Sample action:', {
        action_date: actions[0].action_date,
        actual_action: actions[0].actual_action,
        action_type: actions[0].action_type,
        performed_at: actions[0].performed_at,
      })
    }

    // Apply action type filter
    if (batchActionFilters?.actionType && batchActionFilters.actionType !== 'all') {
      actions = actions.filter(action => action.actual_action === batchActionFilters.actionType)
    }

    // Apply sorting
    if (batchActionFilters?.sort) {
      actions = [...actions].sort((a, b) => {
        const { field, direction } = batchActionFilters.sort!
        const multiplier = direction === 'asc' ? 1 : -1

        switch (field) {
          case 'action_date': {
            const aDate = a.action_date ? new Date(a.action_date) : new Date(0)
            const bDate = b.action_date ? new Date(b.action_date) : new Date(0)
            return (aDate.getTime() - bDate.getTime()) * multiplier
          }
          case 'expiry_date':
            return (
              (new Date(a.expiry_date || 0).getTime() - new Date(b.expiry_date || 0).getTime()) *
              multiplier
            )
          case 'actual_action':
            return a.actual_action.localeCompare(b.actual_action) * multiplier
          case 'effectiveness': {
            const aEffectiveness =
              a.recovered_value && a.original_value ? a.recovered_value / a.original_value : 0
            const bEffectiveness =
              b.recovered_value && b.original_value ? b.recovered_value / b.original_value : 0
            return (aEffectiveness - bEffectiveness) * multiplier
          }
          default:
            return 0
        }
      })
    }

    console.log('[ActionHistoryTab.processedBatchActions] Final actions:', actions.length)
    return actions
  }, [batchActionsData, batchActionFilters, isBatchActionsLoading])

  const handleBatchActionFiltersChange = (newFilters: BatchActionFiltersType) => {
    setBatchActionFilters(newFilters)
  }

  return (
    <>
      <div className="px-4 mb-4">
        <BatchActionFilters
          filters={batchActionFilters}
          onFiltersChange={handleBatchActionFiltersChange}
          isLoading={isBatchActionsLoading}
        />
      </div>

      <div className="p-4">
        <TodosCardList
          tab="action_history"
          filters={filters}
          processedBatchActions={processedBatchActions}
          infiniteData={{
            data: [],
            hasNextPage: hasBatchActionsNextPage,
            fetchNextPage: fetchBatchActionsNextPage,
            isFetchingNextPage: isFetchingBatchActionsNextPage,
            isLoading: isBatchActionsLoading,
          }}
        />
      </div>
    </>
  )
}
