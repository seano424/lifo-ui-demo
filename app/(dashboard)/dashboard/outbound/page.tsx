'use client'

import { useState } from 'react'
import { type ScannedItem, ScanOutInterface } from '@/components/scanning'

export default function OutboundPage() {
  const [removedItems, setRemovedItems] = useState<ScannedItem[]>([])

  const handleItemRemoved = (item: ScannedItem) => {
    console.log('Item removed from inventory:', item)
    setRemovedItems(prev => [item, ...prev])
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Outbound Scanning</h1>
        <p className="text-gray-600 mt-2">
          Scan products to remove them from inventory. Perfect for sales, waste tracking, or
          transfers.
        </p>
      </div>

      <ScanOutInterface onItemRemoved={handleItemRemoved} className="max-w-2xl mx-auto" />

      {/* Optional: Show summary of removed items */}
      {removedItems.length > 0 && (
        <div className="mt-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-3">
            Recently Removed ({removedItems.length} items)
          </h3>
          <div className="space-y-2">
            {removedItems.slice(0, 5).map(item => (
              <div key={item.id} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <div className="font-medium text-red-800">{item.productName}</div>
                <div className="text-red-600">
                  Removed {item.quantity}x • Expires:{' '}
                  {new Date(item.expiryDate).toLocaleDateString()}
                </div>
              </div>
            ))}
            {removedItems.length > 5 && (
              <div className="text-center text-gray-500 text-sm">
                ... and {removedItems.length - 5} more items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
