'use client'

import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useProductsWithSort } from '@/hooks/use-products'
import type { ProductSort } from '@/lib/queries/products'
import { ProductsListPresentation } from './product-list-presentation'
import { ProductsSortToolbar, QuickSortButtons } from './product-sort-toolbar'

interface ProductSortListProps {
  initialSort?: ProductSort
  pageSize?: number
  showQuickSortByDefault?: boolean
}

export function ProductSortList({
  initialSort = { field: 'created_at', direction: 'desc' },
  pageSize = 20,
  showQuickSortByDefault = false,
}: ProductSortListProps) {
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
  } = useProductsWithSort(initialSort, pageSize)

  const handleSortChange = (newSort: ProductSort) => {
    setSort(newSort)
  }

  const toggleQuickSort = () => {
    setShowQuickSort(!showQuickSort)
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ProductsSortToolbar
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
            <CardDescription>Common sorting presets for faster navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickSortButtons
              currentSort={currentSort}
              onSortChange={handleSortChange}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Products List - Use presentation component with controlled data */}

      <ProductsListPresentation
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
