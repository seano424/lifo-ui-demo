'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { TodosCardList } from '@/components/todos/todos-card-list'
import { TodosFilters } from '@/components/todos/todos-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  type ActionableBatch,
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

  const { data: analyticsResponse } = useStoreAnalytics(activeStoreId || '')

  const {
    data: infiniteData,
    isLoading: isLoadingInfinite,
    error: infiniteError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTodosInfinite(activeStoreId || '', pageSize || 20)

  const { data: batchActionsData } = useBatchActionsInfinite(activeStoreId || '', 1)

  const getFilteredCount = (batches: ActionableBatch[], tab: string) => {
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
  }

  const counts = {
    recommendations:
      activeTab === 'recommendations' && filters.urgency && filters.urgency !== 'all'
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
    action_history: batchActionsData?.pages?.[0]?.count || 0,
  }

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
                'hover:bg-transparent group/tab',
                activeTab === tab.value && 'text-primary',
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
        <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-border" />
        <div
          className="absolute bottom-0 h-[2px] bg-primary transition-all duration-300 ease-in-out z-10"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {(activeTab === 'recommendations' || activeTab === 'all_active') && (
          <div className="p-4 border-b pb-8 mb-4">
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

        <TabsContent value="recommendations" className="p-4">
          <TodosCardList
            tab="recommendations"
            filters={filters}
            pageSize={pageSize}
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
          <TodosCardList tab="recently_expired" filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="all_active" className="p-4">
          <TodosCardList tab="all_active" filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="action_history" className="p-4">
          <TodosCardList tab="action_history" filters={filters} pageSize={pageSize} />
        </TabsContent>
      </Tabs>
    </>
  )
}
