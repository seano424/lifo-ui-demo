'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InventoryBatch {
  batch_id: string
  batch_number: string | null
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  created_at: string
  products: {
    product_name: string
    brand_name: string
    barcode: string
  }
}

interface BatchSelectionListProps {
  batches: InventoryBatch[]
  onBatchSelected: (batch: InventoryBatch) => void
  selectedBatchId?: string
  className?: string
}

export default function BatchSelectionList({
  batches,
  onBatchSelected,
  selectedBatchId,
  className = '',
}: BatchSelectionListProps) {
  const formatPrice = (price: number) => `€${price.toFixed(2)}`
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (batches.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-lg">📦</div>
        <div className="mt-2">No batches available</div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-700 border-b pb-2">
        📦 Available Batches ({batches.length})
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {batches.map((batch, index) => {
          const isSelected = selectedBatchId === batch.batch_id
          const isRecommended = index === 0 // FIFO - recommend oldest expiry first
          
          return (
            <div
              key={batch.batch_id}
              className={`
                relative p-3 border rounded-lg cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${isRecommended && !isSelected ? 'border-blue-300 bg-blue-25' : ''}
              `}
              onClick={() => onBatchSelected(batch)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    FIFO
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start pr-8">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    Batch #{batch.batch_number || batch.batch_id.slice(-8)} 
                    <span className="text-gray-500 font-normal ml-1">
                      • Expires: {formatDate(batch.expiry_date)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    Available: {batch.available_quantity || batch.current_quantity} units
                    {batch.location_code && (
                      <span className="ml-2 text-gray-500">(Location: {batch.location_code})</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Cost: {formatPrice(batch.cost_price)}
                  </div>
                  
                  {isRecommended && !isSelected && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      ↑ Recommended (First to expire)
                    </div>
                  )}
                </div>

                <Button 
                  variant={isSelected ? "default" : "outline"} 
                  size="sm"
                  className={isSelected ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={(e) => {
                    e.stopPropagation()
                    onBatchSelected(batch)
                  }}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Helper Text */}
      <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
        💡 <strong>Tip:</strong> Select a batch directly, or scan/enter the expiry date below to auto-match
      </div>
    </div>
  )
}