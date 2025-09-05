'use client'

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Euro,
  MoreHorizontal,
  Package,
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Typography } from '@/components/ui/typography'
import { useProductActions, useProductsWithSort } from '@/hooks/use-products'
import type { SortField } from '@/lib/queries/products'

interface SortableHeaderProps {
  field: SortField
  children: React.ReactNode
  currentSort: ReturnType<typeof useProductsWithSort>['currentSort']
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({ field, children, currentSort, onSort, className }: SortableHeaderProps) {
  const isCurrentField = currentSort.field === field
  const direction = isCurrentField ? currentSort.direction : null

  const getSortIcon = () => {
    if (!isCurrentField) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center">
          {children}
          {getSortIcon()}
        </div>
      </Button>
    </TableHead>
  )
}

export function ProductsList() {
  const t = useTranslations('products')
  const tButtons = useTranslations('buttons')

  const {
    data,
    count,
    isLoading,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    currentSort,
    updateSort,
  } = useProductsWithSort()

  const { deleteProduct, updateProductPrice, isDeleting, isUpdating } = useProductActions()

  const products = useMemo(() => {
    if (!data) return []

    // Create a Map to deduplicate by product_id (keeps the first occurrence)
    const uniqueProductsMap = new Map()

    data.forEach(product => {
      if (!uniqueProductsMap.has(product.product_id)) {
        uniqueProductsMap.set(product.product_id, product)
      }
    })

    return Array.from(uniqueProductsMap.values())
  }, [data])

  const handleFetchNextPage = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  const handleDeleteProduct = useCallback(
    (productId: string) => {
      if (confirm(t('confirmations.deleteProduct'))) {
        deleteProduct(productId)
      }
    },
    [deleteProduct, t],
  )

  const handleUpdatePrice = useCallback(
    (productId: string) => {
      const product = products.find(p => p.product_id === productId)
      const currentPrice = product?.base_selling_price || 0
      const newPrice = prompt(t('confirmations.enterNewPrice'), currentPrice.toString())
      if (newPrice && !Number.isNaN(Number(newPrice))) {
        updateProductPrice(productId, Number(newPrice))
      }
    },
    [updateProductPrice, products, t],
  )

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t('errors.loadingError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography variant="p" color="muted">
              {error instanceof Error ? error.message : t('errors.unexpectedError')}
            </Typography>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('catalog.title')}
          </CardTitle>
          <CardDescription>{t('catalog.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={`skeleton-${i + 1}`}
                className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/8"></div>
                <div className="h-4 bg-muted rounded w-1/8"></div>
                <div className="h-4 bg-muted rounded w-1/12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full overflow-x-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('catalog.title')}
          </CardTitle>
          <CardDescription>
            {t('catalog.description')}. {t('catalog.clickToSort')}.
            {currentSort && (
              <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                {t('catalog.sortedBy')} {currentSort.field} (
                {currentSort.direction === 'asc' ? t('catalog.ascending') : t('catalog.descending')}
                )
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Typography variant="h3">{t('empty.title')}</Typography>
                <Typography variant="p" color="muted" className="mt-2">
                  {t('empty.description')}
                </Typography>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name" currentSort={currentSort} onSort={updateSort}>
                    {t('table.productDetails')}
                  </SortableHeader>
                  <SortableHeader field="category" currentSort={currentSort} onSort={updateSort}>
                    {t('table.category')}
                  </SortableHeader>
                  <SortableHeader field="brand" currentSort={currentSort} onSort={updateSort}>
                    {t('table.brand')}
                  </SortableHeader>
                  <SortableHeader field="total_stock" currentSort={currentSort} onSort={updateSort}>
                    {t('table.stock')}
                  </SortableHeader>
                  <SortableHeader
                    field="base_selling_price"
                    currentSort={currentSort}
                    onSort={updateSort}
                    className="text-right"
                  >
                    {t('table.pricing')}
                  </SortableHeader>
                  <SortableHeader
                    field="active_batches_count"
                    currentSort={currentSort}
                    onSort={updateSort}
                  >
                    {t('table.activeBatches')}
                  </SortableHeader>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">
                          {product.name || t('table.unnamedProduct')}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          SKU: {product.sku || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline" className="capitalize">
                          {product.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t('table.uncategorized')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{product.brand || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{product.total_stock || 0}</span>
                        <span className="text-muted-foreground ml-1">
                          {product.unit_type || t('table.units')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-bold text-lg">
                          €{product.base_selling_price?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('table.cost')}: €{product.base_cost_price?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{product.active_batches_count || 0}</span>
                        <span className="text-muted-foreground ml-1">
                          {(product.active_batches_count || 0) === 1
                            ? t('table.batch')
                            : t('table.batches')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={isDeleting || isUpdating}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdatePrice(product.product_id)}
                            disabled={isUpdating}
                          >
                            <Euro className="mr-2 h-4 w-4" />
                            {tButtons('updatePrice')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Add view batches functionality
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            {tButtons('viewBatches')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Add edit functionality here
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {tButtons('editProduct')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.product_id)}
                            disabled={isDeleting}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tButtons('deleteProduct')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Load More Section */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleFetchNextPage}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? t('loading.loadingMore') : tButtons('loadMore')}
          </Button>
        </div>
      )}

      {/* Product Count Badge */}
      {products.length > 0 && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            {t('loading.showing')} {products.length} {t('loading.of')} {count}{' '}
            {t('loading.products')}
          </Badge>
        </div>
      )}
    </div>
  )
}
