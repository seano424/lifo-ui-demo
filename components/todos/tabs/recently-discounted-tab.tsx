'use client'

import { useEffect } from 'react'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { useFlattenedTodosData, useRecentlyDiscounted } from '@/hooks/use-todos-rpc'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'

interface RecentlyDiscountedTabProps {
  filters: TodoFilters
  pageSize?: number
}

export function RecentlyDiscountedTab({ pageSize = 20 }: RecentlyDiscountedTabProps) {
  const activeStoreId = useActiveStoreId()

  // Fetch recently discounted items using the new hook
  const discountedQuery = useRecentlyDiscounted(activeStoreId || '', {
    limit: pageSize,
    enabled: !!activeStoreId,
  })

  const { isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = discountedQuery

  // Flatten the infinite query data - pass the complete query object
  const discountedItems = useFlattenedTodosData<{
    batch_id: string
    batch_number: string
    product_name: string
    product_brand: string
    expiry_date: string
    current_quantity: number
    last_discount_percent: number
    last_action_time: string
    hours_since_last_action: number
    total_discounted_quantity: number
    total_count: number
  }>(discountedQuery)

  // Intersection observer for auto-loading more items
  const { targetRef, isIntersecting } = useIntersectionObserver({
    enabled: hasNextPage && !isFetchingNextPage,
    rootMargin: DEFAULT_ROOT_MARGIN,
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Helper function to get urgency based on hours since action
  const getActionUrgency = (hoursSince: number) => {
    if (hoursSince < 2) return 'green' // Very recent
    if (hoursSince < 6) return 'blue' // Recent
    return 'secondary' // Older
  }

  // Helper function to format time since action
  const formatTimeSince = (hoursSince: number) => {
    if (hoursSince < 1) return 'Just now'
    if (hoursSince < 24) return `${Math.floor(hoursSince)}h ago`
    const days = Math.floor(hoursSince / 24)
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex flex-col gap-16">
          {Array.from({ length: 4 }, () => (
            <div key={crypto.randomUUID()} className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48 bg-muted animate-pulse" />
                    <Skeleton className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
                    <Skeleton className="h-4 w-24 bg-muted animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 py-8 text-center">
        <p className="text-destructive">Error loading discounted items: {error.message}</p>
      </div>
    )
  }

  if (discountedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No recently discounted items</p>
        <p className="text-sm text-muted-foreground mt-2">
          Discounted items will appear here when actions are taken on suggestions.
        </p>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="p-4">
        <div className="space-y-4 flex flex-col">
          <div className="flex flex-col gap-6">
            {discountedItems.map(item => (
              <Card key={item.batch_id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{item.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.product_brand} • Batch #{item.batch_number}
                      </p>
                    </div>
                    <Badge variant={getActionUrgency(item.hours_since_last_action)}>
                      {formatTimeSince(item.hours_since_last_action)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Discount Applied:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {item.last_discount_percent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Quantity:</span>
                      <span className="ml-2 font-medium">{item.current_quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="ml-2 font-medium">
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Discounted:</span>
                      <span className="ml-2 font-medium">{item.total_discounted_quantity}</span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg text-sm',
                      item.hours_since_last_action < 6
                        ? 'bg-green-50 text-green-800'
                        : 'bg-yellow-50 text-yellow-800',
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        item.hours_since_last_action < 6 ? 'bg-green-500' : 'bg-yellow-500',
                      )}
                    />
                    <span>
                      {item.hours_since_last_action < 6
                        ? 'Recently discounted - monitor for sales'
                        : 'Monitor effectiveness - consider additional action if not selling'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasNextPage && (
            <div
              ref={targetRef}
              className="flex justify-center items-center pt-8 pb-4 min-h-[60px]"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading more discounted items...</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground opacity-60">
                  Scroll to load more ({discountedItems.length} loaded)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InfiniteScrollErrorBoundary>
  )
}
