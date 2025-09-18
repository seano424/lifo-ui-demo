'use client'

import { useEffect } from 'react'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InfiniteScrollErrorBoundary } from '@/components/ui/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { useDonatedItems, useFlattenedTodosData } from '@/hooks/use-todos-rpc'
import { DEFAULT_ROOT_MARGIN } from '@/lib/constants/todos'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface RecentlyDonatedTabProps {
  filters: TodoFilters
  pageSize?: number
}

export function RecentlyDonatedTab({ pageSize = 20 }: RecentlyDonatedTabProps) {
  const activeStoreId = useActiveStoreId()

  // Fetch recently donated items using the new hook
  const donatedQuery = useDonatedItems(activeStoreId || '', {
    limit: pageSize,
    daysBack: 30,
    enabled: !!activeStoreId,
  })

  const { isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = donatedQuery

  // Flatten the infinite query data - pass the complete query object
  const donatedItems = useFlattenedTodosData<{
    batch_id: string
    batch_number: string
    product_name: string
    product_brand: string
    expiry_date: string
    quantity_donated: number
    donation_recipient_name: string
    donated_at: string
    notes: string
    total_count: number
  }>(donatedQuery)

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

  // Helper function to get time since donation
  const getTimeSinceDonation = (donatedAt: string) => {
    const donationDate = new Date(donatedAt)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - donationDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just donated'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const days = Math.floor(diffInHours / 24)
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  // Helper function to get urgency badge variant based on time
  const getTimeBadgeVariant = (donatedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(donatedAt).getTime()) / (1000 * 60 * 60))
    if (hours < 24) return 'green' // Recent
    if (hours < 72) return 'secondary' // A few days
    return 'outline' // Older
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
        <p className="text-destructive">Error loading donated items: {error.message}</p>
      </div>
    )
  }

  if (donatedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="text-4xl mb-2">🤝</div>
          <p className="text-muted-foreground">No recent donations</p>
          <p className="text-sm text-muted-foreground mt-2">
            Donated items will appear here when you choose donation as an action.
          </p>
        </div>
      </div>
    )
  }

  return (
    <InfiniteScrollErrorBoundary>
      <div className="p-4">
        <div className="space-y-4 flex flex-col">
          <div className="flex flex-col gap-6">
            {donatedItems.map(item => (
              <Card
                key={`${item.batch_id}-${item.donated_at}`}
                className="transition-all duration-200 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🤝</span>
                        <h3 className="font-medium text-lg">{item.product_name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.product_brand} • Batch #{item.batch_number}
                      </p>
                    </div>
                    <Badge variant={getTimeBadgeVariant(item.donated_at)}>
                      {getTimeSinceDonation(item.donated_at)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity Donated:</span>
                      <span className="ml-2 font-semibold text-blue-600">
                        {item.quantity_donated}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="ml-2 font-medium text-blue-700">
                        {item.donation_recipient_name || 'Unknown Recipient'}
                      </span>
                    </div>
                  </div>

                  {/* Notes section */}
                  {item.notes && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Notes:</h4>
                      <p className="text-sm text-blue-700">{item.notes}</p>
                    </div>
                  )}

                  {/* Impact indicator */}
                  <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-green-50 text-green-800">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Positive impact: {item.quantity_donated} units prevented from waste</span>
                  </div>

                  {/* Donation date */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Donated on {new Date(item.donated_at).toLocaleDateString()} at{' '}
                    {new Date(item.donated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
                  <span className="text-sm">Loading more donated items...</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground opacity-60">
                  Scroll to load more ({donatedItems.length} loaded)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InfiniteScrollErrorBoundary>
  )
}
