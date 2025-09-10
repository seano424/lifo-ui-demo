'use client'

import { AlertTriangle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { BatchListFilters } from '@/components/batches/batch-list-filters'
import { BatchListSortControls } from '@/components/batches/batch-list-sort-controls'
import { BatchTable } from '@/components/batches/batch-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useBatches } from '@/hooks/use-batches'
import type {
  BatchFilters,
  BatchSort,
  BatchSortField,
} from '@/lib/queries/batches'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface BatchesFilteredListProps {
  initialFilters?: {
    filter?: string
    expiringDays?: string
    status?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
}

export function BatchesFilteredList({
  initialFilters,
  pageSize = 20,
}: BatchesFilteredListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStoreId = useActiveStoreId()
  const t = useTranslations('batches.table')

  const [filters, setFilters] = useState<BatchFilters>(() => {
    const baseFilters: BatchFilters = {
      storeId: activeStoreId || undefined,
    }

    if (initialFilters?.filter === 'expiring') {
      baseFilters.expiringInDays = parseInt(
        initialFilters.expiringDays || '7',
        10
      )
    }

    if (initialFilters?.status) {
      baseFilters.status = initialFilters.status as
        | 'active'
        | 'expired'
        | 'damaged'
        | 'sold_out'
        | 'reserved'
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

  const {
    data,
    count,
    isLoading,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
  } = useBatches(filters, pageSize)

  useEffect(() => {
    setFilters((prev) => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  const updateFilters = (newFilters: Partial<BatchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    const params = new URLSearchParams(searchParams.toString())

    if (updatedFilters.expiringInDays) {
      params.set('filter', 'expiring')
      params.set('expiringDays', updatedFilters.expiringInDays.toString())
    } else {
      params.delete('filter')
      params.delete('expiringDays')
    }

    if (updatedFilters.status) {
      params.set('status', updatedFilters.status)
    } else {
      params.delete('status')
    }

    if (updatedFilters.sort) {
      params.set('sort', updatedFilters.sort.field)
      params.set('direction', updatedFilters.sort.direction)
    } else {
      params.delete('sort')
      params.delete('direction')
    }

    router.push(`?${params.toString()}`)
  }

  const handleSortChange = (newSort: BatchSort) => {
    updateFilters({ sort: newSort })
  }

  const handleFiltersChange = (newFilters: {
    expiringInDays?: number
    status?: string
  }) => {
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
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load batches: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <div className="p-4 border-b">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
            <BatchListFilters
              filters={{
                expiringInDays: filters.expiringInDays,
                status: filters.status,
              }}
              onFiltersChange={handleFiltersChange}
              count={count}
              isLoading={isLoading}
            />
            <BatchListSortControls
              currentSort={
                filters.sort || { field: 'created_at', direction: 'desc' }
              }
              updateSort={(field) => {
                const currentSort = filters.sort || {
                  field: 'created_at',
                  direction: 'desc',
                }
                const newDirection =
                  currentSort.field === field && currentSort.direction === 'asc'
                    ? 'desc'
                    : 'asc'
                handleSortChange({ field, direction: newDirection })
              }}
              isLoading={isLoading}
            />
          </div>
        </div>

        <BatchTable
          data={data}
          isLoading={isLoading}
          currentSort={
            filters.sort || { field: 'created_at', direction: 'desc' }
          }
          updateSort={(field) => {
            const currentSort = filters.sort || {
              field: 'created_at',
              direction: 'desc',
            }
            const newDirection =
              currentSort.field === field && currentSort.direction === 'asc'
                ? 'desc'
                : 'asc'
            handleSortChange({ field, direction: newDirection })
          }}
        />
      </Card>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            size="lg"
          >
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
