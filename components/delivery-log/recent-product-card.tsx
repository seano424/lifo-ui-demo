'use client'

import { useState } from 'react'
import { Calendar, Package, Plus } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { RecentDeliveryProduct } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'

interface RecentProductCardProps {
  product: RecentDeliveryProduct
  onQuickAdd: (quantity: number) => void
  onCustomAdd: (quantity: number) => void
  isAdded?: boolean
  className?: string
}

/**
 * Compact card for recent delivery products with quick-add functionality
 *
 * Features:
 * - Shows product info with last delivery quantity
 * - Quick "+X same" button for one-tap add
 * - "+ custom" button opens inline quantity input
 * - Visual indicator for suggested expiry pattern
 *
 * @example
 * ```tsx
 * <RecentProductCard
 *   product={recentProduct}
 *   onQuickAdd={(qty) => addToDelivery(product.product_id, qty)}
 *   onCustomAdd={(qty) => addToDelivery(product.product_id, qty)}
 *   isAdded={selectedProducts.includes(product.product_id)}
 * />
 * ```
 */
export function RecentProductCard({
  product,
  onQuickAdd,
  onCustomAdd,
  isAdded = false,
  className,
}: RecentProductCardProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customQuantity, setCustomQuantity] = useState('')

  const handleQuickAdd = () => {
    onQuickAdd(product.last_delivery_quantity ?? 1)
  }

  const handleCustomSubmit = () => {
    const quantity = Number.parseInt(customQuantity, 10)
    if (quantity > 0) {
      onCustomAdd(quantity)
      setCustomQuantity('')
      setShowCustomInput(false)
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomQuantity('')
    }
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        isAdded && 'ring-2 ring-primary-600',
        className,
      )}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Product Image */}
          <div className="shrink-0">
            <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-background border border-gray-200 dark:border-gray-700">
              {product.product_name ? (
                <Image
                  src={`https://placehold.co/200x200/e5e7eb/6b7280?text=${encodeURIComponent(
                    product.product_name.substring(0, 2),
                  )}`}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-6 w-6 text-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Typography variant="p">{product.product_name}</Typography>
                {product.last_expiry_days !== null && (
                  <Typography variant="muted">
                    <Calendar className="h-3 w-3 mr-1" />
                    Last: +{product.last_expiry_days}d expiry
                  </Typography>
                )}
              </div>
              {isAdded && (
                <Badge variant="default" className="shrink-0 h-5 px-2 text-xs">
                  Added
                </Badge>
              )}
            </div>

            {/* Action Buttons or Custom Input */}
            {!showCustomInput ? (
              <div className="flex gap-2">
                {/* Quick Add Button */}
                <Button
                  type="button"
                  variant={isAdded ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleQuickAdd}
                  disabled={isAdded}
                  className={cn(
                    'flex-1 min-h-[36px]  text-xs',
                    !isAdded && 'bg-primary-600 hover:bg-primary-700',
                  )}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {product.last_delivery_quantity} same
                </Button>

                {/* Custom Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(true)}
                  disabled={isAdded}
                  className="flex-none px-3 min-h-[36px] text-xs "
                >
                  + custom
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                <Input
                  type="number"
                  min="1"
                  value={customQuantity}
                  onChange={e => setCustomQuantity(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  placeholder="Qty"
                  className="flex-1 h-9 text-sm"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customQuantity || Number.parseInt(customQuantity, 10) <= 0}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomQuantity('')
                  }}
                  className="px-3 h-9"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
