'use client'

import { Package, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { DeliveryItem } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'

export interface DeliveryItemWithName extends DeliveryItem {
  product_name: string
}

interface DeliverySummaryProps {
  items: DeliveryItemWithName[]
  onRemoveItem?: (productId: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
  className?: string
}

/**
 * Summary panel showing items in the current delivery
 *
 * Features:
 * - Shows all items being added to delivery
 * - Total product count and unit count
 * - Option to remove items before submitting
 * - "Done with Delivery" button triggers the submission
 *
 * @example
 * ```tsx
 * <DeliverySummary
 *   items={deliveryItems}
 *   onRemoveItem={(id) => removeItem(id)}
 *   onSubmit={handleDeliveryComplete}
 *   isSubmitting={isLoggingDelivery}
 * />
 * ```
 */
export function DeliverySummary({
  items,
  onRemoveItem,
  onSubmit,
  isSubmitting = false,
  className,
}: DeliverySummaryProps) {
  const totalProducts = items.length
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
  const hasItems = items.length > 0

  if (!hasItems) {
    return (
      <Card
        className={cn('border-2 border-dashed border-gray-300 dark:border-gray-700', className)}
      >
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No products added yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Add products from the list above
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-2 border-primary-200 dark:border-primary-800', className)}>
      <CardContent className="p-4 flex flex-col gap-4">
        {/* Summary Header */}
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h3">Delivery Summary</Typography>
            <Typography variant="muted">
              {totalProducts} product{totalProducts !== 1 ? 's' : ''} • {totalUnits} units
            </Typography>
          </div>
          <Badge variant="secondary" className="text-base font-bold px-3 py-1">
            {totalUnits}
          </Badge>
        </div>

        {/* Items List */}
        <ScrollArea className="max-h-[200px] -mx-4 px-4">
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div
                key={item.product_id}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex-1 min-w-0">
                  <Typography variant="p">{item.product_name}</Typography>
                  <Typography variant="muted">{item.quantity} units</Typography>
                </div>
                {onRemoveItem && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.product_id)}
                    className="shrink-0 h-8 w-8 text-gray-500 hover:text-destructive dark:hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Submit Button */}
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting || !hasItems}
          className="w-full min-h-[44px] font-semibold"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Logging Delivery...
            </>
          ) : (
            <>
              <Package className="h-5 w-5 mr-2" />
              Done with Delivery
            </>
          )}
        </Button>

        {/* Helper Text */}
        <Typography variant="muted">
          Draft batches will be created. You'll add expiry dates next.
        </Typography>
      </CardContent>
    </Card>
  )
}
