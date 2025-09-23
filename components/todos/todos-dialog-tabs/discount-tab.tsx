'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import type { ActionableBatch } from '@/hooks/use-batch-actions-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

// Configurable discount thresholds for sell likelihood calculation
const DISCOUNT_THRESHOLDS = {
  base: { minDiscount: 0, likelihood: 25 },
  low: { minDiscount: 10, likelihood: 70 },
  medium: { minDiscount: 20, likelihood: 85 },
  high: { minDiscount: 30, likelihood: 90 },
  veryHigh: { minDiscount: 50, likelihood: 95 },
} as const

interface DiscountTabProps {
  selectedBatch: ActionableBatch
  onClose: () => void
}

export function DiscountTab({ selectedBatch, onClose }: DiscountTabProps) {
  const { executeDiscount, isDiscounting } = useBatchActionRPC()

  // Discount tab state
  const [discountPercentage, setDiscountPercentage] = useState(
    selectedBatch?.discount_percent || 20
  )
  const [customPrice, setCustomPrice] = useState<string>('')
  const [useCustomPrice, setUseCustomPrice] = useState(false)

  // Calculate price metrics
  const calculatePriceMetrics = () => {
    const originalPrice =
      selectedBatch.potential_loss_value / selectedBatch.current_quantity
    let actualDiscountPercentage = discountPercentage
    let newPrice = originalPrice * (1 - discountPercentage / 100)

    if (useCustomPrice && customPrice) {
      const customPriceNum = Number(customPrice)
      // Validate custom price: must be positive and not exceed original price
      if (
        customPriceNum > 0 &&
        customPriceNum <= originalPrice &&
        !Number.isNaN(customPriceNum)
      ) {
        newPrice = customPriceNum
        actualDiscountPercentage = Math.round(
          ((originalPrice - customPriceNum) / originalPrice) * 100
        )
      } else {
        // If invalid, fall back to percentage-based discount
        newPrice = originalPrice * (1 - discountPercentage / 100)
      }
    }

    const totalRevenue = newPrice * selectedBatch.current_quantity
    const originalRevenue = originalPrice * selectedBatch.current_quantity
    const recoveryPercentage = Math.round(
      (totalRevenue / originalRevenue) * 100
    )

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

  // Get sell likelihood based on discount using configurable thresholds
  const getSellLikelihood = (discount: number) => {
    if (discount >= DISCOUNT_THRESHOLDS.veryHigh.minDiscount) {
      return DISCOUNT_THRESHOLDS.veryHigh.likelihood
    }
    if (discount >= DISCOUNT_THRESHOLDS.high.minDiscount) {
      return DISCOUNT_THRESHOLDS.high.likelihood
    }
    if (discount >= DISCOUNT_THRESHOLDS.medium.minDiscount) {
      return DISCOUNT_THRESHOLDS.medium.likelihood
    }
    if (discount >= DISCOUNT_THRESHOLDS.low.minDiscount) {
      return DISCOUNT_THRESHOLDS.low.likelihood
    }
    return DISCOUNT_THRESHOLDS.base.likelihood
  }

  const sellLikelihood = getSellLikelihood(
    priceMetrics.actualDiscountPercentage
  )

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
          ? `Set price to €${priceMetrics.newPrice.toFixed(2)} (${priceMetrics.actualDiscountPercentage}% discount) - ${selectedBatch.ai_reasoning}`
          : `Applied ${priceMetrics.actualDiscountPercentage}% discount - ${selectedBatch.ai_reasoning}`,
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
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        {/* content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Header */}
          {/* <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <h3 className="font-semibold text-lg">
                MAXIMIZE REVENUE RECOVERY
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              AI Suggested Discount: {selectedBatch.discount_percent || 20}%
            </p>
          </div> */}

          {/* Price Comparison Box */}
          {/* <div className="bg-muted/50 p-4 rounded-lg border mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Original:</span>
                <span className="ml-2 font-semibold">
                  €{priceMetrics.originalPrice.toFixed(2)}
                </span>
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
                €{priceMetrics.totalRevenue.toFixed(2)} (
                {priceMetrics.recoveryPercentage}%)
              </span>
            </div>
          </div> */}

          {/* Discount Slider */}
          <div className="flex flex-col gap-4">
            <InputSlider
              value={discountPercentage}
              onChange={handleDiscountChange}
              min={5}
              max={85}
              step={1}
              label={`New price: €${priceMetrics.newPrice.toFixed(2)}`}
              suffix="%"
              isPercentage
            />

            {/* Quick Preset Buttons */}
            <div className="flex gap-2">
              {[10, 20, 25, 50].map((preset) => (
                <Button
                  key={preset}
                  variant={
                    discountPercentage === preset ? 'default' : 'outline'
                  }
                  className="py-4 text-lg rounded-full"
                  onClick={() => handleDiscountChange(preset)}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Price Toggle */}
          {/* <div className="mb-6">
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
                    : 'border-gray-200 hover:border-purple-300'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 transition-colors',
                    useCustomPrice
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300'
                  )}
                >
                  {useCustomPrice && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <span className="text-sm font-medium">
                  Set custom price instead
                </span>
              </button>
            </div>

            {useCustomPrice && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => handleCustomPriceChange(e.target.value)}
                  placeholder="Enter price"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  step="0.01"
                  min="0"
                />
              </div>
            )}
          </div> */}

          {/* Expected Outcome */}
          {/* <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium mb-2 text-blue-800">
              Expected Outcome
            </h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Sell likelihood:</span>
                <span className="font-medium">{sellLikelihood}%</span>
              </div>
              <div className="flex justify-between">
                <span>Revenue recovery:</span>
                <span className="font-medium">
                  €{priceMetrics.totalRevenue.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              This discount will update the batch price and keep it active for
              sale.
            </p>
          </div> */}
        </div>

        {/* footer */}
        <div className="sticky bottom-0 bg-brand-white p-8 flex justify-between">
          <Button
            variant="subtleTertiary"
            size="lg"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleDiscountAction}
            disabled={isDiscounting}
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
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  )
}
