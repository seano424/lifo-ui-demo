'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-mobile'
import {
  useCompletedTodos,
  useExpiredTodos,
  useExpiringTodos,
  useInProgressTodos,
  usePendingTodos,
} from '@/hooks/use-todos-with-filters'
import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SortDirection, SortField, TodoFiltersState } from './filters/types'
import { UnifiedFiltersModal } from './filters/unified-filters-modal'
import { UnifiedSearchFiltersBar } from './filters/unified-search-filters-bar'
import { UnifiedSortModal } from './filters/unified-sort-modal'
import { CompletedTab } from './todos-main-tabs/completed-tab'
import { ExpiredTab } from './todos-main-tabs/expired-tab'
import { ExpiringTab } from './todos-main-tabs/expiring-tab'
import { InProgressTab } from './todos-main-tabs/in-progress-tab'
import { PendingTab } from './todos-main-tabs/pending-tab'

export type TodoTabType = 'pending' | 'in_progress' | 'completed' | 'expiring' | 'expired'

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
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)

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

  // Get data for tab counts
  const { data: pendingTodos } = usePendingTodos(filters, pageSize)
  const { data: inProgressTodos } = useInProgressTodos(filters, pageSize)
  const { data: completedTodos } = useCompletedTodos(filters, pageSize)
  const { data: expiringTodos } = useExpiringTodos(
    {
      urgency_level: filters.urgency_level,
      action_type: filters.action_type,
      product_name: filters.product_name,
      days_to_expiry_min: filters.days_to_expiry_min,
      days_to_expiry_max: filters.days_to_expiry_max,
    },
    pageSize,
  )
  const { data: expiredTodos } = useExpiredTodos(filters, pageSize)

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: 'expiring' as TodoTabType,
        label: t('tabs.expiring'),
        count: expiringTodos?.length || 0,
        component: ExpiringTab,
      },
      {
        id: 'pending' as TodoTabType,
        label: t('tabs.pending'),
        count: pendingTodos?.length || 0,
        component: PendingTab,
      },
      {
        id: 'in_progress' as TodoTabType,
        label: t('tabs.inProgress'),
        count: inProgressTodos?.length || 0,
        component: InProgressTab,
      },
      {
        id: 'completed' as TodoTabType,
        label: t('tabs.completed'),
        count: completedTodos?.length || 0,
        component: CompletedTab,
      },
      {
        id: 'expired' as TodoTabType,
        label: t('tabs.expired'),
        count: expiredTodos?.length || 0,
        component: ExpiredTab,
      },
    ],
    [
      pendingTodos?.length,
      inProgressTodos?.length,
      expiringTodos?.length,
      expiredTodos?.length,
      completedTodos?.length,
      t,
    ],
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

  const handleRemoveFilter = useCallback(
    (type: 'urgency' | 'action' | 'batch' | 'expiry', value?: string) => {
      handleFiltersChange(prev => {
        switch (type) {
          case 'urgency':
            return {
              ...prev,
              urgency_level: prev.urgency_level?.filter((level: string) => level !== value),
            }
          case 'action':
            return {
              ...prev,
              action_type: prev.action_type?.filter(action => action !== value),
            }
          case 'batch':
            return {
              ...prev,
              batch_status: prev.batch_status?.filter(status => status !== value),
            }
          case 'expiry':
            return {
              ...prev,
              expiry_range: undefined,
            }
          default:
            return prev
        }
      })
    },
    [handleFiltersChange],
  )

  const handleClearAll = useCallback(() => {
    handleFiltersChange(prev => ({
      ...prev,
      urgency_level: undefined,
      action_type: undefined,
      batch_status: undefined,
      expiry_range: undefined,
    }))
  }, [handleFiltersChange])

  return (
    <div className="space-y-2">
      {/* Unified Search Bar with Filter/Sort Buttons */}
      <UnifiedSearchFiltersBar
        searchTerm={filters.product_name}
        onSearchChange={handleSearchChange}
        onFiltersClick={() => setShowFilters(true)}
        onSortClick={() => setShowSort(true)}
        isLoading={false}
        placeholder={t('filters.searchPlaceholder')}
        urgencyLevel={filters.urgency_level}
        actionType={filters.action_type}
        batchStatus={filters.batch_status}
        expiryRange={filters.expiry_range}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAll}
      />

      {/* Mobile Separator after search */}
      <div className="border-t border-border mx-4" />

      {/* Unified Filters Modal */}
      <UnifiedFiltersModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={{
          urgency_level: filters.urgency_level,
          action_type: filters.action_type,
          batch_status: filters.batch_status,
          expiry_range: filters.expiry_range,
        }}
        onFiltersChange={newFilters => {
          handleFiltersChange(prev => ({
            ...prev,
            ...newFilters,
          }))
        }}
        onClearAll={() => {
          handleFiltersChange(prev => ({
            ...prev,
            urgency_level: undefined,
            action_type: undefined,
            batch_status: undefined,
            expiry_range: undefined,
          }))
        }}
        isLoading={false}
      />

      {/* Unified Sort Modal */}
      <UnifiedSortModal
        isOpen={showSort}
        onClose={() => setShowSort(false)}
        sortConfig={filters.sortConfig || { field: 'urgency', direction: 'desc' }}
        onSortChange={sortConfig => {
          handleFiltersChange(prev => ({
            ...prev,
            sortConfig,
          }))
        }}
        onReset={() => {
          handleFiltersChange(prev => ({
            ...prev,
            sortConfig: defaultSortConfig,
          }))
        }}
        isLoading={false}
      />

      {/* Tab Navigation */}
      <div className="relative mb-10">
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
                  className="cursor-pointer group-hover/tab:text-primary text-xs sm:text-sm flex items-center justify-center rounded-full px-2 sm:px-3 min-w-[24px] h-6"
                  variant={activeTab === tab.id ? 'primary' : 'default'}
                >
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>
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
            display: activeTab === 'expiring' ? 'block' : 'none',
          }}
        >
          <ExpiringTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          style={{
            display: activeTab === 'expired' ? 'block' : 'none',
          }}
        >
          <ExpiredTab filters={filters} pageSize={pageSize} />
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
