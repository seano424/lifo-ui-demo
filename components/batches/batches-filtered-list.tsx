'use client'

import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { BatchListFilters } from '@/components/batches/batch-list-filters'
import { BatchListSortControls } from '@/components/batches/batch-list-sort-controls'
import { BatchTable } from '@/components/batches/batch-table'
import { TodoSearchBar } from '@/components/todos/filters/todo-search-bar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useBatches } from '@/hooks/use-batches'
import type { BatchFilters, BatchSort, BatchSortField } from '@/lib/queries/batches'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface BatchesFilteredListProps {
  initialFilters?: {
    filter?: string
    expiringDays?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
  highlightExpiring?: boolean
  expiryAlertDays?: number
  showControls?: boolean
  expiringDays?: number // Controlled prop for external time range changes
  clientSideSort?: boolean // Enable client-side sorting instead of server-side
  clientSideTimeFilter?: boolean // Enable client-side time filtering (loads max range, filters on client)
}

export function BatchesFilteredList({
  initialFilters,
  pageSize = 100,
  highlightExpiring = false,
  expiryAlertDays = 3,
  showControls = true,
  expiringDays,
  clientSideSort = false,
  clientSideTimeFilter = false,
}: BatchesFilteredListProps) {
  const router = useRouter()
  const activeStoreId = useActiveStoreId()
  const t = useTranslations('batches.table')

  const [filters, setFilters] = useState<BatchFilters>(() => {
    const baseFilters: BatchFilters = {
      storeId: activeStoreId || undefined,
    }

    // Default to 180 days expiring filter
    if (initialFilters?.filter === 'expiring') {
      baseFilters.expiringInDays = parseInt(initialFilters.expiringDays || '180', 10)
    } else if (!initialFilters?.filter) {
      baseFilters.expiringInDays = 180
    }

    // Default to active status
    if (initialFilters?.status) {
      baseFilters.status = initialFilters.status as
        | 'active'
        | 'expired'
        | 'damaged'
        | 'sold_out'
        | 'reserved'
        | 'ignored'
    } else {
      baseFilters.status = 'active'
    }

    if (initialFilters?.search) {
      baseFilters.search = initialFilters.search
    }

    if (initialFilters?.sort) {
      baseFilters.sort = {
        field: initialFilters.sort as BatchSortField,
        direction: (initialFilters.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      // Default to expiry_date ascending for expiry intelligence focus
      baseFilters.sort = { field: 'expiry_date', direction: 'asc' }
    }

    return baseFilters
  })

  // For client-side sorting, exclude sort from query filters to prevent refetching
  const queryFilters = clientSideSort ? { ...filters, sort: undefined } : filters

  const {
    data: rawData,
    count,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
  } = useBatches(queryFilters, pageSize)

  // Client-side time filtering: filter batches by expiry date if enabled
  const data =
    clientSideTimeFilter && expiringDays !== undefined
      ? rawData.filter(batch => {
          if (!batch.expiry_date) return false
          const expiryDate = new Date(batch.expiry_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          expiryDate.setHours(0, 0, 0, 0)
          const daysToExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          )
          return daysToExpiry >= 0 && daysToExpiry <= expiringDays
        })
      : rawData

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Update expiring days filter when controlled prop changes (unless using client-side filtering)
  useEffect(() => {
    if (expiringDays !== undefined && !clientSideTimeFilter) {
      setFilters(prev => ({ ...prev, expiringInDays: expiringDays }))
    }
  }, [expiringDays, clientSideTimeFilter])

  const updateFilters = useCallback(
    (newFilters: Partial<BatchFilters>) => {
      let updatedFilters: BatchFilters = {} as BatchFilters

      setFilters(prev => {
        updatedFilters = { ...prev, ...newFilters }
        return updatedFilters
      })

      // Update URL params after state update
      const params = new URLSearchParams(window.location.search)

      if (newFilters.expiringInDays !== undefined) {
        if (newFilters.expiringInDays) {
          params.set('filter', 'expiring')
          params.set('expiringDays', newFilters.expiringInDays.toString())
        } else {
          params.delete('filter')
          params.delete('expiringDays')
        }
      }

      if (newFilters.status !== undefined) {
        if (newFilters.status) {
          params.set('status', newFilters.status)
        } else {
          params.delete('status')
        }
      }

      if (newFilters.search !== undefined) {
        if (newFilters.search) {
          params.set('search', newFilters.search)
        } else {
          params.delete('search')
        }
      }

      if (newFilters.sort !== undefined) {
        if (newFilters.sort) {
          params.set('sort', newFilters.sort.field)
          params.set('direction', newFilters.sort.direction)
        } else {
          params.delete('sort')
          params.delete('direction')
        }
      }

      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  const handleSortChange = useCallback(
    (newSort: BatchSort) => {
      updateFilters({ sort: newSort })
    },
    [updateFilters],
  )

  const handleFiltersChange = useCallback(
    (newFilters: { expiringInDays?: number; status?: string }) => {
      const statusValue = newFilters.status as
        | 'active'
        | 'expired'
        | 'damaged'
        | 'sold_out'
        | 'reserved'
        | 'ignored'
        | undefined

      updateFilters({
        expiringInDays: newFilters.expiringInDays,
        status: statusValue,
      })
    },
    [updateFilters],
  )

  const handleSearchChange = useCallback(
    (searchTerm: string | undefined) => {
      updateFilters({ search: searchTerm })
    },
    [updateFilters],
  )

  const handleSortFieldChange = useCallback(
    (field: BatchSortField) => {
      const currentSort = filters.sort || {
        field: 'expiry_date',
        direction: 'asc' as const,
      }
      const newDirection =
        currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'

      // For client-side sorting, just update local state without URL/server refetch
      if (clientSideSort) {
        setFilters(prev => ({
          ...prev,
          sort: { field, direction: newDirection },
        }))
      } else {
        handleSortChange({ field, direction: newDirection })
      }
    },
    [filters.sort, handleSortChange, clientSideSort],
  )

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load batches: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Control bar - Search, Filters, and Sort on same level */}
      {showControls && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2 gap-3">
          {/* Search Bar */}
          <div className="flex-1">
            <TodoSearchBar
              searchTerm={filters.search}
              onSearchChange={handleSearchChange}
              isLoading={false}
              placeholder={t('searchPlaceholder')}
              size="large"
            />
          </div>
          <div className="flex items-center gap-1 sm:justify-start justify-between w-full">
            {/* Filters */}
            <BatchListFilters
              filters={{
                expiringInDays: filters.expiringInDays,
                status: filters.status,
              }}
              onFiltersChange={handleFiltersChange}
              isLoading={isLoading}
            />

            {/* Sort Controls */}
            <BatchListSortControls
              currentSort={filters.sort || { field: 'expiry_date', direction: 'asc' }}
              updateSort={handleSortFieldChange}
              isLoading={isLoading}
            />
          </div>

          {/* Add Batch Button */}
          {/* <Link href="/dashboard/deliveries">
          <Button>{tButtons('addBatch')}</Button>
        </Link> */}
        </div>
      )}

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto">
        <BatchTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          hasActiveStore={!!activeStoreId}
          currentSort={filters.sort || { field: 'expiry_date', direction: 'asc' }}
          updateSort={handleSortFieldChange}
          highlightExpiring={highlightExpiring}
          expiryAlertDays={expiryAlertDays}
          clientSideSort={clientSideSort}
        />
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={fetchNextPage} disabled={isFetchingNextPage} size="lg">
            {isFetchingNextPage ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t('loading')}
              </>
            ) : (
              t('loadMore', { remaining: count - data.length })
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
