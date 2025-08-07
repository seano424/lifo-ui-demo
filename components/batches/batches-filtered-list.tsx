'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BatchListPresentation } from '@/components/batches/batch-list-presentation'

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

  // Handle filter changes from the integrated table
  const handleFiltersChange = (newFilters: { expiringInDays?: number; status?: string }) => {
    updateFilters({
      expiringInDays: newFilters.expiringInDays,
      status: newFilters.status as 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved' | undefined,
    })
  }

  return (
    <div>
      {/* Batches List with Fully Integrated Controls */}
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
        filters={{
          expiringInDays: filters.expiringInDays,
          status: filters.status,
        }}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  )
}
