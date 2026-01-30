'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Filter, PartyPopper, Plus } from 'lucide-react'
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
import { TodoSearchBar } from '@/components/todos/filters/todo-search-bar'
import {
  useDraftBatchesByProduct,
  useDraftBatchesSummary,
  type ProductWithDraftBatches,
} from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'

const ITEMS_PER_PAGE = 20

export default function NewBatchesPage() {
  const storeId = useActiveStoreId()
  const router = useRouter()
  const t = useTranslations('dashboard.newDeliveries')
  // State
  const [filters, setFilters] = useState<{
    category_codes?: string[]
    search?: string
  }>(() => ({
    category_codes: undefined,
    search: undefined,
  }))
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
      search: filters.search || undefined,
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
  const updateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
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

  const handleCategoryToggle = (categoryCode: string) => {
    setSelectedCategories(prev => {
      const updated = prev.includes(categoryCode)
        ? prev.filter(c => c !== categoryCode)
        : [...prev, categoryCode]

      updateFilters({ category_codes: updated.length > 0 ? updated : undefined })
      return updated
    })
    setCurrentPage(1)
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
    <div className="container flex flex-col gap-4 py-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h3">{t('title')}</Typography>

        {/* Summary Stats */}
        {!isLoading && totalDrafts > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="primary">
              {totalDrafts} {totalDrafts === 1 ? 'batch' : 'batches'}
            </Badge>
            <Badge variant="primary">{totalUnits} units</Badge>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-row flex-wrap lg:items-center lg:gap-4 gap-3 bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
        {/* Search Bar */}
        <div className="flex-1">
          <TodoSearchBar
            searchTerm={filters.search}
            onSearchChange={handleSearchChange}
            isLoading={false}
            placeholder="Search batches..."
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
                      {category.draft_count}
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
              onClick={() => setSelectedCategories([])}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          </>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-4">
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
            <div className="rounded-full bg-primary-50 dark:bg-primary-900/20 p-4 mb-4">
              <PartyPopper className="h-12 w-12 text-primary dark:text-primary-400" />
            </div>
            <Typography variant="h3">No new deliveries!</Typography>
            <Typography variant="p" color="muted">
              All your batches have expiry dates assigned. New deliveries will appear here.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {!isLoading && !productsError && products && products.length > 0 && (
        <>
          <div className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
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
              <Typography variant="p" color="muted">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} of {totalProducts} products
              </Typography>
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
