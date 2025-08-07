'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BatchListPresentation } from '@/components/batches/batch-list-presentation'
import { BatchSortToolbar } from '@/components/batches/batch-sort-toolbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBatches } from '@/hooks/use-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { X, Filter, AlertTriangle, Clock } from 'lucide-react'
import type { BatchSort, BatchFilters, BatchSortField } from '@/lib/queries/batches'
import { cn } from '@/lib/utils'

interface InitialFilters {
  filter?: string
  expiringDays?: string
  status?: string
  sort?: string
  direction?: string
}

interface BatchesFilteredListProps {
  initialFilters?: InitialFilters
  pageSize?: number
}

export function BatchesFilteredList({ initialFilters, pageSize = 20 }: BatchesFilteredListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStoreId = useActiveStoreId()

  // Parse initial filters from URL or props
  const [filters, setFilters] = useState<BatchFilters>(() => {
    const baseFilters: BatchFilters = {
      storeId: activeStoreId || undefined,
    }

    // Apply expiring filter
    if (initialFilters?.filter === 'expiring') {
      baseFilters.expiringInDays = parseInt(initialFilters.expiringDays || '7')
    }

    // Apply status filter
    if (initialFilters?.status) {
      baseFilters.status = initialFilters.status as any
    }

    // Apply sorting
    if (initialFilters?.sort) {
      baseFilters.sort = {
        field: initialFilters.sort as BatchSortField,
        direction: (initialFilters.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      // Default sort for expiring items
      baseFilters.sort =
        initialFilters?.filter === 'expiring'
          ? { field: 'expiry_date', direction: 'asc' }
          : { field: 'created_at', direction: 'desc' }
    }

    return baseFilters
  })

  // Use the batches hook with current filters
  const { data, count, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = useBatches(
    filters,
    pageSize,
  )

  // Update filters when store changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Handle filter changes
  const updateFilters = (newFilters: Partial<BatchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    // Update URL params
    const params = new URLSearchParams(searchParams.toString())

    // Handle expiring filter
    if (updatedFilters.expiringInDays) {
      params.set('filter', 'expiring')
      params.set('expiringDays', updatedFilters.expiringInDays.toString())
    } else {
      params.delete('filter')
      params.delete('expiringDays')
    }

    // Handle status filter
    if (updatedFilters.status) {
      params.set('status', updatedFilters.status)
    } else {
      params.delete('status')
    }

    // Handle sorting
    if (updatedFilters.sort) {
      params.set('sort', updatedFilters.sort.field)
      params.set('direction', updatedFilters.sort.direction)
    } else {
      params.delete('sort')
      params.delete('direction')
    }

    router.push(`?${params.toString()}`)
  }

  // Clear all filters
  const clearFilters = () => {
    const baseFilters: BatchFilters = {
      storeId: activeStoreId || undefined,
      sort: { field: 'created_at', direction: 'desc' },
    }
    setFilters(baseFilters)
    router.push('/dashboard/inventory/batches')
  }

  // Handle sort changes
  const handleSortChange = (newSort: BatchSort) => {
    updateFilters({ sort: newSort })
  }

  // Check if any filters are active
  const hasActiveFilters = filters.expiringInDays || filters.status

  return (
    <div className="space-y-6">
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base">Active Filters</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-orange-700 hover:bg-orange-100"
              >
                Clear All
                <X className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filters.expiringInDays && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Expiring within {filters.expiringInDays} days
                  <button
                    onClick={() => updateFilters({ expiringInDays: undefined })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <button
                    onClick={() => updateFilters({ status: undefined })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <BatchSortToolbar
          currentSort={filters.sort || { field: 'created_at', direction: 'desc' }}
          onSortChange={handleSortChange}
          totalCount={count}
          isLoading={isLoading}
        />

        {/* Quick Filters */}
        <div className="flex gap-2">
          {/* Expiring Days Filter */}
          <Select
            value={filters.expiringInDays?.toString() || 'all'}
            onValueChange={value =>
              updateFilters({
                expiringInDays: value === 'all' ? undefined : parseInt(value),
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Expiry filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="3">Expiring in 3 days</SelectItem>
              <SelectItem value="7">Expiring in 7 days</SelectItem>
              <SelectItem value="14">Expiring in 14 days</SelectItem>
              <SelectItem value="30">Expiring in 30 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={value =>
              updateFilters({
                status: value === 'all' ? undefined : (value as any),
              })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="sold_out">Sold Out</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Special message for expiring items */}
      {filters.expiringInDays && data.length > 0 && (
        <Card
          className={cn(
            'border-l-4',
            filters.expiringInDays <= 3
              ? 'border-l-red-500 bg-red-50/50'
              : 'border-l-orange-500 bg-orange-50/50',
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock
                className={cn(
                  'h-5 w-5',
                  filters.expiringInDays <= 3 ? 'text-red-600' : 'text-orange-600',
                )}
              />
              <CardDescription
                className={cn(
                  'text-sm font-medium',
                  filters.expiringInDays <= 3 ? 'text-red-900' : 'text-orange-900',
                )}
              >
                {count} {count === 1 ? 'item' : 'items'} expiring within {filters.expiringInDays}{' '}
                days
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Batches List */}
      <BatchListPresentation
        data={data}
        count={count}
        isLoading={isLoading}
        error={error}
        hasMore={hasMore}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        currentSort={filters.sort || { field: 'created_at', direction: 'desc' }}
        updateSort={field => {
          const currentSort = filters.sort || { field: 'created_at', direction: 'desc' }
          const newDirection =
            currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
          handleSortChange({ field, direction: newDirection })
        }}
      />
    </div>
  )
}

