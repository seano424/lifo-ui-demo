'use client'

import { Calendar, Package } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ProductWithDraftBatches } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'

interface DraftBatchCardProps {
  product: ProductWithDraftBatches
  onAddExpiry: () => void
  onSkip?: () => void
  className?: string
}

/**
 * Compact card showing a product with draft batches
 * Optimized for mobile-first batch creation workflow
 *
 * @example
 * ```tsx
 * <DraftBatchCard
 *   product={productWithDrafts}
 *   onAddExpiry={() => openExpiryDialog(product)}
 *   onSkip={() => skipProduct(product.product_id)}
 * />
 * ```
 */
export function DraftBatchCard({ product, onAddExpiry, onSkip, className }: DraftBatchCardProps) {
  const hasLastExpiry = product.last_expiry_days !== null
  const categoryHint = product.category_name
    ? `${product.category_name} typically expires in +${product.typical_shelf_life_days || '?'} days`
    : null

  return (
    <Card className={cn('overflow-hidden', className)}>
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
          <div className="flex-1 min-w-0 space-y-2">
            {/* Product Name & Brand */}
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                {product.product_name}
              </h3>
              {product.product_brand && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {product.product_brand}
                </p>
              )}
            </div>

            {/* Draft Quantity Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold">
                {product.total_draft_quantity} units
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {product.draft_batch_count} batch{product.draft_batch_count !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Category Hint */}
            {categoryHint && (
              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {categoryHint}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          {/* Quick "Same" button if last expiry exists */}
          {hasLastExpiry && (
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={onAddExpiry}
              className={cn(
                'flex-1 min-h-[44px]',
                'font-semibold',
                'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600',
              )}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Same (+{product.last_expiry_days}d)
            </Button>
          )}

          {/* "Different..." or "Add Expiry" button */}
          <Button
            type="button"
            variant={hasLastExpiry ? 'outline' : 'default'}
            size="lg"
            onClick={onAddExpiry}
            className={cn(
              hasLastExpiry ? 'flex-none px-6' : 'flex-1',
              'min-h-[44px]',
              'font-semibold',
            )}
          >
            {hasLastExpiry ? 'Different...' : 'Add Expiry Date'}
          </Button>

          {/* Optional Skip button */}
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onSkip}
              className="flex-none px-4 min-h-[44px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
