'use client'

import { useEffect, useState } from 'react'
import { InputSlider } from '@/components/ui/input-slider'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import type { ActionableBatch } from '@/hooks/use-todos-rpc'
import { cn } from '@/lib/utils'

interface DonateTabProps {
  selectedBatch: ActionableBatch
  onClose: () => void
}

// Donation recipients configuration
const DONATION_RECIPIENTS = [
  { id: 'local-foodbank', name: 'Local Foodbank', default: true },
  { id: 'soup-kitchen', name: 'Soup Kitchen' },
  { id: 'charity-org', name: 'Charity Organization' },
  { id: 'community-center', name: 'Community Center' },
]

export function DonateTab({ selectedBatch, onClose }: DonateTabProps) {
  const { executeDonate, isDonating } = useBatchActionRPC()

  // State management
  const [selectedRecipient, setSelectedRecipient] = useState(
    DONATION_RECIPIENTS.find(r => r.default)?.id || 'local-foodbank',
  )
  const [donateQuantity, setDonateQuantity] = useState(selectedBatch.current_quantity)
  const [isSelectAll, setIsSelectAll] = useState(true)

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSelectAll) {
      setDonateQuantity(selectedBatch.current_quantity)
    }
  }, [selectedBatch.current_quantity, isSelectAll])

  // Calculate donation impact metrics
  const calculateDonationImpact = () => {
    const preventedWaste =
      (donateQuantity * selectedBatch.potential_loss) / selectedBatch.current_quantity
    const mealsProvided = Math.round(donateQuantity * 2.5) // Estimate
    const taxBenefit = preventedWaste * 0.25 // Estimate 25% tax benefit

    return {
      preventedWaste,
      mealsProvided,
      taxBenefit,
    }
  }

  const impact = calculateDonationImpact()

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setDonateQuantity(value)
    setIsSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (isSelectAll) {
      setDonateQuantity(Math.floor(selectedBatch.current_quantity / 2))
      setIsSelectAll(false)
    } else {
      setDonateQuantity(selectedBatch.current_quantity)
      setIsSelectAll(true)
    }
  }

  // Handle donation execution
  const handleDonateAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id,
        quantity: donateQuantity,
        donationRecipientId: selectedRecipient,
        notes: `Donated ${donateQuantity} units of ${selectedBatch.product_name} to ${
          DONATION_RECIPIENTS.find(r => r.id === selectedRecipient)?.name
        } - ${selectedBatch.ai_reasoning}`,
      }

      const _result = await executeDonate(params)

      // Success - close the modal
      onClose()
    } catch (error) {
      console.error('[DonateTab] Donation failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: donateQuantity,
      })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Recipient Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Select Recipient</h3>
        <div className="grid grid-cols-2 gap-2">
          {DONATION_RECIPIENTS.map(recipient => (
            <button
              key={recipient.id}
              type="button"
              onClick={() => {
                setSelectedRecipient(recipient.id)
              }}
              className={cn(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                selectedRecipient === recipient.id
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50',
              )}
            >
              {recipient.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">Donation Quantity</h3>
          <button
            type="button"
            onClick={handleSelectAllToggle}
            className={cn(
              'text-sm font-medium px-3 py-1 rounded-full transition-colors',
              isSelectAll
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {isSelectAll ? 'All Selected' : 'Select All'}
          </button>
        </div>

        <InputSlider
          value={donateQuantity}
          onChange={handleQuantityChange}
          min={1}
          max={selectedBatch.current_quantity}
          step={1}
          label={`${donateQuantity} units`}
        />

        <p className="text-xs text-gray-500 mt-2">
          Out of {selectedBatch.current_quantity} available units
        </p>
      </div>

      {/* Donation Impact */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h3 className="text-sm font-medium mb-3 text-green-800">Donation Impact</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Prevented Waste Value:</span>
            <span className="font-medium text-green-800">€{impact.preventedWaste.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Estimated Meals Provided:</span>
            <span className="font-medium text-green-800">{impact.mealsProvided}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Potential Tax Benefit:</span>
            <span className="font-medium text-green-800">€{impact.taxBenefit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Expected Outcome */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Expected Outcome</h3>
        <p className="text-sm text-gray-600">
          {donateQuantity === selectedBatch.current_quantity
            ? 'This donation will fully resolve the alert and remove this item from your todo list.'
            : `This partial donation will reduce inventory by ${donateQuantity} units. The alert will remain active for the remaining ${selectedBatch.current_quantity - donateQuantity} units.`}
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleDonateAction}
        disabled={isDonating || donateQuantity === 0}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-colors',
          'bg-green-600 text-white hover:bg-green-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isDonating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing Donation...
          </span>
        ) : (
          `Donate ${donateQuantity} Units to ${DONATION_RECIPIENTS.find(r => r.id === selectedRecipient)?.name}`
        )}
      </button>
    </div>
  )
}
