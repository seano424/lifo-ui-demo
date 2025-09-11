'use client'

import { AlertTriangle, CheckCircle2, Clock, History } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { TodosCardList } from '@/components/todos/todos-card-list'
import { TodosFilters } from '@/components/todos/todos-filters'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Todo item type based on actionable_batches structure
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
  // Action history fields (for action_history tab)
  action_taken?: string
  action_date?: string
  action_user?: string
}

export type TodoFilters = {
  storeId?: string
  tab?: 'recommendations' | 'recently_expired' | 'all_active' | 'action_history'
  urgency?: 'critical' | 'high' | 'medium' | 'low' | 'maintain' | 'all'
  sort?: {
    field: 'expiry_date' | 'urgency' | 'current_quantity' | 'potential_loss'
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
  const _t = useTranslations('todos')

  const [activeTab, setActiveTab] = useState<string>(initialFilters?.tab || 'recommendations')
  const [filters, setFilters] = useState<TodoFilters>(() => {
    const baseFilters: TodoFilters = {
      storeId: activeStoreId || undefined,
      tab: (initialFilters?.tab as TodoFilters['tab']) || 'recommendations',
    }

    if (initialFilters?.urgency && initialFilters.urgency !== 'all') {
      baseFilters.urgency = initialFilters.urgency as TodoFilters['urgency']
    }

    if (initialFilters?.sort) {
      baseFilters.sort = {
        field: initialFilters.sort as
          | 'urgency'
          | 'expiry_date'
          | 'current_quantity'
          | 'potential_loss',
        direction: (initialFilters.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      // Default sorting based on tab
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
      // Reset urgency filter when changing tabs
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

  // Get real counts from analytics data
  const { data: analyticsResponse } = useStoreAnalytics(activeStoreId || '')

  const counts = {
    recommendations: analyticsResponse?.analytics?.actionable_batches?.length || 0,
    recently_expired: analyticsResponse?.analytics?.actionable_batches?.filter(batch => batch.urgency === 'critical')?.length || 0,
    all_active: analyticsResponse?.analytics?.dashboard_summary?.total_batches || 0,
    action_history: 0, // TODO: implement action history hook
  }

  return (
    <div className="space-y-4">
      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="border-b p-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:block">Recommendations</span>
                <span className="sm:hidden">Rec</span>
                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                  {counts.recommendations}
                </span>
              </TabsTrigger>
              <TabsTrigger value="recently_expired" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:block">Recently Expired</span>
                <span className="sm:hidden">Exp</span>
                <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                  {counts.recently_expired}
                </span>
              </TabsTrigger>
              <TabsTrigger value="all_active" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:block">All Active</span>
                <span className="sm:hidden">Active</span>
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                  {counts.all_active}
                </span>
              </TabsTrigger>
              <TabsTrigger value="action_history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:block">History</span>
                <span className="sm:hidden">Hist</span>
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                  {counts.action_history}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filters - only show for recommendations and all_active tabs */}
          {(activeTab === 'recommendations' || activeTab === 'all_active') && (
            <div className="border-b p-4">
              <TodosFilters
                filters={{
                  urgency: filters.urgency,
                  sort: filters.sort,
                }}
                onFiltersChange={handleFiltersChange}
                isLoading={false} // TODO: get from actual data loading state
              />
            </div>
          )}

          <TabsContent value="recommendations" className="p-4">
            <TodosCardList tab="recommendations" filters={filters} pageSize={pageSize} />
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
      </Card>
    </div>
  )
}
