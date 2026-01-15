'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useState, useEffect } from 'react'
import { QuantitySelector } from '../components/quantity-selector'
import { Typography } from '@/components/ui/typography'

interface DisposeFormProps {
  batch: TodoItem
  currencySymbol: string
  isLoading: boolean
  onConfirm: (quantity: number, reason: string) => void
}

export function DisposeForm({ batch, currencySymbol, isLoading, onConfirm }: DisposeFormProps) {
  const [quantity, setQuantity] = useState(batch.current_quantity || 0)
  const [reason, setReason] = useState('expired')
  const [customReason, setCustomReason] = useState('')

  useEffect(() => {
    setQuantity(batch.current_quantity || 0)
  }, [batch.current_quantity])

  const reasons = [
    { id: 'expired', label: 'Expired' },
    { id: 'damaged', label: 'Damaged' },
    { id: 'spoiled', label: 'Spoiled' },
    { id: 'recalled', label: 'Recalled' },
    { id: 'contaminated', label: 'Contaminated' },
    { id: 'other', label: 'Other' },
  ]

  const totalLoss = (quantity * (batch.unit_price || 0)).toFixed(2)
  const finalReason = reason === 'other' ? customReason : reason

  return (
    <div className="space-y-4">
      {/* Reason Selection */}
      <div className="flex flex-col gap-4">
        <Typography variant="small">Reason for disposal</Typography>
        <div className="grid grid-cols-2 gap-2">
          {reasons.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={cn(
                'py-2 px-3 text-sm  rounded-3xl transition-all duration-500 ease-in-out flex items-center justify-center gap-2',
                reason === r.id
                  ? 'bg-primary/10 text-black border-8 border-primary/10'
                  : 'bg-white text-black hover:bg-muted/50 border-8 border-transparent',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Reason Input */}
      {reason === 'other' && (
        <div className="flex flex-col gap-4">
          <Typography variant="small">Specify reason</Typography>
          <Input
            type="text"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            placeholder="Enter disposal reason"
            className="rounded-xl border-muted-foreground/10"
          />
        </div>
      )}

      {/* Quantity Selector */}
      <div className="flex flex-col gap-4">
        <Typography variant="small">Quantity</Typography>
        <div className="flex justify-center">
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={batch.current_quantity || 0}
          />
        </div>
      </div>

      {/* Loss Summary */}
      <div className="bg-destructive/5 rounded-3xl p-4">
        <div className="flex justify-between items-center">
          <Typography color="destructive" variant="small">
            Total loss
          </Typography>
          <Typography color="destructive" variant="h5">
            {currencySymbol}
            {totalLoss}
          </Typography>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={() => onConfirm(quantity, finalReason)}
        disabled={isLoading || quantity === 0 || (reason === 'other' && !customReason.trim())}
        className="w-full h-12 bg-destructive text-white hover:bg-destructive/90 rounded-3xl "
      >
        {isLoading ? (
          <Typography variant="small">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </Typography>
        ) : (
          `Dispose ${quantity} units`
        )}
      </Button>
    </div>
  )
}
