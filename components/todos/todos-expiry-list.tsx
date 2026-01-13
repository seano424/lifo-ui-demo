'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-mobile'
import type { TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isUrgencyLevel, isActionType } from '@/lib/todo-filter-config'
import type { SortDirection, SortField, TodoFiltersState } from './filters/types'
import { UnifiedSearchFiltersBarV2 } from './filters/unified-search-filters-bar-v2'
import { ExpiringTodayTab } from './expiry-tabs/expiring-today-tab'
import { ExpiringSoonTab } from './expiry-tabs/expiring-soon-tab'
import { ExpiringWeekTab } from './expiry-tabs/expiring-week-tab'
import { ExpiredTab } from './expiry-tabs/expired-tab'
import { useExpiryTodosSummary } from '@/hooks/use-expiry-todos-summary'

export type ExpiryTabType = 'expiring_today' | 'expiring_soon' | 'expiring_week' | 'expired'

interface TodosExpiryListProps {
  initialFilters?: {
    tab?: string
    urgency?: string[]
    actionType?: string[]
    productName?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
}

export function TodosExpiryList({ initialFilters, pageSize = 20 }: TodosExpiryListProps) {
  const t = useTranslations('todos')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isMobile } = useMediaQuery()

  const [activeTab, setActiveTab] = useState<ExpiryTabType>(
    (initialFilters?.tab as ExpiryTabType) || 'expiring_today',
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
  // Track when we're syncing state from URL to prevent infinite loops
  const isSyncingFromUrl = useRef(false)

  // Unified filter state with stable default sort config
  const defaultSortConfig = useMemo(
    () => ({
      field: 'expiry_date' as const,
      direction: 'asc' as const,
    }),
    [],
  )

  const [filters, setFilters] = useState<TodoFiltersState>(() => {
    // Validate urgency levels from URL params
    const validUrgencyLevels = initialFilters?.urgency
      ?.filter(u => isUrgencyLevel(u))
      .map(u => u as TodoUrgencyLevel)

    // Validate action types from URL params
    const validActionTypes = initialFilters?.actionType
      ?.filter(a => isActionType(a))
      .map(a => a as TodoActionType)

    return {
      urgency_level:
        validUrgencyLevels && validUrgencyLevels.length > 0 ? validUrgencyLevels : undefined,
      action_type: validActionTypes && validActionTypes.length > 0 ? validActionTypes : undefined,
      product_name: initialFilters?.productName || undefined,
      sortConfig: initialFilters?.sort
        ? {
            field: initialFilters.sort as SortField,
            direction: (initialFilters.direction as SortDirection) || 'asc',
          }
        : defaultSortConfig,
    }
  })

  // Fetch expiry summary for tab counts (single API call)
  const { data: expiryCount } = useExpiryTodosSummary()

  // Track counts from summary
  const [tabCounts, setTabCounts] = useState<Record<ExpiryTabType, number>>({
    expiring_today: 0,
    expiring_soon: 0,
    expiring_week: 0,
    expired: 0,
  })

  // Update tab counts from summary
  useEffect(() => {
    if (expiryCount) {
      setTabCounts({
        expiring_today: expiryCount.expiring_today,
        expiring_soon: expiryCount.expiring_soon,
        expiring_week: expiryCount.expiring_week,
        expired: expiryCount.expired,
      })
    }
  }, [expiryCount])

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: 'expiring_today' as ExpiryTabType,
        label: t('tabs.expiringToday'),
        count: tabCounts.expiring_today,
        component: ExpiringTodayTab,
      },
      {
        id: 'expiring_soon' as ExpiryTabType,
        label: t('tabs.expiringSoon'),
        count: tabCounts.expiring_soon,
        component: ExpiringSoonTab,
      },
      {
        id: 'expiring_week' as ExpiryTabType,
        label: t('tabs.expiringWeek'),
        count: tabCounts.expiring_week,
        component: ExpiringWeekTab,
      },
      {
        id: 'expired' as ExpiryTabType,
        label: t('tabs.expired'),
        count: tabCounts.expired,
        component: ExpiredTab,
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

  // Sync state with URL when user navigates back/forward
  useEffect(() => {
    // Skip during initialization to avoid conflicts
    if (!isInitialized) {
      return
    }

    // Mark that we're syncing from URL
    isSyncingFromUrl.current = true

    const urlTab = searchParams.get('tab') as ExpiryTabType | null
    const urlUrgency = searchParams.get('urgency')?.split(',')
    const urlActionType = searchParams.get('actionType')?.split(',')
    const urlProductName = searchParams.get('productName')
    const urlSort = searchParams.get('sort')
    const urlDirection = searchParams.get('direction')

    // Update tab from URL (React will bail out if value hasn't changed)
    const newTab = (urlTab as ExpiryTabType) || 'expiring_today'
    setActiveTab(newTab)

    // Update filters if they changed in URL
    const validUrgencyLevels = urlUrgency
      ?.filter(u => isUrgencyLevel(u))
      .map(u => u as TodoUrgencyLevel)

    const validActionTypes = urlActionType
      ?.filter(a => isActionType(a))
      .map(a => a as TodoActionType)

    setFilters(prev => ({
      ...prev,
      urgency_level:
        validUrgencyLevels && validUrgencyLevels.length > 0 ? validUrgencyLevels : undefined,
      action_type: validActionTypes && validActionTypes.length > 0 ? validActionTypes : undefined,
      product_name: urlProductName || undefined,
      sortConfig: urlSort
        ? {
            field: urlSort as SortField,
            direction: (urlDirection as SortDirection) || 'asc',
          }
        : defaultSortConfig,
    }))

    // Reset the flag after state updates complete
    const timeoutId = setTimeout(() => {
      isSyncingFromUrl.current = false
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      isSyncingFromUrl.current = false
    }
  }, [searchParams, isInitialized, defaultSortConfig])

  // Update URL when tab or filters change (only after initialization)
  useEffect(() => {
    // Skip URL update until component is initialized to prevent loops
    if (!isInitialized) {
      return
    }

    // Skip if we're currently syncing from URL to prevent infinite loops
    if (isSyncingFromUrl.current) {
      return
    }

    const params = new URLSearchParams()

    // Update tab
    if (activeTab !== 'expiring_today') {
      params.set('tab', activeTab)
    }

    // Update filters
    if (filters.urgency_level?.length) {
      params.set('urgency', filters.urgency_level.join(','))
    }

    if (filters.action_type?.length) {
      params.set('actionType', filters.action_type.join(','))
    }

    if (filters.product_name) {
      params.set('productName', filters.product_name)
    }

    if (filters.sortConfig) {
      params.set('sort', filters.sortConfig.field)
      params.set('direction', filters.sortConfig.direction)
    }

    // Only update URL if it's different from current URL
    const newUrl = `?${params.toString()}`
    const currentUrl = `?${searchParams.toString()}`
    if (newUrl !== currentUrl) {
      router.push(newUrl, { scroll: false })
    }
  }, [activeTab, filters, router, isInitialized, searchParams])

  const handleTabChange = (tabId: ExpiryTabType) => {
    setActiveTab(tabId)
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
          <div className="flex gap-2 sm:gap-8 min-w-max px-2 sm:px-0" role="tablist">
            {tabs.map((tab, index) => (
              <Button
                key={tab.id}
                id={`tab-${tab.id}`}
                ref={(el: HTMLButtonElement | null) => {
                  buttonRefs.current[index] = el
                }}
                variant="ghost"
                size={isMobile ? 'sm' : 'lg'}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={cn(
                  'rounded-none select-none relative flex flex-col-reverse sm:flex-row items-center pb-4 gap-1 min-w-0 flex-shrink-0',
                  'hover:bg-transparent group/tab',
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/90',
                )}
              >
                <span className="text-sm sm:text-base font-medium truncate max-w-[80px] sm:max-w-none">
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
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-border" />
        <div
          className="absolute bottom-0 h-[2px] bg-primary/85 transition-all duration-300 ease-in-out z-10 rounded-full overflow-hidden"
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
      <div className="w-full pt-2">
        {/* Keep all tab components mounted but only show the active one */}
        <div
          id="tabpanel-expiring_today"
          role="tabpanel"
          aria-labelledby="tab-expiring_today"
          style={{
            display: activeTab === 'expiring_today' ? 'block' : 'none',
          }}
        >
          <ExpiringTodayTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          id="tabpanel-expiring_soon"
          role="tabpanel"
          aria-labelledby="tab-expiring_soon"
          style={{
            display: activeTab === 'expiring_soon' ? 'block' : 'none',
          }}
        >
          <ExpiringSoonTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          id="tabpanel-expiring_week"
          role="tabpanel"
          aria-labelledby="tab-expiring_week"
          style={{
            display: activeTab === 'expiring_week' ? 'block' : 'none',
          }}
        >
          <ExpiringWeekTab filters={filters} pageSize={pageSize} />
        </div>

        <div
          id="tabpanel-expired"
          role="tabpanel"
          aria-labelledby="tab-expired"
          style={{
            display: activeTab === 'expired' ? 'block' : 'none',
          }}
        >
          <ExpiredTab filters={filters} pageSize={pageSize} />
        </div>
      </div>
    </div>
  )
}
