'use client'

import { useState } from 'react'
import { AlertCircle, Filter, Package, PartyPopper, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BatchCreationSheet, DraftBatchCard } from '@/components/batch-creation'
import {
  useDraftBatchesByProduct,
  useDraftBatchesSummary,
  type ProductWithDraftBatches,
} from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'

const ITEMS_PER_PAGE = 20

export default function NewBatchesPage() {
  const storeId = useActiveStoreId()

  // State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDraftBatches | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch summary data
  const { data: summary, isLoading: isSummaryLoading } = useDraftBatchesSummary(
    storeId || undefined,
  )

  // Fetch draft batches by product
  const {
    data: products,
    isLoading: isProductsLoading,
    error: productsError,
  } = useDraftBatchesByProduct(
    {
      category_codes: selectedCategories.length > 0 ? selectedCategories : undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    },
    storeId || undefined,
  )

  // Calculate pagination
  const totalProducts = products?.[0]?.total_count || 0
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE)
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

  const handleOpenSheet = (product: ProductWithDraftBatches) => {
    setSelectedProduct(product)
    setIsSheetOpen(true)
  }

  const handleSheetComplete = () => {
    setSelectedProduct(null)
    setIsSheetOpen(false)
  }

  const isLoading = isSummaryLoading || isProductsLoading
  const totalDrafts = summary?.total_draft_batches || 0
  const totalUnits = summary?.total_units || 0

  return (
    <div className="container space-y-6 md:py-6 lg:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            New Batches
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
            Add expiry dates to activate your inventory
          </p>
        </div>

        {/* Summary Stats */}
        {!isLoading && totalDrafts > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-base px-3 py-1.5">
              <Package className="h-4 w-4 mr-2" />
              {totalDrafts} {totalDrafts === 1 ? 'batch' : 'batches'}
            </Badge>
            <Badge variant="outline" className="text-base px-3 py-1.5">
              {totalUnits} units
            </Badge>
          </div>
        )}
      </div>

      {/* Category Filter */}
      {!isLoading && categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
                      {category.draft_count}
                    </Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
                onClick={() => setSelectedCategories([])}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </>
          )}
        </div>
      )}

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
          <AlertDescription>Failed to load draft batches. Please try again.</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !productsError && totalDrafts === 0 && (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-4 mb-4">
              <PartyPopper className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No draft batches!
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400 max-w-md">
              All your batches have expiry dates assigned. New deliveries will appear here.
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
                product={product}
                onClick={() => handleOpenSheet(product)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} of {totalProducts} products
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
        storeId={storeId || ''}
        singleProduct={selectedProduct || undefined}
        onComplete={handleSheetComplete}
      />
    </div>
  )
}
