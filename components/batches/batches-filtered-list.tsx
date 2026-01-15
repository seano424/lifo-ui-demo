'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
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
}

export function BatchesFilteredList({ initialFilters, pageSize = 100 }: BatchesFilteredListProps) {
  const router = useRouter()
  const activeStoreId = useActiveStoreId()
  const t = useTranslations('batches.table')
  const tButtons = useTranslations('buttons')

  const [filters, setFilters] = useState<BatchFilters>(() => {
    const baseFilters: BatchFilters = {
      storeId: activeStoreId || undefined,
    }

    // Default to 180 days if no filter is specified
    if (initialFilters?.filter === 'expiring') {
      baseFilters.expiringInDays = parseInt(initialFilters.expiringDays || '180', 10)
    } else if (!initialFilters?.filter) {
      baseFilters.expiringInDays = 180
    }

    if (initialFilters?.status) {
      baseFilters.status = initialFilters.status as
        | 'active'
        | 'expired'
        | 'damaged'
        | 'sold_out'
        | 'reserved'
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
      baseFilters.sort =
        initialFilters?.filter === 'expiring'
          ? { field: 'expiry_date', direction: 'asc' }
          : { field: 'created_at', direction: 'desc' }
    }

    return baseFilters
  })

  const { data, count, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = useBatches(
    filters,
    pageSize,
  )

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

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

      router.replace(`?${params.toString()}`)
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
      updateFilters({
        expiringInDays: newFilters.expiringInDays,
        status: newFilters.status as
          | 'active'
          | 'expired'
          | 'damaged'
          | 'sold_out'
          | 'reserved'
          | undefined,
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load batches: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control bar - Search, Filters, and Sort on same level */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
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
          currentSort={filters.sort || { field: 'created_at', direction: 'desc' }}
          updateSort={field => {
            const currentSort = filters.sort || {
              field: 'created_at',
              direction: 'desc',
            }
            const newDirection =
              currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
            handleSortChange({ field, direction: newDirection })
          }}
          isLoading={isLoading}
        />

        {/* Add Batch Button */}
        <Link href="/dashboard/deliveries">
          <Button>{tButtons('addBatch')}</Button>
        </Link>
      </div>

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto">
        <BatchTable
          data={data}
          isLoading={isLoading}
          currentSort={filters.sort || { field: 'created_at', direction: 'desc' }}
          updateSort={field => {
            const currentSort = filters.sort || {
              field: 'created_at',
              direction: 'desc',
            }
            const newDirection =
              currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
            handleSortChange({ field, direction: newDirection })
          }}
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
