'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useState, useEffect } from 'react'
import { QuantitySelector } from '../components/quantity-selector'
import { Typography } from '@/components/ui/typography'

interface SellFormProps {
  batch: TodoItem
  currencySymbol: string
  isLoading: boolean
  onConfirm: (quantity: number, timing: string) => void
}

export function SellForm({ batch, currencySymbol, isLoading, onConfirm }: SellFormProps) {
  const [quantity, setQuantity] = useState(batch.current_quantity || 0)
  const [timing, setTiming] = useState('just-now')

  useEffect(() => {
    setQuantity(batch.current_quantity || 0)
  }, [batch.current_quantity])

  const revenue = (quantity * (batch.current_selling_price || batch.selling_price || 0)).toFixed(2)

  const timingOptions = [
    { id: 'just-now', label: 'Just now' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this-week', label: 'This week' },
  ]

  return (
    <div className="space-y-4">
      {/* Timing Selection */}
      <div className="space-y-2">
        <Typography variant="small">When was it sold?</Typography>
        <div className="grid grid-cols-2 gap-2">
          {timingOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTiming(option.id)}
              className={cn(
                'py-2 px-3 text-sm font-medium rounded-3xl transition-all duration-500 ease-in-out',
                timing === option.id
                  ? 'bg-primary/10 text-black border-8 border-primary/10'
                  : 'bg-white text-black hover:bg-muted/50 border-8 border-transparent',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
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

      {/* Revenue Preview */}
      <div className="bg-white rounded-3xl p-3 border border-muted-foreground/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Revenue</span>
          <span className="text-lg font-semibold text-black">
            {currencySymbol}
            {revenue}
          </span>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={() => onConfirm(quantity, timing)}
        disabled={isLoading || quantity === 0}
        className="w-full h-12 bg-black text-white hover:bg-black/90 rounded-3xl text-base"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : quantity === batch.current_quantity ? (
          'Mark all as sold'
        ) : (
          `Mark ${quantity} as sold`
        )}
      </Button>
    </div>
  )
}
