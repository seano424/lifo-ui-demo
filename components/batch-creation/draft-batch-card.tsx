'use client'

import { Calendar, Package } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ProductWithDraftBatches } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'

interface DraftBatchCardProps {
  product: ProductWithDraftBatches
  onClick: () => void
  className?: string
}

/**
 * Compact card showing a product with draft batches
 * Optimized for mobile-first batch creation workflow
 * Click to open batch creation sheet
 *
 * @example
 * ```tsx
 * <DraftBatchCard
 *   product={productWithDrafts}
 *   onClick={() => openBatchSheet(product)}
 * />
 * ```
 */
export function DraftBatchCard({ product, onClick, className }: DraftBatchCardProps) {
  const categoryHint = product.category_name
    ? `${product.category_name} typically expires in +${product.typical_shelf_life_days || '?'} days`
    : null

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-all active:scale-[0.99] border-none shadow-none select-none',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="shrink-0">
            <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {product.product_name ? (
                <Image
                  src={`https://placehold.co/200x200/e5e7eb/6b7280?text=${encodeURIComponent(
                    product.product_name.substring(0, 2),
                  )}`}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Product Name & Brand */}
            <div>
              <Typography variant="h5" color="primary" className="truncate">
                {product.product_name}
              </Typography>
              {/* {product.product_brand && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {product.product_brand}
                </p>
              )} */}
            </div>

            {/* Category Hint */}
            {categoryHint && (
              <Typography variant="muted" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {categoryHint}
              </Typography>
            )}

            {/* Total Draft Quantity */}
            <div className="flex items-center gap-2">
              <Typography variant="muted">
                {product.total_draft_quantity} items need dates
              </Typography>
            </div>
          </div>

          {/* Chevron Indicator */}
          <div className="shrink-0 flex items-center">
            <Badge variant="primary">{product.total_draft_quantity} units</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
