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

interface DisposeTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function DisposeTab({ selectedBatch, onClose }: DisposeTabProps) {
  const t = useTranslations('todos')
  const tCommon = useTranslations()
  const tErrors = useTranslations('errors.common')

  const activeStoreId = useActiveStoreId()
  const { executeDispose, isDisposing } = useBatchActionRPC(activeStoreId || undefined)
  const { isMobile } = useMediaQuery()

  // Disposal reason options
  const DISPOSAL_REASONS = [
    { id: 'expired', label: t('dispose.reasons.expired'), icon: '📅' },
    { id: 'damaged', label: t('dispose.reasons.damaged'), icon: '📦' },
    { id: 'spoiled', label: t('dispose.reasons.spoiled'), icon: '🦠' },
    { id: 'recalled', label: t('dispose.reasons.recalled'), icon: '⚠️' },
    {
      id: 'contaminated',
      label: t('dispose.reasons.contaminated'),
      icon: '☣️',
    },
    { id: 'other', label: t('dispose.reasons.other'), icon: '❓' },
  ]

  // Dispose tab state
  const [disposeQuantity, setDisposeQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isDisposeSelectAll, setIsDisposeSelectAll] = useState(true)
  const [selectedDisposalReason, setSelectedDisposalReason] = useState('expired')
  const [customDisposalReason, setCustomDisposalReason] = useState('')
  const [improveAlerts] = useState(false)

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isDisposeSelectAll) {
      setDisposeQuantity(selectedBatch.current_quantity || 0)
    }
  }, [selectedBatch.current_quantity, isDisposeSelectAll])

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setDisposeQuantity(value)
    setIsDisposeSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle disposal reason selection
  const handleDisposalReasonChange = (reason: string) => {
    setSelectedDisposalReason(reason)
    if (reason !== 'other') {
      setCustomDisposalReason('')
    }
  }

  // Handle custom reason input
  const handleCustomReasonChange = (value: string) => {
    setCustomDisposalReason(value)
  }

  // Handle dispose execution
  const handleDisposeAction = async () => {
    const disposalReason =
      selectedDisposalReason === 'other' ? customDisposalReason : selectedDisposalReason

    // Validate custom disposal reason if 'other' is selected
    if (selectedDisposalReason === 'other' && !customDisposalReason.trim()) {
      toast.error(t('dispose.provideReason'))
      return
    }

    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: disposeQuantity,
        disposalReason,
        notes: `Disposed ${disposeQuantity} units (${disposalReason}) - ${selectedBatch.ai_recommendation || ''}${improveAlerts ? ' - User requested alert improvements' : ''}`,
        recommendedAction: (selectedBatch.ai_recommendation as RecommendedAction) || undefined,
      }

      await executeDispose(params)

      // Success - show success toast and close the modal
      toast.success(t('dispose.success', { quantity: disposeQuantity }))
      onClose()
    } catch (error) {
      console.error('[DisposeTab] Disposal failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: disposeQuantity,
        disposalReason,
      })

      // Show user-facing error message
      const errorMessage = error instanceof Error ? error.message : tErrors('unexpected')
      toast.error(t('dispose.error', { error: errorMessage }))
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted dark:bg-brand-dark">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white dark:divide-gray-800">
        {/* Disposal Reason Selection */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            {t('dispose.whyDisposing')}
          </Typography>
          <div className="bg-white rounded-2xl p-4 dark:bg-brand-dark">
            <div className="grid sm:grid-cols-2 grid-cols-1 gap-2">
              {DISPOSAL_REASONS.map(reason => (
                <Button
                  key={reason.id}
                  size="lg"
                  variant={selectedDisposalReason === reason.id ? 'subtleTertiary' : 'outline'}
                  onClick={() => handleDisposalReasonChange(reason.id)}
                  className="border-none shadow justify-start"
                >
                  <div className="flex items-center gap-2">
                    <span>{reason.icon}</span>
                    <span className="text-sm">{reason.label}</span>
                  </div>
                </Button>
              ))}
            </div>
            {selectedDisposalReason === 'other' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={customDisposalReason}
                  onChange={e => handleCustomReasonChange(e.target.value)}
                  placeholder={t('dispose.customReasonPlaceholder')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            {t('dispose.howMany')}
          </Typography>
          <div className="bg-white rounded-2xl p-4 dark:bg-brand-dark">
            <InputSlider
              value={disposeQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={t('dispose.markAsDisposed', { quantity: disposeQuantity })}
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
          onClick={handleDisposeAction}
          disabled={
            isDisposing ||
            disposeQuantity === 0 ||
            (selectedDisposalReason === 'other' && !customDisposalReason.trim())
          }
        >
          {isDisposing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white dark:border-brand-dark border-t-transparent rounded-full" />
              {t('dispose.processing')}
            </span>
          ) : disposeQuantity === (selectedBatch.current_quantity || 0) ? (
            t('dispose.disposeAll')
          ) : (
            t('dispose.dispose', { quantity: disposeQuantity })
          )}
        </Button>
      </div>
    </div>
  )
}
