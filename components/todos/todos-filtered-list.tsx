'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ActionHistoryTab } from '@/components/todos/tabs/action-history-tab'
import { AllActiveTab } from '@/components/todos/tabs/all-active-tab'
import { RecentlyExpiredTab } from '@/components/todos/tabs/recently-expired-tab'
import { SuggestionsTab } from '@/components/todos/tabs/suggestions-tab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  useActionHistoryCount,
  useAllActiveCount,
  useRecentlyExpiredCount,
  useSuggestionsCount,
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
  tab?: 'suggestions' | 'recently_expired' | 'all_active' | 'action_history'
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

  console.log('[TodosFilteredList] Store context:', {
    activeStoreId,
    initialFilters,
  })

  const [activeTab, setActiveTab] = useState<string>(initialFilters?.tab || 'suggestions')

  const buttonRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const [filters, setFilters] = useState<TodoFilters>(() => {
    const baseFilters: TodoFilters = {
      storeId: activeStoreId || undefined,
      tab: (initialFilters?.tab as TodoFilters['tab']) || 'suggestions',
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
        baseFilters.tab === 'suggestions'
          ? { field: 'urgency', direction: 'desc' }
          : { field: 'expiry_date', direction: 'asc' }
    }

    return baseFilters
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Get counts using dedicated hooks - these run regardless of active tab
  const suggestionsCount = useSuggestionsCount(activeStoreId, filters.urgency)
  const recentlyExpiredCount = useRecentlyExpiredCount(activeStoreId)
  const allActiveCount = useAllActiveCount(activeStoreId, filters.urgency)
  const actionHistoryCount = useActionHistoryCount(activeStoreId)

  useEffect(() => {
    const updateIndicator = () => {
      const tabs = ['suggestions', 'recently_expired', 'all_active', 'action_history']
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

    if (updatedFilters.tab && updatedFilters.tab !== 'suggestions') {
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
        <div className="flex items-center justify-between sm:justify-start gap-4">
          {[
            { label: 'Suggestions', value: 'suggestions' },
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
              <Badge
                className="cursor-pointer group-hover/tab:text-primary"
                variant={activeTab === tab.value ? 'primary' : 'gray'}
              >
                {tab.value === 'suggestions' && suggestionsCount}
                {tab.value === 'recently_expired' && recentlyExpiredCount}
                {tab.value === 'all_active' && allActiveCount}
                {tab.value === 'action_history' && actionHistoryCount}
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
        <TabsContent value="suggestions">
          <SuggestionsTab
            filters={filters}
            pageSize={pageSize}
            onFiltersChange={handleFiltersChange}
          />
        </TabsContent>

        <TabsContent value="recently_expired">
          <RecentlyExpiredTab filters={filters} />
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
