'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { ActionableBatch } from '@/hooks/use-batch-actions-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface SoldTabProps {
  selectedBatch: ActionableBatch
  onClose: () => void
}

// Sale timing options
const SALE_TIMING_OPTIONS = [
  { id: 'just-now', label: 'Just now' },
  { id: 'today', label: 'Earlier today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this-week', label: 'This week' },
]

export function SoldTab({ selectedBatch, onClose }: SoldTabProps) {
  const { executeSold, isMarkingSold } = useBatchActionRPC()

  // Sold tab state
  const [soldQuantity, setSoldQuantity] = useState(selectedBatch.current_quantity)
  const [isSoldSelectAll, setIsSoldSelectAll] = useState(true)
  const [soldTiming, setSoldTiming] = useState('just-now')

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSoldSelectAll) {
      setSoldQuantity(selectedBatch.current_quantity)
    }
  }, [selectedBatch.current_quantity, isSoldSelectAll])

  // Calculate sold metrics
  const calculateSoldMetrics = () => {
    const pricePerUnit = selectedBatch.potential_loss_value / selectedBatch.current_quantity
    const totalRevenue = pricePerUnit * soldQuantity
    const profitMargin = 100 // Full price = 100% profit margin

    const metrics = {
      pricePerUnit,
      totalRevenue,
      profitMargin,
    }

    return metrics
  }

  const soldMetrics = calculateSoldMetrics()

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setSoldQuantity(value)
    setIsSoldSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (isSoldSelectAll) {
      setSoldQuantity(Math.floor(selectedBatch.current_quantity / 2))
      setIsSoldSelectAll(false)
    } else {
      setSoldQuantity(selectedBatch.current_quantity)
      setIsSoldSelectAll(true)
    }
  }

  // Handle timing selection
  const handleTimingChange = (timing: string) => {
    setSoldTiming(timing)
  }

  // Handle sold execution
  const handleSoldAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id,
        quantity: soldQuantity,
        notes: `Marked ${soldQuantity} units as sold (${SALE_TIMING_OPTIONS.find(t => t.id === soldTiming)?.label}) - ${selectedBatch.ai_reasoning}`,
      }

      const _result = await executeSold(params)

      // Success - close the modal
      onClose()
    } catch (error) {
      console.error('[SoldTab] Sold action failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: soldQuantity,
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Header */}
        {/* <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">🎉</span>
            <h3 className="font-semibold text-lg">FULL PRICE SUCCESS</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Great news! You sold at full price.
          </p>
        </div> */}

        {/* Sale Details Box */}
        {/* <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <div className="text-sm space-y-1">
            <div className="font-medium text-green-800 mb-2">Sale details:</div>
            <div className="text-green-700">
              Price per unit: €{soldMetrics.pricePerUnit.toFixed(2)}
            </div>
            <div className="text-green-700">
              Total revenue: €{soldMetrics.totalRevenue.toFixed(2)}
            </div>
            <div className="text-green-700">
              Profit margin: {soldMetrics.profitMargin}%
            </div>
          </div>
        </div> */}

        {/* Quantity Selection */}

        <InputSlider
          value={soldQuantity}
          onChange={handleQuantityChange}
          min={1}
          max={selectedBatch.current_quantity}
          step={1}
          suffix={`/${selectedBatch.current_quantity}`}
          label={`${soldQuantity}/${selectedBatch.current_quantity} `}
        />

        {/* Sale Timing Options */}
        {/* <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">When did this sell?</h3>
          <div className="grid grid-cols-2 gap-2">
            {SALE_TIMING_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleTimingChange(option.id)}
                className={cn(
                  'p-3 rounded-lg border text-sm font-medium transition-colors',
                  soldTiming === option.id
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div> */}

        {/* AI Learning Section */}
        {/* <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <span>📊</span>
            <span className="text-sm font-medium">
              This helps our AI learn your customer preferences!
            </span>
          </div>
          <p className="text-xs text-blue-600">
            Your sale data improves future demand predictions and pricing
            recommendations.
          </p>
        </div> */}

        {/* Expected Outcome */}
        {/* <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Expected Outcome</h3>
          <p className="text-sm text-gray-600">
            {soldQuantity === selectedBatch.current_quantity
              ? 'This will mark all units as sold and remove this item from your todo list.'
              : `This will reduce inventory by ${soldQuantity} units. The remaining ${selectedBatch.current_quantity - soldQuantity} units will stay active for sale.`}
          </p>
        </div> */}
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white p-8 flex justify-between">
        <Button variant="subtleTertiary" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button size="lg" onClick={handleSoldAction} disabled={isMarkingSold || soldQuantity === 0}>
          {isMarkingSold ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Sale...
            </span>
          ) : (
            'Mark as Sold'
          )}
        </Button>
      </div>
    </div>
  )
}
