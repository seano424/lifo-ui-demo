'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useState, useEffect } from 'react'
import { QuantitySelector } from '../components/quantity-selector'

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
      <div className="space-y-2">
        <label className="text-sm font-medium text-black">Reason for disposal</label>
        <div className="grid grid-cols-2 gap-2">
          {reasons.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={cn(
                'py-2 px-3 text-sm font-medium rounded-lg transition-all',
                reason === r.id
                  ? 'bg-black text-white'
                  : 'bg-white text-black border border-muted-foreground/10 hover:bg-muted-foreground/5',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Reason Input */}
      {reason === 'other' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-black">Specify reason</label>
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
      <div className="space-y-2">
        <label className="text-sm font-medium text-black">Quantity</label>
        <div className="flex justify-center">
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={batch.current_quantity || 0}
          />
        </div>
      </div>

      {/* Loss Summary */}
      <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-destructive">Total loss</span>
          <span className="text-lg font-semibold text-destructive">
            {currencySymbol}
            {totalLoss}
          </span>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={() => onConfirm(quantity, finalReason)}
        disabled={isLoading || quantity === 0 || (reason === 'other' && !customReason.trim())}
        className="w-full h-12 bg-destructive text-white hover:bg-destructive/90 rounded-xl font-medium"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          `Dispose ${quantity} units`
        )}
      </Button>
    </div>
  )
}
