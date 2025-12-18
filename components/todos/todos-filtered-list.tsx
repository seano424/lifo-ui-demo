'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-mobile'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SortDirection, SortField, TodoFiltersState } from './filters/types'
import { UnifiedSearchFiltersBarV2 } from './filters/unified-search-filters-bar-v2'
import { CompletedTabWithCounts } from './todos-main-tabs/completed-tab'
import { InProgressTabWithCounts } from './todos-main-tabs/in-progress-tab'
import { PendingTabWithCounts } from './todos-main-tabs/pending-tab'

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
  const t = useTranslations('todos')
  const router = useRouter()
  const { isMobile } = useMediaQuery()

  const [activeTab, setActiveTab] = useState<TodoTabType>(
    (initialFilters?.tab as TodoTabType) || 'pending',
  )

  // Tab indicator animation
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Scroll indicators state
  const [showLeftIndicator, setShowLeftIndicator] = useState(false)
  const [showRightIndicator, setShowRightIndicator] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Track if filters/tab have been initialized from URL
  const [isInitialized, setIsInitialized] = useState(false)

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

  // Track counts from each tab component (they fetch data + counts together)
  const [tabCounts, setTabCounts] = useState<Record<TodoTabType, number>>({
    pending: 0,
    in_progress: 0,
    completed: 0,
  })

  // Callback for tab components to report their counts
  const handleCountUpdate = useCallback((tabId: TodoTabType, count: number) => {
    setTabCounts(prev => ({ ...prev, [tabId]: count }))
  }, [])

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: 'pending' as TodoTabType,
        label: t('tabs.pending'),
        count: tabCounts.pending,
        component: PendingTabWithCounts,
      },
      {
        id: 'in_progress' as TodoTabType,
        label: t('tabs.inProgress'),
        count: tabCounts.in_progress,
        component: InProgressTabWithCounts,
      },
      {
        id: 'completed' as TodoTabType,
        label: t('tabs.resolved'),
        count: tabCounts.completed,
        component: CompletedTabWithCounts,
      },
    ],
    [tabCounts, t],
  )

  // Update tab indicator position and scroll indicators
  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
      const activeButton = buttonRefs.current[activeIndex]

      if (activeButton) {
        // Get the scrollable container and its inner flex container
        const scrollContainer = activeButton.closest('.overflow-x-auto')
        const flexContainer = activeButton.closest('.flex')

        if (scrollContainer && flexContainer) {
          // Get the main container (where the indicator will be positioned)
          const mainContainer = scrollContainer.parentElement
          if (mainContainer) {
            const mainRect = mainContainer.getBoundingClientRect()
            const buttonRect = activeButton.getBoundingClientRect()

            // Calculate position relative to the main container
            const left = buttonRect.left - mainRect.left
            const width = buttonRect.width

            setIndicatorStyle({ left, width })
          }
        } else {
          // Fallback to original method
          const { offsetLeft, offsetWidth } = activeButton
          setIndicatorStyle({ left: offsetLeft, width: offsetWidth })
        }
      }
    }

    const updateScrollIndicators = () => {
      const container = scrollContainerRef.current
      if (container) {
        const { scrollLeft, scrollWidth, clientWidth } = container
        setShowLeftIndicator(scrollLeft > 0)
        setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1)
      }
    }

    const handleScroll = () => {
      updateIndicator()
      updateScrollIndicators()
    }

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateIndicator()
      updateScrollIndicators()
    }, 1)

    // Use the ref instead of querySelector to avoid memory leaks and wrong element selection
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
    }

    window.addEventListener('resize', handleScroll)

    return () => {
      clearTimeout(timeoutId)
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('resize', handleScroll)
    }
  }, [activeTab, tabs])

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Update URL when tab or filters change (only after initialization)
  useEffect(() => {
    // Skip URL update until component is initialized to prevent loops
    if (!isInitialized) {
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

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeTab, filters, router, isInitialized])

  const handleTabChange = (tabId: TodoTabType) => {
    setActiveTab(tabId)
    // Optionally reset filters when changing tabs
    // setFilters(prev => ({ ...prev, product_name: undefined }))
  }

  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (container) {
      const scrollAmount = container.clientWidth * 0.8 // Scroll 80% of visible width
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (container) {
      const scrollAmount = container.clientWidth * 0.8
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleFiltersChange = useCallback(
    (newFilters: TodoFiltersState | ((prevFilters: TodoFiltersState) => TodoFiltersState)) => {
      setFilters(newFilters)
    },
    [],
  )

  const handleSearchChange = useCallback(
    (searchTerm: string | undefined) => {
      handleFiltersChange(prev => ({
        ...prev,
        product_name: searchTerm,
      }))
    },
    [handleFiltersChange],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="relative">
        {/* Left scroll indicator */}
        {showLeftIndicator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollLeft}
            aria-label="Scroll tabs left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background/90 h-6 w-6 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}

        {/* Right scroll indicator */}
        {showRightIndicator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollRight}
            aria-label="Scroll tabs right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background/90 h-6 w-6 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}

        <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-none">
          <div className="flex gap-2 sm:gap-4 min-w-max px-2 sm:px-0">
            {tabs.map((tab, index) => (
              <Button
                key={tab.id}
                ref={(el: HTMLButtonElement | null) => {
                  buttonRefs.current[index] = el
                }}
                variant="ghost"
                size={isMobile ? 'sm' : 'lg'}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'rounded-none select-none relative flex flex-col-reverse sm:flex-row items-center pb-4 gap-1 min-w-0 flex-shrink-0',
                  'hover:bg-transparent group/tab',
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/90',
                )}
              >
                <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
                  {tab.label}
                </span>
                <Badge
                  className="cursor-pointer group-hover/tab:text-primary text-[10px] sm:text-xs flex items-center justify-center rounded-full px-2 sm:px-3 min-w-[24px] h-6 opacity-70"
                  variant={activeTab === tab.id ? 'primary' : 'default'}
                >
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Tab indicator */}
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-border" />
        <div
          className="absolute bottom-0 h-[3px] bg-primary/85 transition-all duration-300 ease-in-out z-10 rounded-full overflow-hidden"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>

      {/* Unified Search Bar V2 with Filter Dropdown */}
      <UnifiedSearchFiltersBarV2
        searchTerm={filters.product_name}
        onSearchChange={handleSearchChange}
        isLoading={false}
        placeholder={t('filters.searchPlaceholder')}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Tab Content */}
      <div className="w-full">
        {/* Keep all tab components mounted but only show the active one */}
        <div
          style={{
            display: activeTab === 'pending' ? 'block' : 'none',
          }}
        >
          <PendingTabWithCounts
            filters={filters}
            pageSize={pageSize}
            onCountUpdate={(count: number) => handleCountUpdate('pending', count)}
          />
        </div>

        <div
          style={{
            display: activeTab === 'in_progress' ? 'block' : 'none',
          }}
        >
          <InProgressTabWithCounts
            filters={filters}
            pageSize={pageSize}
            onCountUpdate={(count: number) => handleCountUpdate('in_progress', count)}
          />
        </div>

        <div
          style={{
            display: activeTab === 'completed' ? 'block' : 'none',
          }}
        >
          <CompletedTabWithCounts
            filters={filters}
            pageSize={pageSize}
            onCountUpdate={(count: number) => handleCountUpdate('completed', count)}
          />
        </div>
      </div>
    </div>
  )
}
