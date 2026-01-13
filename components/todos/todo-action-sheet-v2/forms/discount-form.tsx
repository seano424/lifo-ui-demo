'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useState, useEffect } from 'react'
import { QuantitySelector } from '../components/quantity-selector'

interface DiscountFormProps {
  batch: TodoItem
  currencySymbol: string
  isLoading: boolean
  onConfirm: (quantity: number, discountPercentage: number, printLabels: boolean) => void
}

export function DiscountForm({ batch, currencySymbol, isLoading, onConfirm }: DiscountFormProps) {
  const [quantity, setQuantity] = useState(batch.current_quantity || 0)
  const [discountPercentage, setDiscountPercentage] = useState(batch.last_discount_percent || 20)
  const [customDiscount, setCustomDiscount] = useState('')
  const [printLabels, setPrintLabels] = useState(false)

  useEffect(() => {
    setQuantity(batch.current_quantity || 0)
  }, [batch.current_quantity])

  const discountPresets = [20, 30, 40, 50]

  const originalPrice = (batch.potential_loss_value || 0) / Math.max(batch.current_quantity || 1, 1)
  const newPrice = originalPrice * (1 - discountPercentage / 100)

  const handlePresetClick = (preset: number) => {
    setDiscountPercentage(preset)
    setCustomDiscount('')
  }

  const handleCustomChange = (value: string) => {
    setCustomDiscount(value)
    const numValue = Number.parseInt(value, 10)
    if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setDiscountPercentage(numValue)
    }
  }

  return (
    <div className="space-y-4">
      {/* Discount Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-black">Select discount</label>
        <div className="grid grid-cols-5 gap-2">
          {discountPresets.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'py-2 px-2 text-sm font-medium rounded-3xl transition-all',
                discountPercentage === preset && !customDiscount
                  ? 'bg-primary/10 text-black border-8 border-primary/10'
                  : 'bg-white text-black hover:bg-muted/50 border-8 border-transparent',
              )}
            >
              {preset}%
            </button>
          ))}
          <input
            type="number"
            value={customDiscount}
            onChange={e => handleCustomChange(e.target.value)}
            placeholder="..."
            min="0"
            max="100"
            className={cn(
              'py-2 px-2 text-sm font-medium rounded-lg text-center transition-all',
              customDiscount ? 'bg-black text-white' : 'bg-white text-black border border-muted/50',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1',
            )}
          />
        </div>
      </div>

      {/* Price Preview */}
      <div className="bg-white rounded-xl p-4 border border-muted/50">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Original price</span>
            <span className="text-sm text-muted-foreground line-through">
              {currencySymbol}
              {originalPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-black">New price</span>
            <span className="text-lg font-semibold text-black">
              {currencySymbol}
              {newPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

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

      {/* Print Labels Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="print-labels"
          checked={printLabels}
          onCheckedChange={checked => setPrintLabels(checked as boolean)}
        />
        <label htmlFor="print-labels" className="text-sm font-medium text-black cursor-pointer">
          Print discount labels
        </label>
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        onClick={() => onConfirm(quantity, discountPercentage, printLabels)}
        disabled={isLoading || quantity === 0}
        className="w-full h-12 bg-black text-white hover:bg-black/90 rounded-3xl text-base"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          `Mark ${quantity} as discounted`
        )}
      </Button>
    </div>
  )
}
