'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DisposeTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

// Disposal reason options
const DISPOSAL_REASONS = [
  { id: 'expired', label: 'Expired/Past due date', icon: '📅' },
  { id: 'damaged', label: 'Damaged packaging', icon: '📦' },
  { id: 'spoiled', label: 'Spoiled/Quality issues', icon: '🦠' },
  { id: 'recalled', label: 'Product recall', icon: '⚠️' },
  { id: 'contaminated', label: 'Contaminated', icon: '☣️' },
  { id: 'other', label: 'Other reason', icon: '❓' },
]

export function DisposeTab({ selectedBatch, onClose }: DisposeTabProps) {
  const { executeDispose, isDisposing } = useBatchActionRPC()

  // Dispose tab state
  const [disposeQuantity, setDisposeQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isDisposeSelectAll, setIsDisposeSelectAll] = useState(true)
  const [selectedDisposalReason, setSelectedDisposalReason] = useState('expired')
  const [customDisposalReason, setCustomDisposalReason] = useState('')
  const [improveAlerts, setImproveAlerts] = useState(false)

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isDisposeSelectAll) {
      setDisposeQuantity(selectedBatch.current_quantity || 0)
    }
  }, [selectedBatch.current_quantity, isDisposeSelectAll])

  // Calculate disposal metrics
  const calculateDisposalMetrics = () => {
    const lossPerUnit =
      (selectedBatch.potential_loss_value || 0) / (selectedBatch.current_quantity || 1)
    const totalLossValue = lossPerUnit * disposeQuantity
    const wasteWeight = disposeQuantity * 0.5 // Estimate 500g per unit

    const metrics = {
      lossPerUnit,
      totalLossValue,
      wasteWeight,
      environmentalImpact: Math.round(wasteWeight * 2.1), // CO2 equivalent estimate
    }

    return metrics
  }

  const disposalMetrics = calculateDisposalMetrics()

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setDisposeQuantity(value)
    setIsDisposeSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (isDisposeSelectAll) {
      setDisposeQuantity(Math.floor((selectedBatch.current_quantity || 0) / 2))
      setIsDisposeSelectAll(false)
    } else {
      setDisposeQuantity(selectedBatch.current_quantity || 0)
      setIsDisposeSelectAll(true)
    }
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

    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: disposeQuantity,
        disposalReason,
        notes: `Disposed ${disposeQuantity} units (${disposalReason}) - ${selectedBatch.ai_recommendation || ''}${improveAlerts ? ' - User requested alert improvements' : ''}`,
      }

      const _result = await executeDispose(params)

      // Success - close the modal
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
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white">
        {/* Disposal Reason Selection */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            Why are you disposing this?
          </Typography>
          <div className="bg-white rounded-2xl p-4">
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
                  placeholder="Enter custom disposal reason"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            How many units to dispose?
          </Typography>
          <div className="bg-white rounded-2xl p-4">
            <InputSlider
              value={disposeQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={`Mark as disposed: ${disposeQuantity} units`}
            />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-between border-t border-muted gap-4">
        <Button size="lg" variant="subtleGray" onClick={onClose} className="rounded-full flex-1">
          Cancel
        </Button>
        <Button
          size="lg"
          variant="black"
          className="rounded-full flex-1"
          onClick={handleDisposeAction}
          disabled={
            isDisposing ||
            disposeQuantity === 0 ||
            (selectedDisposalReason === 'other' && !customDisposalReason.trim())
          }
        >
          {isDisposing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Disposal...
            </span>
          ) : disposeQuantity === (selectedBatch.current_quantity || 0) ? (
            'Dispose all'
          ) : (
            `Dispose ${disposeQuantity}`
          )}
        </Button>
      </div>
    </div>
  )
}
