'use client'

import { Button } from '@/components/ui/button'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useState, useEffect } from 'react'
import { QuantitySelector } from '../components/quantity-selector'
import { RecipientSelector } from '@/components/donation/recipient-selector'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'

interface DonateFormProps {
  batch: TodoItem
  isLoading: boolean
  onConfirm: (quantity: number, recipientId: string, recipientName: string) => void
}

export function DonateForm({ batch, isLoading, onConfirm }: DonateFormProps) {
  const [quantity, setQuantity] = useState(batch.current_quantity || 0)
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('')
  const activeStoreId = useActiveStoreId()

  useEffect(() => {
    setQuantity(batch.current_quantity || 0)
  }, [batch.current_quantity])

  const handleRecipientSelect = (recipientId: string, recipientName: string) => {
    setSelectedRecipient(recipientId)
    setSelectedRecipientName(recipientName)
  }

  return (
    <div className="space-y-4">
      {/* Recipient Selection */}
      <div className="space-y-2">
        <RecipientSelector
          storeId={activeStoreId || undefined}
          selectedRecipientId={selectedRecipient || undefined}
          selectedRecipientName={selectedRecipientName}
          onRecipientSelect={handleRecipientSelect}
        />
      </div>

      {/* Quantity Selector */}
      <div className="space-y-2">
        <Typography variant="small">Quantity</Typography>
        <div className="flex justify-center">
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={batch.current_quantity || 0}
          />
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={() => onConfirm(quantity, selectedRecipient, selectedRecipientName)}
        disabled={isLoading || quantity === 0 || !selectedRecipient}
        className="w-full h-12 bg-black text-white hover:bg-black/90 rounded-3xl"
      >
        {isLoading ? (
          <Typography variant="small">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </Typography>
        ) : quantity === batch.current_quantity ? (
          'Donate all'
        ) : (
          `Donate ${quantity} units`
        )}
      </Button>
    </div>
  )
}
