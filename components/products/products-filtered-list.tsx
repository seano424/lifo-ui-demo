'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { ProductListFilters } from '@/components/products/product-list-filters'
import { ProductListSortControls } from '@/components/products/product-list-sort-controls'
import { ProductsTable } from '@/components/products/products-table'
import { TodoSearchBar } from '@/components/todos/filters/todo-search-bar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/use-products'
import type { ProductFilters, ProductSort, SortField } from '@/lib/queries/products'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ProductsFilteredListProps {
  initialFilters?: {
    category?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }
  pageSize?: number
}

export function ProductsFilteredList({
  initialFilters,
  pageSize = 100,
}: ProductsFilteredListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStoreId = useActiveStoreId()
  const t = useTranslations('products.table')
  const tButtons = useTranslations('buttons')

  const [filters, setFilters] = useState<ProductFilters>(() => {
    const baseFilters: ProductFilters = {
      storeId: activeStoreId || undefined,
    }

    if (initialFilters?.category) {
      baseFilters.category = initialFilters.category
    }

    if (initialFilters?.search) {
      baseFilters.search = initialFilters.search
    }

    if (initialFilters?.sort) {
      baseFilters.sort = {
        field: initialFilters.sort as SortField,
        direction: (initialFilters.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      baseFilters.sort = { field: 'created_at', direction: 'desc' }
    }

    return baseFilters
  })

  const { data, count, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = useProducts(
    filters,
    pageSize,
  )

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  const updateFilters = useCallback(
    (newFilters: Partial<ProductFilters>) => {
      let updatedFilters: ProductFilters = {} as ProductFilters

      setFilters(prev => {
        updatedFilters = { ...prev, ...newFilters }
        return updatedFilters
      })

      // Update URL params after state update
      // Use the updatedFilters from the closure
      const params = new URLSearchParams(searchParams.toString())

      if (newFilters.category !== undefined) {
        if (newFilters.category) {
          params.set('category', newFilters.category)
        } else {
          params.delete('category')
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
    [searchParams, router],
  )

  const handleSortChange = useCallback(
    (newSort: ProductSort) => {
      updateFilters({ sort: newSort })
    },
    [updateFilters],
  )

  const handleFiltersChange = useCallback(
    (newFilters: { category?: string }) => {
      updateFilters({
        category: newFilters.category,
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
        <AlertDescription>Failed to load products: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control bar - Search, Filters, and Sort on same level */}
      <div className="flex flex-row flex-wrap lg:items-center lg:gap-4 gap-3">
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
        <ProductListFilters
          filters={{
            category: filters.category || undefined,
          }}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />

        {/* Sort Controls */}
        <ProductListSortControls
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

        {/* Add Product Button */}
        <Link href="/dashboard/deliveries">
          <Button>{tButtons('addProduct')}</Button>
        </Link>
      </div>

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto">
        <ProductsTable
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
                Loading...
              </>
            ) : (
              `Load More (${count - data.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
