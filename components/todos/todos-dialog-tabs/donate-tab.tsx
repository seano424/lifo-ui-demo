'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/use-mobile'
import { toast } from 'sonner'

interface DonateTabProps {
  selectedBatch: TodoItem
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
      const startTime = performance.now()
      logger.log('DonateTab', 'Starting donation recipients query', { batchId })

      // First get the store_id from the batch
      const batchStartTime = performance.now()
      const { data: batchData, error: batchError } = await supabase
        .schema('inventory')
        .from('batches')
        .select('store_id')
        .eq('batch_id', batchId)
        .single()
      const batchEndTime = performance.now()
      logger.log(
        'DonateTab',
        `Batch store lookup took ${(batchEndTime - batchStartTime).toFixed(2)}ms`,
        {
          batchId,
          storeId: batchData?.store_id,
        },
      )

      if (batchError) throw batchError
      if (!batchData?.store_id) throw new Error('Store ID not found for batch')

      // Then get donation recipients for that store
      const recipientsStartTime = performance.now()
      const { data, error } = await supabase
        .schema('inventory')
        .from('donation_recipients')
        .select('recipient_id, name, recipient_type, store_id, is_active')
        .eq('store_id', batchData.store_id)
        .eq('is_active', true)
        .order('name')
      const recipientsEndTime = performance.now()

      const totalTime = performance.now() - startTime
      logger.log(
        'DonateTab',
        `Recipients query completed in ${(recipientsEndTime - recipientsStartTime).toFixed(2)}ms (total: ${totalTime.toFixed(2)}ms)`,
        {
          batchId,
          storeId: batchData.store_id,
          recipientCount: data?.length || 0,
        },
      )

      if (error) throw error
      return data as DonationRecipient[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!batchId, // Only run if we have a batch ID
  })
}

export function DonateTab({ selectedBatch, onClose }: DonateTabProps) {
  const activeStoreId = useActiveStoreId()

  // Log to verify we have the store ID
  useEffect(() => {
    logger.log('DonateTab', 'Active store ID from context', {
      activeStoreId,
      batchId: selectedBatch.batch_id,
    })
  }, [activeStoreId, selectedBatch.batch_id])

  const { executeDonate, isDonating } = useBatchActionRPC(activeStoreId || undefined)

  const { isMobile } = useMediaQuery()
  // Fetch donation recipients for this batch
  const { data: recipients = [], isLoading: loadingRecipients } = useDonationRecipients(
    selectedBatch.batch_id || '', // Changed to use batch_id instead of store_id
  )

  // State management
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [donateQuantity, setDonateQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isSelectAll, setIsSelectAll] = useState(true)

  // Set default recipient when recipients load
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipient) {
      // Prefer food banks, then charities, then any other type
      const defaultRecipient =
        recipients.find(r => r.recipient_type === 'food_bank') ||
        recipients.find(r => r.recipient_type === 'charity') ||
        recipients[0]

      if (defaultRecipient) {
        setSelectedRecipient(defaultRecipient.recipient_id)
      }
    }
  }, [recipients, selectedRecipient])

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
    if (!selectedRecipient) {
      toast.error('Please select a donation recipient')
      return
    }

    try {
      const recipientName =
        recipients.find(r => r.recipient_id === selectedRecipient)?.name || 'Unknown'

      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: donateQuantity,
        donationRecipientId: selectedRecipient, // Now using actual UUID
        notes: `Donated ${donateQuantity} units of ${selectedBatch.product_name || ''} to ${recipientName} - ${selectedBatch.ai_recommendation || ''}`,
      }

      await executeDonate(params)

      // Success - show success toast and close the modal
      toast.success(`Successfully donated ${donateQuantity} units to ${recipientName}`)
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

      // Show user-facing error message
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(`Failed to process donation: ${errorMessage}`)
    }
  }

  // Loading state
  if (loadingRecipients) {
    return (
      <div className="flex flex-col h-full bg-muted">
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-gray-600">Loading donation recipients...</span>
          </div>
        </div>
      </div>
    )
  }

  // No recipients available
  if (recipients.length === 0) {
    return (
      <div className="flex flex-col h-full bg-muted">
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-8">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No donation recipients available for this store.</p>
            <p className="text-sm text-gray-500">
              Contact your admin to set up donation recipients.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white">
        {/* Recipient Selection */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            Select donation recipient
          </Typography>
          <div className="bg-white rounded-2xl p-4">
            <div className="grid grid-cols-1 gap-2">
              {recipients.map(recipient => (
                <Button
                  key={recipient.recipient_id}
                  size="lg"
                  variant={
                    selectedRecipient === recipient.recipient_id ? 'subtleTertiary' : 'outline'
                  }
                  onClick={() => setSelectedRecipient(recipient.recipient_id)}
                  className="border-none shadow justify-start"
                >
                  <div className="text-left">
                    <div className="font-medium">{recipient.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {recipient.recipient_type.replace('_', ' ')}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            How many units to donate?
          </Typography>
          <div className="bg-white rounded-2xl p-4">
            <InputSlider
              value={donateQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={`Mark for donation: ${donateQuantity} units`}
            />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-between border-t border-muted gap-4">
        <Button
          size={isMobile ? 'default' : 'lg'}
          variant="subtleGray"
          onClick={onClose}
          className="rounded-full flex-1"
        >
          Cancel
        </Button>
        <Button
          size={isMobile ? 'default' : 'lg'}
          variant="black"
          className="rounded-full flex-1"
          onClick={handleDonateAction}
          disabled={isDonating || donateQuantity === 0 || !selectedRecipient}
        >
          {isDonating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Donation...
            </span>
          ) : donateQuantity === (selectedBatch.current_quantity || 0) ? (
            'Donate all'
          ) : (
            `Donate ${donateQuantity}`
          )}
        </Button>
      </div>
    </div>
  )
}
