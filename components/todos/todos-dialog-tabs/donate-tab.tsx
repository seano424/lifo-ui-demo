'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC, type RecommendedAction } from '@/hooks/use-batch-actions-rpc'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { RecipientSelector } from '@/components/donation/recipient-selector'

interface DonateTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function DonateTab({ selectedBatch, onClose }: DonateTabProps) {
  const t = useTranslations('todos')
  const tCommon = useTranslations()
  const tErrors = useTranslations('errors.common')

  const activeStoreId = useActiveStoreId()

  const { executeDonate, isDonating } = useBatchActionRPC(activeStoreId || undefined)

  const { isMobile } = useMediaQuery()

  // State management
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('')
  const [donateQuantity, setDonateQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isSelectAll, setIsSelectAll] = useState(true)

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSelectAll) {
      setDonateQuantity(selectedBatch.current_quantity || 0)
    }
  }, [selectedBatch.current_quantity, isSelectAll])

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setDonateQuantity(value)
    setIsSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle donation execution
  const handleDonateAction = async () => {
    if (!selectedRecipient || !selectedRecipientName) {
      toast.error(t('donate.selectRecipient'))
      return
    }

    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: donateQuantity,
        donationRecipientId: selectedRecipient,
        notes: `Donated ${donateQuantity} units of ${selectedBatch.product_name || ''} to ${selectedRecipientName} - ${selectedBatch.ai_recommendation || ''}`,
        recommendedAction: (selectedBatch.ai_recommendation as RecommendedAction) || undefined,
      }

      await executeDonate(params)

      // Success - show success toast and close the modal
      toast.success(
        t('donate.success', {
          quantity: donateQuantity,
          recipient: selectedRecipientName,
        }),
      )
      onClose()
    } catch (error) {
      console.error('[DonateTab] Donation failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: donateQuantity,
        selectedRecipient,
        selectedRecipientName,
      })

      // Show user-facing error message
      const errorMessage = error instanceof Error ? error.message : tErrors('common.unexpected')
      toast.error(t('donate.error', { error: errorMessage }))
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted dark:bg-brand-dark">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white dark:divide-gray-800">
        {/* Recipient Selection */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            {t('donate.selectRecipient')}
          </Typography>
          <div className="bg-white rounded-2xl p-4 dark:bg-brand-dark">
            <RecipientSelector
              storeId={activeStoreId || undefined}
              selectedRecipientId={selectedRecipient || undefined}
              selectedRecipientName={selectedRecipientName}
              onRecipientSelect={(recipientId, recipientName) => {
                setSelectedRecipient(recipientId)
                setSelectedRecipientName(recipientName)
              }}
            />
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            {t('donate.howMany')}
          </Typography>
          <div className="bg-white rounded-2xl p-4 dark:bg-brand-dark">
            <InputSlider
              value={donateQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={t('donate.markForDonation', { quantity: donateQuantity })}
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
          onClick={handleDonateAction}
          disabled={isDonating || donateQuantity === 0 || !selectedRecipient}
        >
          {isDonating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white dark:border-brand-dark border-t-transparent rounded-full" />
              {t('donate.processing')}
            </span>
          ) : donateQuantity === (selectedBatch.current_quantity || 0) ? (
            t('donate.donateAll')
          ) : (
            t('donate.donate', { quantity: donateQuantity })
          )}
        </Button>
      </div>
    </div>
  )
}
