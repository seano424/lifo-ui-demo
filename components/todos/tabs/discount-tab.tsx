'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import type { ActionableBatch } from '@/hooks/use-scoring-analytics'
import { cn } from '@/lib/utils'

interface DiscountTabProps {
  selectedBatch: ActionableBatch
  onClose: () => void
}

export function DiscountTab({ selectedBatch, onClose }: DiscountTabProps) {
  const { executeDiscount, isDiscounting } = useBatchActionRPC()

  // Discount tab state
  const [discountPercentage, setDiscountPercentage] = useState(
    selectedBatch?.discount_percent || 21,
  )
  const [customPrice, setCustomPrice] = useState<string>('')
  const [useCustomPrice, setUseCustomPrice] = useState(false)

  // Calculate price metrics
  const calculatePriceMetrics = () => {
    const originalPrice = selectedBatch.potential_loss / selectedBatch.current_quantity
    let actualDiscountPercentage = discountPercentage
    let newPrice = originalPrice * (1 - discountPercentage / 100)

    if (useCustomPrice && customPrice) {
      const customPriceNum = Number(customPrice)
      newPrice = customPriceNum
      actualDiscountPercentage = Math.round(
        ((originalPrice - customPriceNum) / originalPrice) * 100,
      )
    }

    const totalRevenue = newPrice * selectedBatch.current_quantity
    const originalRevenue = originalPrice * selectedBatch.current_quantity
    const recoveryPercentage = Math.round((totalRevenue / originalRevenue) * 100)

    const metrics = {
      originalPrice,
      newPrice,
      actualDiscountPercentage,
      totalRevenue,
      originalRevenue,
      recoveryPercentage,
    }

    return metrics
  }

  const priceMetrics = calculatePriceMetrics()

  // Get sell likelihood based on discount
  const getSellLikelihood = (discount: number) => {
    let likelihood = 25
    if (discount >= 50) likelihood = 95
    else if (discount >= 30) likelihood = 90
    else if (discount >= 20) likelihood = 85
    else if (discount >= 10) likelihood = 70

    return likelihood
  }

  const sellLikelihood = getSellLikelihood(priceMetrics.actualDiscountPercentage)

  // Handle discount slider change
  const handleDiscountChange = (value: number) => {
    setDiscountPercentage(value)
    setUseCustomPrice(false)
    setCustomPrice('')
  }

  // Handle custom price input
  const handleCustomPriceChange = (value: string) => {
    setCustomPrice(value)
    setUseCustomPrice(!!value)
  }

  // Handle discount execution
  const handleDiscountAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id,
        quantity: selectedBatch.current_quantity,
        discountPercentage: priceMetrics.actualDiscountPercentage,
        notes: useCustomPrice
          ? `Set price to €${priceMetrics.newPrice.toFixed(2)} (${priceMetrics.actualDiscountPercentage}% discount) - ${selectedBatch.reason}`
          : `Applied ${priceMetrics.actualDiscountPercentage}% discount - ${selectedBatch.reason}`,
      }

      const _result = await executeDiscount(params)

      // Success - close the modal
      onClose()
    } catch (error) {
      console.error('[DiscountTab] Discount failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        discountPercentage: priceMetrics.actualDiscountPercentage,
      })
    }
  }

  return (
    <div>
      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <h3 className="font-semibold text-lg">MAXIMIZE REVENUE RECOVERY</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            AI Suggested Discount: {selectedBatch.discount_percent || 21}%
          </p>
        </div>

        {/* Price Comparison Box */}
        <div className="bg-muted/50 p-4 rounded-lg border mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Original:</span>
              <span className="ml-2 font-semibold">€{priceMetrics.originalPrice.toFixed(2)}</span>
              <span className="mx-3 text-muted-foreground">→</span>
              <span className="text-muted-foreground">New:</span>
              <span className="ml-2 font-semibold text-green-600">
                €{priceMetrics.newPrice.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Revenue recovery:</span>
            <span className="ml-2 font-semibold text-green-600">
              €{priceMetrics.totalRevenue.toFixed(2)} ({priceMetrics.recoveryPercentage}%)
            </span>
          </div>
        </div>

        {/* Discount Slider */}
        <div className="mb-6">
          <InputSlider
            value={discountPercentage}
            onChange={handleDiscountChange}
            min={5}
            max={70}
            step={1}
            label="Adjust discount:"
            suffix="%"
            sliderColor="#8b5cf6"
          />

          {/* Quick Preset Buttons */}
          <div className="flex gap-2 mt-3">
            {[10, 20, 25, 50].map(preset => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => handleDiscountChange(preset)}
                className={cn(
                  'flex-1',
                  discountPercentage === preset &&
                    !useCustomPrice &&
                    'bg-purple-100 border-purple-300',
                )}
              >
                {preset}%
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Price Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => {
                setUseCustomPrice(!useCustomPrice)
                if (useCustomPrice) {
                  setCustomPrice('')
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                useCustomPrice
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-200 hover:border-purple-300',
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 transition-colors',
                  useCustomPrice ? 'bg-purple-600 border-purple-600' : 'border-gray-300',
                )}
              >
                {useCustomPrice && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm font-medium">Set custom price instead</span>
            </button>
          </div>

          {useCustomPrice && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">€</span>
              <input
                type="number"
                value={customPrice}
                onChange={e => handleCustomPriceChange(e.target.value)}
                placeholder="Enter price"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="0.01"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Expected Outcome */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium mb-2 text-blue-800">Expected Outcome</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Sell likelihood:</span>
              <span className="font-medium">{sellLikelihood}%</span>
            </div>
            <div className="flex justify-between">
              <span>Revenue recovery:</span>
              <span className="font-medium">€{priceMetrics.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            This discount will update the batch price and keep it active for sale.
          </p>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0">
        <button
          type="button"
          onClick={handleDiscountAction}
          disabled={isDiscounting}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium transition-colors',
            'bg-purple-600 text-white hover:bg-purple-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isDiscounting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Discount...
            </span>
          ) : useCustomPrice && customPrice ? (
            `Set Price €${priceMetrics.newPrice.toFixed(2)}`
          ) : (
            `Apply ${priceMetrics.actualDiscountPercentage}% Discount`
          )}
        </button>
      </div>
    </div>
  )
}
