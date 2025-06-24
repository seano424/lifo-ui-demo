// components/products/product-list.tsx (Client Component)
'use client'

import { useProducts } from '@/hooks/use-products'

export function ProductsList() {
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = useProducts()

  // No loading state needed - data is pre-hydrated from server!
  if (error) return <div>Error loading products</div>

  if (isLoading) return <div>Loading products...</div>

  return (
    <div className="space-y-4">
      {/* Product Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map(product => (
          <div key={product.product_id} className="border rounded-lg p-4">
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.category}</p>
            <p className="text-sm">{product.sku}</p>
            <div className="mt-2 flex justify-between items-center">
              <span className="font-bold">${product.base_selling_price}</span>
              {product.brand && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{product.brand}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More Products'}
          </button>
        </div>
      )}

      {/* Optional: Show total count */}
      {data && data.length > 0 && (
        <p className="text-center text-sm text-gray-500 mt-4">Showing {data.length} products</p>
      )}
    </div>
  )
}
