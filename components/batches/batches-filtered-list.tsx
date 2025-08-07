'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BatchListPresentation } from '@/components/batches/batch-list-presentation'
import { BatchSortToolbar } from '@/components/batches/batch-sort-toolbar'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBatches } from '@/hooks/use-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'

import type { BatchSort, BatchFilters, BatchSortField } from '@/lib/queries/batches'

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
  // const clearFilters = () => {
  //   const baseFilters: BatchFilters = {
  //     storeId: activeStoreId || undefined,
  //     sort: { field: 'created_at', direction: 'desc' },
  //   }
  //   setFilters(baseFilters)
  //   router.push('/dashboard/inventory/batches')
  // }

  // Handle sort changes
  const handleSortChange = (newSort: BatchSort) => {
    updateFilters({ sort: newSort })
  }

  // Check if any filters are active
  // const hasActiveFilters = filters.expiringInDays || filters.status

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <BatchSortToolbar
          currentSort={filters.sort || { field: 'created_at', direction: 'desc' }}
          onSortChange={handleSortChange}
          totalCount={count}
          isLoading={isLoading}
        />

        {/* Quick Filters: Expiring Days Filter and Status Filter */}
        <div className="flex gap-2">
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
