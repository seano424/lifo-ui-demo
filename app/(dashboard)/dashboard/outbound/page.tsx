'use client'

import { useState } from 'react'
import { type ScannedItem, ScanOutInterface } from '@/components/scanning'
import { Typography } from '@/components/ui/typography'

export default function OutboundPage() {
  const [removedItems, setRemovedItems] = useState<ScannedItem[]>([])

  const handleItemRemoved = (item: ScannedItem) => {
    console.log('Item removed from inventory:', item)
    setRemovedItems((prev) => [item, ...prev])
  }

  return (
    <div className="space-y-6 px-4">
      {/* <div className="flex flex-col gap-3 text-center">
        <Typography variant="h1">Outbound Scanning</Typography>
        <Typography
          variant="p"
          className="max-w-md mx-auto"
        >
          Scan products to remove them from inventory. Perfect for sales, waste
          tracking, or transfers.
        </Typography>
      </div> */}

      <ScanOutInterface onItemRemoved={handleItemRemoved} />

      {removedItems.length > 0 && (
        <div className="mt-8 space-y-2">
          <Typography
            variant="h3"
            className="text-center font-black text-primary-900"
          >
            Recently Removed ({removedItems.length} items)
          </Typography>
          <div className="space-y-2">
            {removedItems.slice(0, 5).map((item, index) => (
              <div
                key={item.id + index}
                className="py-4 px-8 bg-primary-900 text-white rounded-3xl border border-primary-200 w-max mx-auto"
              >
                <Typography
                  variant="p"
                  className="font-bold text-white"
                >
                  {item.productName}
                </Typography>
                <Typography
                  variant="p"
                  className="text-sm text-white"
                >
                  Removed {item.quantity}x • Expires:{' '}
                  {new Date(item.expiryDate).toLocaleDateString()}
                </Typography>
              </div>
            ))}
            {removedItems.length > 5 && (
              <Typography variant="p">
                ... and {removedItems.length - 5} more items
              </Typography>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
