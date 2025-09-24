'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
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
    <div className="flex flex-col h-full bg-muted">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white">
        {/* Discount Preset Options */}
        <div className="flex flex-col gap-4 px-8 flex-1 justify-center">
          <Typography
            variant="p"
            className="xs:text-lg"
          >
            Select discount percentage
          </Typography>
          <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-4">
            {[10, 20, 25, 50].map((preset) => (
              <Button
                key={preset}
                size="lg"
                variant={
                  discountPercentage === preset ? 'subtleTertiary' : 'outline'
                }
                onClick={() => handleDiscountChange(preset)}
                className="border-none shadow"
              >
                {preset}%
              </Button>
            ))}
          </div>
        </div>

        {/* Discount Slider */}
        <div className="px-8 flex-1 flex flex-col justify-center gap-4">
          <Typography
            variant="p"
            className="xs:text-lg"
          >
            Or set a custom discount
          </Typography>
          <div className="bg-white rounded-2xl p-4">
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
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-between border-t border-muted rounded-b-2xl gap-4">
        <Button
          size="lg"
          variant="subtleGray"
          onClick={onClose}
          className="rounded-full flex-1"
        >
          Cancel
        </Button>
        <Button
          size="lg"
          variant="black"
          className="rounded-full flex-1"
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
  )
}
