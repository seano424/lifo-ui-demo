'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCategoryTranslation } from '@/hooks/use-category-translation'
import { useCurrency } from '@/hooks/use-currency'
import { useProductActions } from '@/hooks/use-products'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'
import { ArrowDown, ArrowUp, Edit, Euro, MoreHorizontal, Package, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    fresh_produce: 'bg-primary-100 text-primary-800 border-primary-200',
    fresh_meat_fish: 'bg-destructive text-destructive border-destructive',
    bakery_fresh: 'bg-orange-100 text-orange-800 border-orange-200',
    dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    deli_prepared: 'bg-pink-100 text-pink-800 border-pink-200',
    frozen: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dry_goods: 'bg-amber-100 text-amber-800 border-amber-200',
    beverages: 'bg-blue-100 text-blue-800 border-blue-200',
    spices_condiments: 'bg-purple-100 text-purple-800 border-purple-200',
    canned_jarred: 'bg-stone-100 text-stone-800 border-stone-200',
    chilled_packaged: 'bg-teal-100 text-teal-800 border-teal-200',
    pantry_staples: 'bg-slate-100 text-slate-800 border-slate-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[category?.toLowerCase() as keyof typeof colors] || colors.other
}

interface SortableHeaderProps {
  field: SortField
  children: React.ReactNode
  currentSort: ProductSort
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({ field, children, currentSort, onSort, className }: SortableHeaderProps) {
  const isCurrentField = currentSort.field === field
  const direction = isCurrentField ? currentSort.direction : null

  const getSortIcon = () => {
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

interface ProductsListPresentationProps {
  data: Product[]
  count: number
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  currentSort: ProductSort
  updateSort: (field: SortField) => void
}

export function ProductsListPresentation({
  data,
  count,
  isLoading,
  error,
  hasMore,
  fetchNextPage,
  isFetchingNextPage,
  currentSort,
  updateSort,
}: ProductsListPresentationProps) {
  const t = useTranslations('products')
  const tButtons = useTranslations('buttons')
  const { getCategoryName } = useCategoryTranslation()
  const currencySymbol = useCurrency()

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
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={`skeleton-${i + 1}`}
                className="flex items-center space-x-4 p-4 border rounded-2xl animate-pulse"
              >
                <div className="h-4 bg-muted rounded-2xl w-1/4"></div>
                <div className="h-4 bg-muted rounded-2xl w-1/6"></div>
                <div className="h-4 bg-muted rounded-2xl w-1/8"></div>
                <div className="h-4 bg-muted rounded-2xl w-1/8"></div>
                <div className="h-4 bg-muted rounded-2xl w-1/12"></div>
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
        <CardContent>
          {products.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Typography variant="h3">{t('empty.title')}</Typography>
                <Typography variant="p" color="muted">
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
                  <TableHead className="text-right">{t('table.pricing')}</TableHead>
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
                    <TableCell className="">
                      <div>
                        <div>{product.name || t('table.unnamedProduct')}</div>
                        <div>SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category_code ? (
                        <Badge
                          variant="outline"
                          className={getCategoryBadgeColor(product.category_code)}
                        >
                          {getCategoryName(product)}
                        </Badge>
                      ) : (
                        <span>{t('table.uncategorized')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{product.brand || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <Typography variant="muted">
                        <span className="">{product.total_stock || 0}</span>
                        <span>{product.unit_type || t('table.units')}</span>
                      </Typography>
                    </TableCell>
                    <TableCell className="text-right">
                      <Typography variant="p">
                        <div>
                          {currencySymbol}
                          {product.base_selling_price?.toFixed(2) || '0.00'}
                        </div>
                        <div>
                          {t('table.cost')}: {currencySymbol}
                          {product.base_cost_price?.toFixed(2) || '0.00'}
                        </div>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="p">
                        <span>{product.active_batches_count || 0}</span>
                        <span>
                          {(product.active_batches_count || 0) === 1
                            ? t('table.batch')
                            : t('table.batches')}
                        </span>
                      </Typography>
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
                              // Add edit functionality
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
