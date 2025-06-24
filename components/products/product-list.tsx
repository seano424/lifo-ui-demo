// components/products/product-list.tsx

'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProducts, useProductActions } from '@/hooks/use-products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductCard } from '@/components/products/product-card'

export function ProductsList() {
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = useProducts()

  const { deleteProduct, updateProductPrice, isDeleting, isUpdating } = useProductActions()

  const uniqueProducts = useMemo(
    () =>
      data
        ? data.filter(
            (product, index, self) =>
              self.findIndex(p => p.product_id === product.product_id) === index,
          )
        : [],
    [data],
  )

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {uniqueProducts.map(product => (
          <ProductCard
            key={product.product_id}
            product={product}
            onDelete={() => deleteProduct(product.product_id)}
            onUpdatePrice={newPrice => updateProductPrice(product.product_id, newPrice)}
            isDeleting={isDeleting}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More Products'}
          </Button>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            Showing {uniqueProducts.length} products
          </Badge>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-muted-foreground mt-2">Get started by adding your first product</p>
          </div>
        </div>
      )}
    </div>
  )
}
