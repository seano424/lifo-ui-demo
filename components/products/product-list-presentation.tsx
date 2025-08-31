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
import { useCallback, useMemo } from 'react'
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
import { useProductActions } from '@/hooks/use-products'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    fresh_produce: 'bg-green-100 text-green-800 border-green-200',
    fresh_meat_fish: 'bg-red-100 text-red-800 border-red-200',
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

// ✅ Sortable Table Header Component
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

// ✅ Pure presentation component that receives data as props
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
      if (confirm('Are you sure you want to delete this product?')) {
        deleteProduct(productId)
      }
    },
    [deleteProduct],
  )

  const handleUpdatePrice = useCallback(
    (productId: string) => {
      const product = products.find(p => p.product_id === productId)
      const currentPrice = product?.base_selling_price || 0
      const newPrice = prompt('Enter new price:', currentPrice.toString())
      if (newPrice && !Number.isNaN(Number(newPrice))) {
        updateProductPrice(productId, Number(newPrice))
      }
    },
    [updateProductPrice, products],
  )

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography variant="p" color="muted">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
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
        <CardContent>
          {products.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Typography variant="h3">No products found</Typography>
                <Typography variant="p" color="muted" className="mt-2">
                  Get started by adding your first product
                </Typography>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name" currentSort={currentSort} onSort={updateSort}>
                    Product Details
                  </SortableHeader>
                  <SortableHeader field="category" currentSort={currentSort} onSort={updateSort}>
                    Category
                  </SortableHeader>
                  <SortableHeader field="brand" currentSort={currentSort} onSort={updateSort}>
                    Brand
                  </SortableHeader>
                  <SortableHeader field="total_stock" currentSort={currentSort} onSort={updateSort}>
                    Stock
                  </SortableHeader>
                  <SortableHeader
                    field="base_selling_price"
                    currentSort={currentSort}
                    onSort={updateSort}
                    className="text-right"
                  >
                    Pricing
                  </SortableHeader>
                  <SortableHeader
                    field="active_batches_count"
                    currentSort={currentSort}
                    onSort={updateSort}
                  >
                    Active Batches
                  </SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{product.name || 'Unnamed Product'}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          SKU: {product.sku || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge
                          variant="outline"
                          className={getCategoryBadgeColor(product.category)}
                        >
                          {product.category_display_name || product.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{product.brand || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{product.total_stock || 0}</span>
                        <span className="text-muted-foreground ml-1">
                          {product.unit_type || 'units'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-bold text-lg">
                          €{product.base_selling_price?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cost: €{product.base_cost_price?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{product.active_batches_count || 0}</span>
                        <span className="text-muted-foreground ml-1">
                          batch
                          {(product.active_batches_count || 0) !== 1 ? 'es' : ''}
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
                            Update Price
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              console.log('View batches for product:', product.product_id)
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            View Batches
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              console.log('Edit product:', product.product_id)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.product_id)}
                            disabled={isDeleting}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Product
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
            {isFetchingNextPage ? 'Loading more...' : 'Load More Products'}
          </Button>
        </div>
      )}

      {/* Product Count Badge */}
      {products.length > 0 && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            Showing {products.length} of {count} products
          </Badge>
        </div>
      )}
    </div>
  )
}
