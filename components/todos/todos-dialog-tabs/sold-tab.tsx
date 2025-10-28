'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC, isValidRecommendedAction } from '@/hooks/use-batch-actions-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface SoldTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function SoldTab({ selectedBatch, onClose }: SoldTabProps) {
  const t = useTranslations('todos')
  const tCommon = useTranslations()
  const tErrors = useTranslations('errors.common')

  const activeStoreId = useActiveStoreId()
  const { executeSold, isMarkingSold } = useBatchActionRPC(activeStoreId || undefined)
  const { isMobile } = useMediaQuery()

  // Sale timing options
  const SALE_TIMING_OPTIONS = [
    { id: 'just-now', label: t('sold.timing.justNow') },
    { id: 'today', label: t('sold.timing.today') },
    { id: 'yesterday', label: t('sold.timing.yesterday') },
    { id: 'this-week', label: t('sold.timing.thisWeek') },
  ]

  // Sold tab state
  const [soldQuantity, setSoldQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isSoldSelectAll, setIsSoldSelectAll] = useState(true)
  const [soldTiming, setSoldTiming] = useState('just-now')

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSoldSelectAll) {
      setSoldQuantity(selectedBatch.current_quantity || 0)
    }
  }, [selectedBatch.current_quantity, isSoldSelectAll])

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setSoldQuantity(value)
    setIsSoldSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle timing selection
  const handleTimingChange = (timing: string) => {
    setSoldTiming(timing)
  }

  // Handle sold execution
  const handleSoldAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: soldQuantity,
        notes: `Marked ${soldQuantity} units as sold (${SALE_TIMING_OPTIONS.find(opt => opt.id === soldTiming)?.label}) - ${selectedBatch.ai_recommendation || ''}`,
        recommendedAction: isValidRecommendedAction(selectedBatch.ai_recommendation)
          ? selectedBatch.ai_recommendation
          : undefined,
      }

      await executeSold(params)

      // Success - show success toast and close the modal
      toast.success(t('sold.success', { quantity: soldQuantity }))
      onClose()
    } catch (error) {
      console.error('[SoldTab] Sold action failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: soldQuantity,
      })

      // Show user-facing error message
      const errorMessage = error instanceof Error ? error.message : tErrors('common.unexpected')
      toast.error(t('sold.error', { error: errorMessage }))
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted dark:bg-brand-dark">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white dark:divide-gray-800">
        {/* Sale Timing Options */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            {t('sold.whenSell')}
          </Typography>
          <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-4 dark:bg-brand-dark">
            {SALE_TIMING_OPTIONS.map(option => (
              <Button
                key={option.id}
                size="lg"
                variant={soldTiming === option.id ? 'subtleTertiary' : 'outline'}
                onClick={() => handleTimingChange(option.id)}
                className="border-none shadow"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quantity Slider */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            {t('sold.howMany')}
          </Typography>
          <div className="bg-white rounded-2xl p-4 dark:bg-brand-dark">
            <InputSlider
              value={soldQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={t('sold.markAsSold', { quantity: soldQuantity })}
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
          className="rounded-full flex-1 dark:bg-primary dark:text-white"
          onClick={handleSoldAction}
          disabled={isMarkingSold || soldQuantity === 0}
        >
          {isMarkingSold ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white dark:border-brand-dark border-t-transparent rounded-full" />
              {t('sold.processing')}
            </span>
          ) : soldQuantity === (selectedBatch.current_quantity || 0) ? (
            t('sold.sellAll')
          ) : (
            t('sold.sell', { quantity: soldQuantity })
          )}
        </Button>
      </div>
    </div>
  )
}
