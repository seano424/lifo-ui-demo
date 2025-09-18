'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ActionHistoryTab } from '@/components/todos/tabs/action-history-tab'
import { AllActiveTab } from '@/components/todos/tabs/all-active-tab'
import { PendingActionsTab } from '@/components/todos/tabs/pending-actions-tab'
import { RecentlyDiscountedTab } from '@/components/todos/tabs/recently-discounted-tab'
import { RecentlyDonatedTab } from '@/components/todos/tabs/recently-donated-tab'
import { RecentlyExpiredTab } from '@/components/todos/tabs/recently-expired-tab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  useAllActiveWithStates,
  useDonatedItems,
  usePendingActions,
  useRecentlyDiscounted,
  useRecentlyExpired,
  useTodosSummary,
} from '@/hooks/use-todos-rpc'
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
  tab?:
    | 'pending_actions'
    | 'recently_discounted'
    | 'recently_donated'
    | 'recently_expired'
    | 'all_active'
    | 'action_history'
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

  const [activeTab, setActiveTab] = useState<string>(initialFilters?.tab || 'pending_actions')

  const buttonRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const [filters, setFilters] = useState<TodoFilters>(() => {
    const baseFilters: TodoFilters = {
      storeId: activeStoreId || undefined,
      tab: (initialFilters?.tab as TodoFilters['tab']) || 'pending_actions',
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
        baseFilters.tab === 'pending_actions'
          ? { field: 'urgency', direction: 'desc' }
          : { field: 'expiry_date', direction: 'asc' }
    }

    return baseFilters
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Get counts using the new todos summary hook
  const { data: todosSummary } = useTodosSummary(activeStoreId || '')

  // Get actual data for each tab to show correct counts
  const pendingActionsQuery = usePendingActions(activeStoreId || '', {
    limit: 1,
    enabled: !!activeStoreId,
  })
  const recentlyDiscountedQuery = useRecentlyDiscounted(activeStoreId || '', {
    limit: 1,
    enabled: !!activeStoreId,
  })
  const recentlyExpiredQuery = useRecentlyExpired(activeStoreId || '', {
    limit: 1,
    enabled: !!activeStoreId,
  })
  const recentlyDonatedQuery = useDonatedItems(activeStoreId || '', {
    limit: 1,
    enabled: !!activeStoreId,
  })
  const allActiveQuery = useAllActiveWithStates(activeStoreId || '', {
    limit: 1,
    enabled: !!activeStoreId,
  })

  // Calculate actual counts from the first page
  const actualCounts = {
    pending_actions: pendingActionsQuery.data?.pages?.[0]?.[0]?.total_count || 0,
    recently_discounted: recentlyDiscountedQuery.data?.pages?.[0]?.[0]?.total_count || 0,
    recently_expired: recentlyExpiredQuery.data?.pages?.[0]?.[0]?.total_count || 0,
    recently_donated: recentlyDonatedQuery.data?.pages?.[0]?.[0]?.total_count || 0,
    all_active: allActiveQuery.data?.pages?.[0]?.[0]?.total_count || 0,
  }

  // Debug the summary vs actual data discrepancy
  console.log('TodosSummary Debug:', {
    todosSummary,
    actualCounts,
    recently_expired_summary: todosSummary?.recently_expired_count,
    recently_expired_actual: actualCounts.recently_expired,
  })

  useEffect(() => {
    const updateIndicator = () => {
      const tabs = [
        'pending_actions',
        'recently_discounted',
        'recently_donated',
        'recently_expired',
        'all_active',
        'action_history',
      ]
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

    if (updatedFilters.tab && updatedFilters.tab !== 'pending_actions') {
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

  return (
    <>
      <div className="relative">
        <div className="flex items-center justify-between sm:justify-start gap-4 overflow-x-auto">
          {[
            { label: 'Pending Actions', value: 'pending_actions' },
            { label: 'Recently Discounted', value: 'recently_discounted' },
            { label: 'Recently Donated', value: 'recently_donated' },
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
                'rounded-none px-4 relative flex items-center gap-2 pb-4 whitespace-nowrap',
                'hover:bg-transparent group/tab font-bold font-sans tracking-tight',
                activeTab === tab.value ? 'text-primary' : 'text-muted-foreground/90',
                tab.value === 'recently_discounted' && 'hidden lg:flex',
                tab.value === 'recently_donated' && 'hidden lg:flex',
                tab.value === 'recently_expired' && 'hidden lg:flex',
                tab.value === 'all_active' && 'hidden lg:flex',
              )}
            >
              {tab.label}
              <Badge
                className="cursor-pointer group-hover/tab:text-primary"
                variant={activeTab === tab.value ? 'primary' : 'gray'}
              >
                {tab.value === 'pending_actions' && actualCounts.pending_actions}
                {tab.value === 'recently_discounted' && actualCounts.recently_discounted}
                {tab.value === 'recently_donated' && actualCounts.recently_donated}
                {tab.value === 'recently_expired' && actualCounts.recently_expired}
                {tab.value === 'all_active' && actualCounts.all_active}
                {tab.value === 'action_history' && '•'}
              </Badge>
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
        <TabsContent value="pending_actions">
          <PendingActionsTab
            filters={filters}
            pageSize={pageSize}
            onFiltersChange={handleFiltersChange}
          />
        </TabsContent>

        <TabsContent value="recently_discounted">
          <RecentlyDiscountedTab filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="recently_donated">
          <RecentlyDonatedTab filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="recently_expired">
          <RecentlyExpiredTab filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="all_active">
          <AllActiveTab filters={filters} onFiltersChange={handleFiltersChange} />
        </TabsContent>

        <TabsContent value="action_history">
          <ActionHistoryTab filters={filters} pageSize={pageSize} />
        </TabsContent>
      </Tabs>
    </>
  )
}
