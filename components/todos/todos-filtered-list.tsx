'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useCompletedTodos,
  useInProgressTodos,
  usePendingTodos,
} from '@/hooks/use-todos-with-filters'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TodoFiltersPanel, type TodoFiltersState } from './filters/todo-filters-panel'
import type { SortDirection, SortField } from './filters/todo-sort-controls'
import { CompletedTab } from './todos-main-tabs/completed-tab'
import { InProgressTab } from './todos-main-tabs/in-progress-tab'
import { PendingTab } from './todos-main-tabs/pending-tab'

export type TodoTabType = 'pending' | 'in_progress' | 'completed'

interface TodosFilteredListProps {
  initialFilters?: {
    tab?: string
    urgency?: string[]
    actionType?: string[]
    batchStatus?: string[]
    productName?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
}

export function TodosFilteredList({ initialFilters, pageSize = 20 }: TodosFilteredListProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TodoTabType>(
    (initialFilters?.tab as TodoTabType) || 'pending',
  )

  // Tab indicator animation
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Track if this is the initial render to prevent URL update loops
  const isInitialRender = useRef(true)

  // Unified filter state with stable default sort config
  const defaultSortConfig = useMemo(
    () => ({
      field: 'urgency' as const,
      direction: 'desc' as const,
    }),
    [],
  )

  const [filters, setFilters] = useState<TodoFiltersState>(() => {
    return {
      urgency_level: initialFilters?.urgency as TodoUrgencyLevel[] | undefined,
      action_type: initialFilters?.actionType as TodoActionType[] | undefined,
      batch_status: initialFilters?.batchStatus as BatchStatus[] | undefined,
      product_name: initialFilters?.productName || undefined,
      sortConfig: initialFilters?.sort
        ? {
            field: initialFilters.sort as SortField,
            direction: (initialFilters.direction as SortDirection) || 'desc',
          }
        : defaultSortConfig,
    }
  })

  // Get data for tab counts
  const { data: pendingTodos } = usePendingTodos(filters, pageSize)
  const { data: inProgressTodos } = useInProgressTodos(filters, pageSize)
  const { data: completedTodos } = useCompletedTodos(filters, pageSize)

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: 'pending' as TodoTabType,
        label: 'Pending',
        count: pendingTodos?.length || 0,
        component: PendingTab,
      },
      {
        id: 'in_progress' as TodoTabType,
        label: 'In Progress',
        count: inProgressTodos?.length || 0,
        component: InProgressTab,
      },
      {
        id: 'completed' as TodoTabType,
        label: 'Completed',
        count: completedTodos?.length || 0,
        component: CompletedTab,
      },
    ],
    [pendingTodos?.length, inProgressTodos?.length, completedTodos?.length],
  )

  // Update tab indicator position
  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
      const activeButton = buttonRefs.current[activeIndex]

      if (activeButton) {
        const { offsetLeft, offsetWidth } = activeButton
        setIndicatorStyle({ left: offsetLeft, width: offsetWidth })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab, tabs])

  // Update URL when tab or filters change (skip initial render)
  useEffect(() => {
    // Skip URL update on initial render to prevent loops
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    const params = new URLSearchParams()

    // Update tab
    if (activeTab !== 'pending') {
      params.set('tab', activeTab)
    }

    // Update filters
    if (filters.urgency_level?.length) {
      params.set('urgency', filters.urgency_level.join(','))
    }

    if (filters.action_type?.length) {
      params.set('actionType', filters.action_type.join(','))
    }

    if (filters.batch_status?.length) {
      params.set('batchStatus', filters.batch_status.join(','))
    }

    if (filters.product_name) {
      params.set('productName', filters.product_name)
    }

    if (filters.sortConfig) {
      params.set('sort', filters.sortConfig.field)
      params.set('direction', filters.sortConfig.direction)
    }

    router.push(`?${params.toString()}`)
  }, [activeTab, filters, router])

  const handleTabChange = (tabId: TodoTabType) => {
    setActiveTab(tabId)
    // Optionally reset filters when changing tabs
    // setFilters(prev => ({ ...prev, product_name: undefined }))
  }

  const handleFiltersChange = useCallback(
    (newFilters: TodoFiltersState | ((prevFilters: TodoFiltersState) => TodoFiltersState)) => {
      setFilters(newFilters)
    },
    [],
  )

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <TodoFiltersPanel filters={filters} onFiltersChange={handleFiltersChange} isLoading={false} />

      {/* Tab Navigation */}
      <div className="relative">
        <div className="overflow-x-auto flex w-full">
          {tabs.map((tab, index) => (
            <Button
              key={tab.id}
              ref={(el: HTMLButtonElement | null) => {
                buttonRefs.current[index] = el
              }}
              size="lg"
              variant="ghost"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'rounded-none px-4 relative flex items-center gap-2 pb-4 whitespace-nowrap',
                'hover:bg-transparent group/tab font-bold font-sans tracking-tight',
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/90',
              )}
            >
              {tab.label}
              <Badge
                className="cursor-pointer group-hover/tab:text-primary"
                variant={activeTab === tab.id ? 'default' : 'secondary'}
              >
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Tab indicator */}
        <div className="absolute left-0 right-0 bottom-0 h-[4px] bg-border" />
        <div
          className="absolute bottom-0 h-[4px] bg-primary transition-all duration-300 ease-in-out z-10 rounded-full overflow-hidden"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {/* Keep all tab components mounted but only show the active one */}
        <div
          style={{
            display: activeTab === 'pending' ? 'block' : 'none',
          }}
        >
          <PendingTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          style={{
            display: activeTab === 'in_progress' ? 'block' : 'none',
          }}
        >
          <InProgressTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          style={{
            display: activeTab === 'completed' ? 'block' : 'none',
          }}
        >
          <CompletedTab filters={filters} pageSize={pageSize} />
        </div>
      </div>
    </div>
  )
}
