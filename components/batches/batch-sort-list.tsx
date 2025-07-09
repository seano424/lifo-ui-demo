// components/batches/batch-sort-list.tsx - Store-aware batch sorting (following product pattern)

'use client'

import { useState } from 'react'
import { BatchListPresentation } from '@/components/batches/batch-list-presentation'
import { BatchSortToolbar, QuickBatchSortButtons } from '@/components/batches/batch-sort-toolbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useBatchesWithSort } from '@/hooks/use-batches'
import { Filter } from 'lucide-react'
import type { BatchSort } from '@/lib/queries/batches'

interface BatchSortListProps {
  initialSort?: BatchSort
  pageSize?: number
  showQuickSortByDefault?: boolean
}

export function BatchSortList({
  initialSort = { field: 'expiry_date', direction: 'asc' },
  pageSize = 20,
  showQuickSortByDefault = false,
}: BatchSortListProps) {
  const [showQuickSort, setShowQuickSort] = useState(showQuickSortByDefault)

  // Use the enhanced hook with sorting
  const {
    data,
    count,
    isLoading,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    currentSort,
    setSort,
  } = useBatchesWithSort(initialSort, pageSize)

  const handleSortChange = (newSort: BatchSort) => {
    setSort(newSort)
  }

  const toggleQuickSort = () => {
    setShowQuickSort(!showQuickSort)
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <BatchSortToolbar
          currentSort={currentSort}
          onSortChange={handleSortChange}
          totalCount={count}
          isLoading={isLoading}
        />

        {/* Quick Sort Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleQuickSort}
          disabled={isLoading}
          className="w-fit"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showQuickSort ? 'Hide' : 'Show'} Quick Sort
        </Button>
      </div>

      {/* Quick Sort Buttons (Collapsible) */}
      {showQuickSort && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Sort Options</CardTitle>
            <CardDescription>Common sorting presets for faster batch navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickBatchSortButtons
              currentSort={currentSort}
              onSortChange={handleSortChange}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Batches List - Use presentation component with controlled data */}
      <BatchListPresentation
        data={data}
        count={count}
        isLoading={isLoading}
        error={error}
        hasMore={hasMore}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        currentSort={currentSort}
        updateSort={field => {
          const newDirection =
            currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
          setSort({ field, direction: newDirection })
        }}
      />
    </div>
  )
}
