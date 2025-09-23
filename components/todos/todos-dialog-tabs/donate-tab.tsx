'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import type { ActionableBatch } from '@/hooks/use-batch-actions-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

interface DonateTabProps {
  selectedBatch: ActionableBatch
  onClose: () => void
}

// Type for donation recipients from database
interface DonationRecipient {
  recipient_id: string
  name: string
  recipient_type: string
  store_id: string
  is_active: boolean
}

// Hook to fetch donation recipients for the current store
function useDonationRecipients(batchId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['donation-recipients', batchId],
    queryFn: async () => {
      // First get the store_id from the batch
      const { data: batchData, error: batchError } = await supabase
        .schema('inventory')
        .from('batches')
        .select('store_id')
        .eq('batch_id', batchId)
        .single()

      if (batchError) throw batchError
      if (!batchData?.store_id) throw new Error('Store ID not found for batch')

      // Then get donation recipients for that store
      const { data, error } = await supabase
        .schema('inventory')
        .from('donation_recipients')
        .select('recipient_id, name, recipient_type, store_id, is_active')
        .eq('store_id', batchData.store_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as DonationRecipient[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!batchId, // Only run if we have a batch ID
  })
}

export function DonateTab({ selectedBatch, onClose }: DonateTabProps) {
  const { executeDonate, isDonating } = useBatchActionRPC()

  // Fetch donation recipients for this batch
  const { data: recipients = [], isLoading: loadingRecipients } =
    useDonationRecipients(
      selectedBatch.batch_id // Changed to use batch_id instead of store_id
    )

  // State management
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [donateQuantity, setDonateQuantity] = useState(
    selectedBatch.current_quantity
  )
  const [isSelectAll, setIsSelectAll] = useState(true)

  // Set default recipient when recipients load
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipient) {
      // Prefer food banks, then charities, then any other type
      const defaultRecipient =
        recipients.find((r) => r.recipient_type === 'food_bank') ||
        recipients.find((r) => r.recipient_type === 'charity') ||
        recipients[0]

      if (defaultRecipient) {
        setSelectedRecipient(defaultRecipient.recipient_id)
      }
    }
  }, [recipients, selectedRecipient])

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSelectAll) {
      setDonateQuantity(selectedBatch.current_quantity)
    }
  }, [selectedBatch.current_quantity, isSelectAll])

  // Calculate donation impact metrics
  const calculateDonationImpact = () => {
    const preventedWaste =
      (donateQuantity * selectedBatch.potential_loss) /
      selectedBatch.current_quantity
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
    if (!selectedRecipient) {
      console.error('No donation recipient selected')
      return
    }

    try {
      const recipientName =
        recipients.find((r) => r.recipient_id === selectedRecipient)?.name ||
        'Unknown'

      const params = {
        batchId: selectedBatch.batch_id,
        quantity: donateQuantity,
        donationRecipientId: selectedRecipient, // Now using actual UUID
        notes: `Donated ${donateQuantity} units of ${selectedBatch.product_name} to ${recipientName} - ${selectedBatch.ai_reasoning}`,
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
        selectedRecipient,
      })
    }
  }

  // Loading state
  if (loadingRecipients) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
          <span className="ml-2 text-gray-600">
            Loading donation recipients...
          </span>
        </div>
      </div>
    )
  }

  // No recipients available
  if (recipients.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No donation recipients available for this store.
          </p>
          <p className="text-sm text-gray-500">
            Contact your admin to set up donation recipients.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Recipient Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Select Recipient</h3>
          <div className="grid grid-cols-1 gap-2">
            {recipients.map((recipient) => (
              <button
                key={recipient.recipient_id}
                type="button"
                onClick={() => setSelectedRecipient(recipient.recipient_id)}
                className={cn(
                  'p-3 rounded-lg border text-sm font-medium transition-colors text-left',
                  selectedRecipient === recipient.recipient_id
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="font-medium">{recipient.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {recipient.recipient_type.replace('_', ' ')}
                </div>
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
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            sliderColor="#9333ea"
          />

          <p className="text-xs text-gray-500 mt-2">
            Out of {selectedBatch.current_quantity} available units
          </p>
        </div>

        {/* Donation Impact */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-sm font-medium mb-3 text-green-800">
            Donation Impact
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Prevented Waste Value:</span>
              <span className="font-medium text-green-800">
                €{impact.preventedWaste.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Estimated Meals Provided:</span>
              <span className="font-medium text-green-800">
                {impact.mealsProvided}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Potential Tax Benefit:</span>
              <span className="font-medium text-green-800">
                €{impact.taxBenefit.toFixed(2)}
              </span>
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
          onClick={handleDonateAction}
          disabled={isDonating || donateQuantity === 0 || !selectedRecipient}
        >
          {isDonating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Donation...
            </span>
          ) : (
            'Mark for Donation'
          )}
        </Button>
      </div>
    </div>
  )
}
