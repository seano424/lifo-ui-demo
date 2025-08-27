'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

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
      year: 'numeric',
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
      <Typography
        variant="h3"
        className="border-b pb-2 font-black"
      >
        Available Batches ({batches.length})
      </Typography>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {batches.map((batch, index) => {
          const isSelected = selectedBatchId === batch.batch_id
          const isRecommended = index === 0

          return (
            <div
              key={batch.batch_id}
              className={`
                relative p-3 border rounded-lg cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${isRecommended && !isSelected ? 'border-blue-300 bg-blue-25' : ''}
              `}
              onClick={() => onBatchSelected(batch)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute bottom-2 right-2">
                  <div className="w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute bottom-2 right-2">
                  <Typography
                    variant="small"
                    className="p-2 border border-blue-500 bg-blue-50 text-blue-500 text-xs rounded-2xl"
                  >
                    Recommended
                  </Typography>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Typography variant="p">
                    Expires: {formatDate(batch.expiry_date)}
                  </Typography>

                  <Typography
                    variant="p"
                    className="text-sm text-gray-600 mt-1"
                  >
                    Available:{' '}
                    {batch.available_quantity || batch.current_quantity} units
                  </Typography>

                  <Typography
                    variant="p"
                    className="text-sm text-gray-600"
                  >
                    Cost: {formatPrice(batch.cost_price)}
                  </Typography>

                  {isRecommended && !isSelected && (
                    <Typography
                      variant="small"
                      className="text-xs text-blue-600 mt-2 font-light"
                    >
                      ↑ Recommended (First to expire)
                    </Typography>
                  )}
                </div>

                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={
                    isSelected ? 'bg-primary-600 hover:bg-primary-700' : ''
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    onBatchSelected(batch)
                  }}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Helper Text */}
      <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded-2xl">
        💡 <strong>Tip:</strong> Select a batch directly, or scan/enter the
        expiry date below to auto-match
      </div>
    </div>
  )
}
