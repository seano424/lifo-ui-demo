'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useState } from 'react'
import { useMediaQuery } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'

interface DiscountTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function DiscountTab({ selectedBatch, onClose }: DiscountTabProps) {
  const t = useTranslations('todos')
  const tCommon = useTranslations()
  const tErrors = useTranslations('errors.common')

  const activeStoreId = useActiveStoreId()
  const { executeDiscount, isDiscounting } = useBatchActionRPC(activeStoreId || undefined)

  const { isMobile } = useMediaQuery()
  const { resolvedTheme } = useTheme()
  // Discount tab state
  const [discountPercentage, setDiscountPercentage] = useState(
    selectedBatch?.last_discount_percent || 20,
  )
  const [customPrice, setCustomPrice] = useState<string>('')
  const [useCustomPrice, setUseCustomPrice] = useState(false)

  // Calculate price metrics
  const calculatePriceMetrics = () => {
    const originalPrice = Number(
      ((selectedBatch.potential_loss_value || 0) / (selectedBatch.current_quantity || 1)).toFixed(
        2,
      ),
    )
    let actualDiscountPercentage = discountPercentage
    let newPrice = Number((originalPrice * (1 - discountPercentage / 100)).toFixed(2))

    if (useCustomPrice && customPrice) {
      const customPriceNum = Number(customPrice)
      // Validate custom price: must be positive and not exceed original price
      if (customPriceNum > 0 && customPriceNum <= originalPrice && !Number.isNaN(customPriceNum)) {
        newPrice = customPriceNum
        actualDiscountPercentage = Math.round(
          ((originalPrice - customPriceNum) / originalPrice) * 100,
        )
      } else {
        // If invalid, fall back to percentage-based discount
        newPrice = Number((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
      }
    }

    const currentQuantity = selectedBatch.current_quantity || 0
    const totalRevenue = newPrice * currentQuantity
    const originalRevenue = originalPrice * currentQuantity
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

  // Handle discount slider change
  const handleDiscountChange = (value: number) => {
    setDiscountPercentage(value)
    setUseCustomPrice(false)
    setCustomPrice('')
  }

  // Handle discount execution
  const handleDiscountAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: selectedBatch.current_quantity || 0,
        discountPercentage: priceMetrics.actualDiscountPercentage,
        notes: useCustomPrice
          ? `Set price to €${priceMetrics.newPrice.toFixed(2)} (${priceMetrics.actualDiscountPercentage}% discount) - ${selectedBatch.ai_recommendation || ''}`
          : `Applied ${priceMetrics.actualDiscountPercentage}% discount - ${selectedBatch.ai_recommendation || ''}`,
      }

      await executeDiscount(params)

      // Success - show success toast and close the modal
      toast.success(
        t('discount.success', {
          percent: priceMetrics.actualDiscountPercentage,
          product: selectedBatch.product_name ?? '',
        }),
      )
      onClose()
    } catch (error) {
      console.error('[DiscountTab] Discount failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        discountPercentage: priceMetrics.actualDiscountPercentage,
      })

      // Show user-facing error message
      const errorMessage = error instanceof Error ? error.message : tErrors('common.unexpected')
      toast.error(t('discount.error', { error: errorMessage }))
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted dark:bg-brand-dark">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white dark:divide-gray-800">
        {/* Discount Preset Options */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            {t('discount.selectPercentage')}
          </Typography>
          <div className="grid grid-cols-2 gap-2 bg-white dark:bg-brand-dark rounded-2xl p-4">
            {[10, 20, 25, 50].map(preset => (
              <Button
                key={preset}
                size="lg"
                variant={
                  discountPercentage === preset
                    ? resolvedTheme === 'dark'
                      ? 'subtleSecondary'
                      : 'subtleTertiary'
                    : 'outline'
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
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            {t('discount.customDiscount')}
          </Typography>
          <div className="bg-white dark:bg-brand-dark rounded-2xl p-4">
            <InputSlider
              value={discountPercentage}
              onChange={handleDiscountChange}
              min={5}
              max={100}
              step={1}
              label={t('discount.newPrice', {
                price: priceMetrics.newPrice.toFixed(2),
              })}
              suffix="%"
              isPercentage
            />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white dark:bg-brand-dark px-8 py-4 flex justify-between border-t border-muted gap-4">
        <Button
          size={isMobile ? 'default' : 'lg'}
          variant="subtleGray"
          onClick={onClose}
          className="rounded-full flex-1 dark:bg-secondary/10 dark:text-white"
        >
          {tCommon('cancel')}
        </Button>
        <Button
          size={isMobile ? 'default' : 'lg'}
          variant="black"
          className="rounded-full flex-1 hidden sm:block dark:bg-primary dark:text-white"
          onClick={handleDiscountAction}
          disabled={isDiscounting}
        >
          {isDiscounting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white dark:border-brand-dark border-t-transparent rounded-full" />
              {t('discount.processing')}
            </span>
          ) : useCustomPrice && customPrice ? (
            t('discount.setPrice', { price: priceMetrics.newPrice.toFixed(2) })
          ) : (
            t('discount.apply', {
              percent: priceMetrics.actualDiscountPercentage,
            })
          )}
        </Button>
        <Button
          size={isMobile ? 'default' : 'lg'}
          variant="black"
          className="rounded-full flex-1 block sm:hidden dark:bg-primary-900 dark:text-white"
          onClick={handleDiscountAction}
          disabled={isDiscounting}
        >
          {t('discount.action')}
        </Button>
      </div>
    </div>
  )
}
