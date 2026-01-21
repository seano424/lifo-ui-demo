'use client'

import { AlertCircle, CheckCircle, Filter, Package, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { TodoSearchBar } from '@/components/todos/filters/todo-search-bar'
import { BatchCreationSheet, DraftBatchCard } from '@/components/batch-creation'
import {
  useIgnoredBatchesByProduct,
  useIgnoredBatchesSummary,
  type ProductWithIgnoredBatches,
} from '@/hooks/use-ignored-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { ProductWithDraftBatches } from '@/hooks/use-draft-batches'

/**
 * Transform ProductWithIgnoredBatches to ProductWithDraftBatches
 * This allows us to reuse the BatchCreationSheet component for ignored batches
 */
function transformIgnoredProductToDraftProduct(
  product: ProductWithIgnoredBatches,
): ProductWithDraftBatches {
  return {
    product_id: product.product_id,
    product_name: product.product_name,
    product_brand: product.product_brand,
    category_name: product.category_name,
    typical_shelf_life_days: product.typical_shelf_life_days,
    draft_batch_count: product.ignored_batch_count,
    total_draft_quantity: product.total_ignored_quantity,
    draft_batches: product.ignored_batches.map(batch => ({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      quantity: batch.quantity,
      received_date: batch.received_date,
      created_at: batch.created_at,
    })),
    last_expiry_days: null,
    last_batch_expiry_date: null,
    total_count: product.total_count,
  }
}

interface IgnoredBatchesFilteredListProps {
  initialFilters?: {
    category?: string
    search?: string
  }
  pageSize?: number
}

interface IgnoredBatchFilters {
  storeId?: string
  category_codes?: string[]
  search?: string
  limit?: number
  offset?: number
}

const ITEMS_PER_PAGE = 20

export function IgnoredBatchesFilteredList({
  initialFilters,
  pageSize = ITEMS_PER_PAGE,
}: IgnoredBatchesFilteredListProps) {
  const router = useRouter()
  const activeStoreId = useActiveStoreId()

  // State
  const [filters, setFilters] = useState<IgnoredBatchFilters>(() => {
    const baseFilters: IgnoredBatchFilters = {
      storeId: activeStoreId || undefined,
    }

    if (initialFilters?.category) {
      baseFilters.category_codes = [initialFilters.category]
    }

    if (initialFilters?.search) {
      baseFilters.search = initialFilters.search
    }

    return baseFilters
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilters?.category ? [initialFilters.category] : [],
  )
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDraftBatches | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Fetch summary data
  const { data: summary, isLoading: isSummaryLoading } = useIgnoredBatchesSummary(
    activeStoreId || undefined,
  )

  // Fetch ignored batches by product
  const {
    data: products,
    isLoading: isProductsLoading,
    error: productsError,
  } = useIgnoredBatchesByProduct(
    {
      category_codes: selectedCategories.length > 0 ? selectedCategories : undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: filters.search || undefined,
    },
    activeStoreId || undefined,
  )

  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeStoreId || undefined }))
  }, [activeStoreId])

  // Calculate pagination
  const totalProducts = products?.[0]?.total_count || 0
  const totalPages = Math.ceil(totalProducts / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Get unique categories from summary
  const categories = summary?.by_category || []

  // Handlers
  const handleCategoryToggle = (categoryCode: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryCode) ? prev.filter(c => c !== categoryCode) : [...prev, categoryCode],
    )
    setCurrentPage(1) // Reset to first page when filtering
  }

  const updateFilters = useCallback(
    (newFilters: Partial<IgnoredBatchFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }))

      // Update URL params
      const params = new URLSearchParams(window.location.search)

      if (newFilters.category_codes !== undefined) {
        if (newFilters.category_codes && newFilters.category_codes.length > 0) {
          params.set('category', newFilters.category_codes[0])
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

      router.replace(`?${params.toString()}`)
    },
    [router],
  )

  const handleSearchChange = useCallback(
    (searchTerm: string | undefined) => {
      updateFilters({ search: searchTerm })
      setCurrentPage(1)
    },
    [updateFilters],
  )

  const handleOpenSheet = (product: ProductWithIgnoredBatches) => {
    const transformedProduct = transformIgnoredProductToDraftProduct(product)
    setSelectedProduct(transformedProduct)
    setIsSheetOpen(true)
  }

  const handleSheetComplete = () => {
    setSelectedProduct(null)
    setIsSheetOpen(false)
  }

  const isLoading = isSummaryLoading || isProductsLoading
  const totalIgnored = summary?.total_ignored_batches || 0
  const totalUnits = summary?.total_units || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Ignored Batches
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
            Batches you chose to skip. Restore them to continue setup.
          </p>
        </div>

        {/* Summary Stats */}
        {!isLoading && totalIgnored > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-base px-3 py-1.5">
              <Package className="h-4 w-4 mr-2" />
              {totalIgnored} {totalIgnored === 1 ? 'batch' : 'batches'}
            </Badge>
            <Badge variant="outline" className="text-base px-3 py-1.5">
              {totalUnits} units
            </Badge>
          </div>
        )}
      </div>

      {/* Control bar - Search and Filters */}
      <div className="flex flex-row flex-wrap lg:items-center lg:gap-4 gap-3">
        {/* Search Bar */}
        <div className="flex-1">
          <TodoSearchBar
            searchTerm={filters.search}
            onSearchChange={handleSearchChange}
            isLoading={false}
            placeholder="Search ignored batches..."
            size="large"
          />
        </div>

        {/* Category Filter */}
        {!isLoading && categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Category
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map(category => (
                <DropdownMenuCheckboxItem
                  key={category.category_code}
                  checked={selectedCategories.includes(category.category_code)}
                  onCheckedChange={() => handleCategoryToggle(category.category_code)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{category.category_name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {category.ignored_count}
                    </Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Active Filter Pills */}
        {selectedCategories.length > 0 && (
          <>
            {selectedCategories.map(code => {
              const category = categories.find(c => c.category_code === code)
              return category ? (
                <Badge key={code} variant="secondary" className="gap-1 pr-1">
                  {category.category_name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleCategoryToggle(code)}
                  >
                    <Plus className="h-3 w-3 rotate-45" />
                  </Button>
                </Badge>
              ) : null
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategories([])
                setCurrentPage(1)
              }}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          </>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Error State */}
      {productsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load ignored batches. Please try again.</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !productsError && totalIgnored === 0 && (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No ignored batches
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400 max-w-md">
              All your deliveries are being tracked. Batches you ignore will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {!isLoading && !productsError && products && products.length > 0 && (
        <>
          <div className="space-y-4">
            {products.map(product => (
              <DraftBatchCard
                key={product.product_id}
                product={transformIgnoredProductToDraftProduct(product)}
                onClick={() => handleOpenSheet(product)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={!hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Batch Creation Sheet */}
      <BatchCreationSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        storeId={activeStoreId || ''}
        singleProduct={selectedProduct || undefined}
        onComplete={handleSheetComplete}
        hideIgnoreButton={true}
      />
    </div>
  )
}
