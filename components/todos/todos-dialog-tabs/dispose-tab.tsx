'use client'

import { InputSlider } from '@/components/ui/input-slider'
import type { ActionableBatch } from '@/hooks/use-batch-actions-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DisposeTabProps {
  selectedBatch: ActionableBatch
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
  const [disposeQuantity, setDisposeQuantity] = useState(selectedBatch.current_quantity)
  const [isDisposeSelectAll, setIsDisposeSelectAll] = useState(true)
  const [selectedDisposalReason, setSelectedDisposalReason] = useState('expired')
  const [customDisposalReason, setCustomDisposalReason] = useState('')
  const [improveAlerts, setImproveAlerts] = useState(false)

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isDisposeSelectAll) {
      setDisposeQuantity(selectedBatch.current_quantity)
    }
  }, [selectedBatch.current_quantity, isDisposeSelectAll])

  // Calculate disposal metrics
  const calculateDisposalMetrics = () => {
    const lossPerUnit = selectedBatch.potential_loss / selectedBatch.current_quantity
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
      setDisposeQuantity(Math.floor(selectedBatch.current_quantity / 2))
      setIsDisposeSelectAll(false)
    } else {
      setDisposeQuantity(selectedBatch.current_quantity)
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
        batchId: selectedBatch.batch_id,
        quantity: disposeQuantity,
        disposalReason,
        notes: `Disposed ${disposeQuantity} units (${disposalReason}) - ${selectedBatch.ai_reasoning}${improveAlerts ? ' - User requested alert improvements' : ''}`,
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
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">🗑️</span>
          <h3 className="font-semibold text-lg">SAFE DISPOSAL</h3>
        </div>
        <p className="text-sm text-muted-foreground">Record disposal for tracking and compliance</p>
      </div>

      {/* Loss Impact Box */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <div className="text-sm space-y-1">
          <div className="font-medium text-red-800 mb-2">Disposal Impact:</div>
          <div className="text-red-700">
            Financial loss: €{disposalMetrics.totalLossValue.toFixed(2)}
          </div>
          <div className="text-red-700">
            Waste weight: ~{disposalMetrics.wasteWeight.toFixed(1)}kg
          </div>
          <div className="text-red-700">
            Environmental impact: ~{disposalMetrics.environmentalImpact}g CO₂
          </div>
        </div>
      </div>

      {/* Disposal Reason Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Reason for Disposal</h3>
        <div className="grid grid-cols-2 gap-2">
          {DISPOSAL_REASONS.map(reason => (
            <button
              key={reason.id}
              type="button"
              onClick={() => handleDisposalReasonChange(reason.id)}
              className={cn(
                'p-3 rounded-lg border text-sm font-medium transition-colors text-left',
                selectedDisposalReason === reason.id
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50',
              )}
            >
              <div className="flex items-center gap-2">
                <span>{reason.icon}</span>
                <span>{reason.label}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedDisposalReason === 'other' && (
          <div className="mt-3">
            <input
              type="text"
              value={customDisposalReason}
              onChange={e => handleCustomReasonChange(e.target.value)}
              placeholder="Enter custom disposal reason"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}
      </div>

      {/* Quantity Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">Disposal Quantity</h3>
          <button
            type="button"
            onClick={handleSelectAllToggle}
            className={cn(
              'text-sm font-medium px-3 py-1 rounded-full transition-colors',
              isDisposeSelectAll
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {isDisposeSelectAll ? 'All Selected' : 'Select All'}
          </button>
        </div>

        <InputSlider
          value={disposeQuantity}
          onChange={handleQuantityChange}
          min={1}
          max={selectedBatch.current_quantity}
          step={1}
          label={`${disposeQuantity} units`}
          suffix={`/${selectedBatch.current_quantity}`}
          sliderColor="#ef4444"
        />

        <p className="text-xs text-gray-500 mt-2">
          Out of {selectedBatch.current_quantity} available units
        </p>
      </div>

      {/* Improve Alerts Checkbox */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={improveAlerts}
            onChange={e => {
              setImproveAlerts(e.target.checked)
            }}
            className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-blue-800">Help improve our alerts</span>
            <p className="text-xs text-blue-600 mt-1">
              This disposal could have been prevented with earlier alerts. Check this to help us
              improve timing.
            </p>
          </div>
        </label>
      </div>

      {/* Expected Outcome */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Expected Outcome</h3>
        <p className="text-sm text-gray-600">
          {disposeQuantity === selectedBatch.current_quantity
            ? 'This will mark all units as disposed and remove this item from your todo list.'
            : `This will reduce inventory by ${disposeQuantity} units. The remaining ${selectedBatch.current_quantity - disposeQuantity} units will stay active.`}
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleDisposeAction}
        disabled={
          isDisposing ||
          disposeQuantity === 0 ||
          (selectedDisposalReason === 'other' && !customDisposalReason.trim())
        }
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-colors',
          'bg-red-600 text-white hover:bg-red-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isDisposing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing Disposal...
          </span>
        ) : (
          `Dispose ${disposeQuantity} Units`
        )}
      </button>
    </div>
  )
}
