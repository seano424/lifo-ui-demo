'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BatchActionFilters,
  type BatchActionFiltersType,
} from '@/components/todos/batch-action-filters'
import { TodosCardList } from '@/components/todos/todos-card-list'
import { TodosFilters } from '@/components/todos/todos-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  type ActionableBatch,
  type BatchActionWithDetails,
  useBatchActionsInfinite,
  useStoreAnalytics,
  useTodosInfinite,
} from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { isSortDirection, isSortField, validateSortConfig } from '@/lib/utils/todo-sorting'

export type TodoItem = {
  batch_id: string
  product_name: string
  expiry_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'maintain'
  recommendation: string
  reason: string
  location_code: string
  current_quantity: number
  potential_loss?: number
  composite_score?: number
  discount_percent?: number
  action_taken?: string
  action_date?: string
  action_user?: string
}

export type TodoFilters = {
  storeId?: string
  tab?: 'recommendations' | 'recently_expired' | 'all_active' | 'action_history'
  urgency?: 'critical' | 'high' | 'medium' | 'low' | 'maintain' | 'all'
  sort?: {
    field:
      | 'expiry_date'
      | 'urgency'
      | 'current_quantity'
      | 'potential_loss'
      | 'alphabetical'
      | 'action_date'
      | 'effectiveness'
    direction: 'asc' | 'desc'
  }
}

interface TodosFilteredListProps {
  initialFilters?: {
    tab?: string
    urgency?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
}

export function TodosFilteredList({ initialFilters, pageSize = 20 }: TodosFilteredListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStoreId = useActiveStoreId()

  const [activeTab, setActiveTab] = useState<string>(initialFilters?.tab || 'recommendations')

  const buttonRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Batch action filters state
  const [batchActionFilters, setBatchActionFilters] = useState<BatchActionFiltersType>({
    sort: { field: 'action_date', direction: 'desc' },
  })

  const [filters, setFilters] = useState<TodoFilters>(() => {
    const baseFilters: TodoFilters = {
      storeId: activeStoreId || undefined,
      tab: (initialFilters?.tab as TodoFilters['tab']) || 'recommendations',
    }

    if (initialFilters?.urgency && initialFilters.urgency !== 'all') {
      const validUrgencyLevels = ['critical', 'high', 'medium', 'low', 'maintain']
      if (validUrgencyLevels.includes(initialFilters.urgency)) {
        baseFilters.urgency = initialFilters.urgency as TodoFilters['urgency']
      }
    }

    if (initialFilters?.sort) {
      const field = initialFilters.sort
      const direction = initialFilters.direction || 'asc'

      if (isSortField(field) && isSortDirection(direction)) {
        baseFilters.sort = { field, direction }
      } else {
        baseFilters.sort = validateSortConfig({ field, direction })
      }
    } else {
      baseFilters.sort =
        baseFilters.tab === 'recommendations'
          ? { field: 'urgency', direction: 'desc' }
          : { field: 'expiry_date', direction: 'asc' }
    }

    return baseFilters
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  useEffect(() => {
    const updateIndicator = () => {
      const tabs = ['recommendations', 'recently_expired', 'all_active', 'action_history']
      const activeIndex = tabs.indexOf(activeTab)
      const activeButton = buttonRefs.current[activeIndex]

      if (activeButton) {
        const { offsetLeft, offsetWidth } = activeButton
        setIndicatorStyle({ left: offsetLeft, width: offsetWidth })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  const updateFilters = (newFilters: Partial<TodoFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    const params = new URLSearchParams(searchParams.toString())

    if (updatedFilters.tab && updatedFilters.tab !== 'recommendations') {
      params.set('tab', updatedFilters.tab)
    } else {
      params.delete('tab')
    }

    if (updatedFilters.urgency && updatedFilters.urgency !== 'all') {
      params.set('urgency', updatedFilters.urgency)
    } else {
      params.delete('urgency')
    }

    if (updatedFilters.sort) {
      params.set('sort', updatedFilters.sort.field)
      params.set('direction', updatedFilters.sort.direction)
    } else {
      params.delete('sort')
      params.delete('direction')
    }

    router.push(`?${params.toString()}`)
  }

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    updateFilters({
      tab: newTab as TodoFilters['tab'],
      urgency: 'all',
    })
  }

  const handleFiltersChange = (newFilters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => {
    updateFilters({
      urgency: newFilters.urgency as TodoFilters['urgency'],
      sort: newFilters.sort as TodoFilters['sort'],
    })
  }

  const handleBatchActionFiltersChange = (newFilters: BatchActionFiltersType) => {
    setBatchActionFilters(newFilters)
  }

  const { data: analyticsResponse } = useStoreAnalytics(activeStoreId || '')

  const {
    data: infiniteData,
    isLoading: isLoadingInfinite,
    error: infiniteError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTodosInfinite(activeStoreId || '', pageSize || 20, '7d', undefined, {
    urgency: filters.urgency,
  })

  const {
    data: batchActionsData,
    isLoading: isBatchActionsLoading,
    hasNextPage: hasBatchActionsNextPage,
    fetchNextPage: fetchBatchActionsNextPage,
    isFetchingNextPage: isFetchingBatchActionsNextPage,
  } = useBatchActionsInfinite(activeStoreId || null, pageSize || 20)

  // Memoized batch actions processing with filtering and sorting
  const processedBatchActions = useMemo(() => {
    if (activeTab !== 'action_history' || !batchActionsData?.pages) {
      return []
    }

    let actions = batchActionsData.pages.flatMap(page => page.data)

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
          case 'action_date':
            return (
              (new Date(a.action_date || 0).getTime() - new Date(b.action_date || 0).getTime()) *
              multiplier
            )
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

    return actions
  }, [activeTab, batchActionsData?.pages, batchActionFilters])

  const getFilteredCount = useCallback(
    (batches: ActionableBatch[], tab: string) => {
      if (!batches) return 0

      // Apply urgency filter if on recommendations or all_active tabs
      if (
        (tab === 'recommendations' || tab === 'all_active') &&
        filters.urgency &&
        filters.urgency !== 'all'
      ) {
        return batches.filter(batch => batch.urgency === filters.urgency).length
      }

      return batches.length
    },
    [filters.urgency],
  )

  const getBatchActionsFilteredCount = useCallback(
    (actions: BatchActionWithDetails[]) => {
      if (!actions) return 0

      // Apply action type filter
      if (batchActionFilters?.actionType && batchActionFilters.actionType !== 'all') {
        return actions.filter(action => action.actual_action === batchActionFilters.actionType)
          .length
      }

      return actions.length
    },
    [batchActionFilters?.actionType],
  )

  const counts = useMemo(() => {
    return {
      recommendations:
        // Use filtered count from infinite data if available, otherwise use analytics data
        activeTab === 'recommendations' && infiniteData?.pages?.[0]?.count !== undefined
          ? infiniteData.pages[0].count
          : activeTab === 'recommendations' && filters.urgency && filters.urgency !== 'all'
            ? getFilteredCount(
                analyticsResponse?.analytics?.actionable_batches || [],
                'recommendations',
              )
            : analyticsResponse?.analytics?.actionable_batches?.length || 0,
      recently_expired:
        analyticsResponse?.analytics?.actionable_batches?.filter(
          batch => new Date(batch.expiry_date) < new Date(),
        )?.length || 0,
      all_active:
        activeTab === 'all_active' && filters.urgency && filters.urgency !== 'all'
          ? getFilteredCount(
              analyticsResponse?.analytics?.actionable_batches?.filter(
                batch => new Date(batch.expiry_date) >= new Date(),
              ) || [],
              'all_active',
            )
          : analyticsResponse?.analytics?.actionable_batches?.filter(
              batch => new Date(batch.expiry_date) >= new Date(),
            )?.length || 0,
      action_history:
        batchActionFilters?.actionType && batchActionFilters.actionType !== 'all'
          ? getBatchActionsFilteredCount(batchActionsData?.pages?.flatMap(page => page.data) || [])
          : batchActionsData?.pages?.[0]?.count || 0,
    }
  }, [
    activeTab,
    infiniteData?.pages,
    filters.urgency,
    analyticsResponse?.analytics?.actionable_batches,
    batchActionsData?.pages,
    batchActionFilters?.actionType,
    getFilteredCount,
    getBatchActionsFilteredCount,
  ])

  return (
    <>
      <div className="relative">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          {[
            { label: 'Recommendations', value: 'recommendations' },
            { label: 'Recently Expired', value: 'recently_expired' },
            { label: 'All Active', value: 'all_active' },
            { label: 'Action History', value: 'action_history' },
          ].map((tab, index) => (
            <Button
              key={tab.value}
              ref={el => {
                buttonRefs.current[index] = el
              }}
              size="lg"
              variant="ghost"
              onClick={() => {
                setActiveTab(tab.value)
                updateFilters({
                  tab: tab.value as TodoFilters['tab'],
                  urgency: 'all',
                })
              }}
              className={cn(
                'rounded-none px-4 relative flex items-center gap-2 pb-4',
                'hover:bg-transparent group/tab font-bold font-sans tracking-tight',
                activeTab === tab.value ? 'text-primary' : 'text-muted-foreground/90',
                tab.value === 'recently_expired' && 'hidden lg:flex',
                tab.value === 'all_active' && 'hidden lg:flex',
              )}
            >
              {tab.label}
              {tab.value === 'recommendations' && (
                <Badge
                  className="cursor-pointer group-hover/tab:text-primary"
                  variant={activeTab === 'recommendations' ? 'primary' : 'gray'}
                >
                  {counts.recommendations}
                </Badge>
              )}
              {tab.value === 'recently_expired' && (
                <Badge
                  className="cursor-pointer group-hover/tab:text-primary"
                  variant={activeTab === 'recently_expired' ? 'primary' : 'gray'}
                >
                  {counts.recently_expired}
                </Badge>
              )}
              {tab.value === 'all_active' && (
                <Badge
                  className="cursor-pointer group-hover/tab:text-primary"
                  variant={activeTab === 'all_active' ? 'primary' : 'gray'}
                >
                  {counts.all_active}
                </Badge>
              )}
              {tab.value === 'action_history' && (
                <Badge
                  className="cursor-pointer group-hover/tab:text-primary"
                  variant={activeTab === 'action_history' ? 'primary' : 'gray'}
                >
                  {counts.action_history}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[4px] bg-border" />
        <div
          className="absolute bottom-0 h-[4px] bg-primary transition-all duration-300 ease-in-out z-10 rounded-full overflow-hidden"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {(activeTab === 'recommendations' || activeTab === 'all_active') && (
          <div className="px-4 mb-4">
            <TodosFilters
              filters={{
                urgency: filters.urgency,
                sort: filters.sort,
              }}
              onFiltersChange={handleFiltersChange}
              isLoading={false}
            />
          </div>
        )}

        {activeTab === 'action_history' && (
          <div className="px-4 mb-4">
            <BatchActionFilters
              filters={batchActionFilters}
              onFiltersChange={handleBatchActionFiltersChange}
              isLoading={isBatchActionsLoading}
            />
          </div>
        )}

        <TabsContent value="recommendations" className="p-4">
          <TodosCardList
            tab="recommendations"
            filters={filters}
            infiniteData={{
              data: infiniteData?.pages?.flatMap(page => page.data) || [],
              hasNextPage,
              fetchNextPage,
              isFetchingNextPage,
              isLoading: isLoadingInfinite,
              error: infiniteError,
            }}
          />
        </TabsContent>

        <TabsContent value="recently_expired" className="p-4">
          <TodosCardList tab="recently_expired" filters={filters} />
        </TabsContent>

        <TabsContent value="all_active" className="p-4">
          <TodosCardList tab="all_active" filters={filters} />
        </TabsContent>

        <TabsContent value="action_history" className="p-4">
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
        </TabsContent>
      </Tabs>
    </>
  )
}
