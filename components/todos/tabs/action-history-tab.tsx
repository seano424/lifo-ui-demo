'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BatchActionFilters,
  type BatchActionFiltersType,
} from '@/components/todos/batch-action-filters'
import { TodosCardList } from '@/components/todos/todos-card-list'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import {
  useActionHistory,
  type BatchActionWithDetails,
  type ActionType,
} from '@/hooks/use-todos-rpc'
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

  const batchActionsQuery = useActionHistory(activeStoreId || '', { limit: pageSize })

  // Force refetch when tab becomes active and data is stale
  useEffect(() => {
    if (batchActionsQuery.isStale) {
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
    if (!batchActionsData?.pages) {
      return []
    }

    let actions = batchActionsData.pages.flat()
    if (actions.length > 0) {
    }

    // Apply action type filter
    if (batchActionFilters?.actionType && batchActionFilters.actionType !== 'all') {
      actions = actions.filter(action => action.action_type === batchActionFilters.actionType)
    }

    // Apply sorting
    if (batchActionFilters?.sort) {
      actions = [...actions].sort((a, b) => {
        const { field, direction } = batchActionFilters.sort!
        const multiplier = direction === 'asc' ? 1 : -1

        switch (field) {
          case 'action_date': {
            const aDate = a.performed_at ? new Date(a.performed_at) : new Date(0)
            const bDate = b.performed_at ? new Date(b.performed_at) : new Date(0)
            return (aDate.getTime() - bDate.getTime()) * multiplier
          }
          case 'expiry_date':
            return (
              (new Date(a.performed_at || 0).getTime() - new Date(b.performed_at || 0).getTime()) *
              multiplier
            )
          case 'actual_action':
            return a.action_type.localeCompare(b.action_type) * multiplier
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

    // Transform ActionHistory to BatchActionWithDetails format
    return actions.map(
      (action): BatchActionWithDetails =>
        ({
          ...action,
          action_id: action.entry_id,
          action_date: action.performed_at,
          actual_action: action.action_type as ActionType,
          original_value: action.original_value,
          recovered_value: action.recovered_value,
          product_name: action.product_name,
          batch_number: action.batch_number,
          sku: '',
          expiry_date: '',
          location_code: '',
          recipient_name: action.recipient_name,
          recipient_type: undefined,
          original_price: undefined,
          new_price: undefined,
        }) as BatchActionWithDetails,
    )
  }, [batchActionsData, batchActionFilters])

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
          actionHistoryInfinite={{
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
