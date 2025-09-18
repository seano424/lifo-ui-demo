'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AllActiveTab } from '@/components/todos/tabs/all-active-tab'
import { PendingActionsTab } from '@/components/todos/tabs/pending-actions-tab'
import { RecentlyExpiredTab } from '@/components/todos/tabs/recently-expired-tab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  useAllActiveWithStates,
  usePendingActions,
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
    | 'todays_tasks'
    | 'recently_expired'
    | 'upcoming_tasks'
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

  const [activeTab, setActiveTab] = useState<string>(initialFilters?.tab || 'todays_tasks')

  const buttonRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const [filters, setFilters] = useState<TodoFilters>(() => {
    const baseFilters: TodoFilters = {
      storeId: activeStoreId || undefined,
      tab: (initialFilters?.tab as TodoFilters['tab']) || 'todays_tasks',
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
        baseFilters.tab === 'todays_tasks'
          ? { field: 'urgency', direction: 'desc' }
          : { field: 'expiry_date', direction: 'asc' }
    }

    return baseFilters
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Get counts using the new todos summary hook
  const validStoreId = activeStoreId || ''
  const hasValidStore = !!activeStoreId && activeStoreId !== ''
  const { data: todosSummary } = useTodosSummary(validStoreId)

  console.log('TodosSummary', todosSummary)

  // Get actual data for each tab to show correct counts
  const pendingActionsQuery = usePendingActions(validStoreId, {
    limit: 1,
    enabled: hasValidStore,
  })
  const recentlyExpiredQuery = useRecentlyExpired(validStoreId, {
    limit: 1,
    enabled: hasValidStore,
  })
  const allActiveQuery = useAllActiveWithStates(validStoreId, {
    limit: 1,
    enabled: hasValidStore,
  })

  // Calculate actual counts from the first page
  const actualCounts = {
    pending_actions: pendingActionsQuery.data?.pages?.[0]?.[0]?.total_count || 0,
    recently_expired: recentlyExpiredQuery.data?.pages?.[0]?.[0]?.total_count || 0,
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
        'todays_tasks',
        'recently_expired',
        'upcoming_tasks',
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

    if (updatedFilters.tab && updatedFilters.tab !== 'todays_tasks') {
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
        <div className="overflow-x-auto flex w-full">
          {[
            { label: "Today's Tasks", value: 'todays_tasks' },
            { label: 'Recently Expired', value: 'recently_expired' },
            { label: 'Upcoming Tasks', value: 'upcoming_tasks' },
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
                activeTab === tab.value ? 'text-primary' : 'text-muted-foreground/90'
              )}
            >
              {tab.label}
              <Badge
                className="cursor-pointer group-hover/tab:text-primary"
                variant={activeTab === tab.value ? 'primary' : 'gray'}
              >
                {tab.value === 'todays_tasks' && actualCounts.pending_actions}
                {tab.value === 'recently_expired' && actualCounts.recently_expired}
                {tab.value === 'upcoming_tasks' && actualCounts.all_active}
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
        <TabsContent value="todays_tasks">
          <PendingActionsTab
            filters={filters}
            pageSize={pageSize}
            onFiltersChange={handleFiltersChange}
          />
        </TabsContent>

        <TabsContent value="recently_expired">
          <RecentlyExpiredTab filters={filters} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="upcoming_tasks">
          <AllActiveTab filters={filters} onFiltersChange={handleFiltersChange} />
        </TabsContent>
      </Tabs>
    </>
  )
}
