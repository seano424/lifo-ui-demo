'use client'

import { Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

export interface ScannedItem {
  id: string
  barcode: string
  productName: string
  brand?: string
  expiryDate: string
  quantity: number
  price: number
  timestamp: Date
}

export interface ScannedItemsListProps {
  items: ScannedItem[]
  onEditItem?: (item: ScannedItem) => void
  title?: string
  className?: string
}

export default function ScannedItemsList({
  items,
  onEditItem,
  title = 'Total items scanned',
  className = '',
}: ScannedItemsListProps) {
  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  if (items.length === 0) {
    return null
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h3">{title}</Typography>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 p-2 w-10 h-10 flex items-center justify-center rounded-full">
          {items.length > 99 ? '99+' : items.length}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 border rounded text-sm"
          >
            <div className="flex-1">
              <Typography variant="p">
                <span className="text-gray-500">Product:</span> {item.productName}
              </Typography>
              <Typography variant="p">
                <span className="font-normal text-gray-500">Quantity:</span> {item.quantity}x{' '}
                <span className="font-normal text-gray-500">Price:</span> {formatPrice(item.price)}{' '}
                <span className="font-normal text-gray-500">Expiry:</span>{' '}
                {new Date(item.expiryDate).toLocaleDateString()}
              </Typography>
            </div>

            {onEditItem && (
              <Button
                onClick={() => onEditItem(item)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
