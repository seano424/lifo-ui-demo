'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

/**
 * Touch-friendly quantity selector with large +/- buttons
 * Optimized for mobile with 44px minimum tap targets
 *
 * @example
 * ```tsx
 * <QuantitySelector
 *   value={quantity}
 *   onChange={setQuantity}
 *   min={1}
 *   max={100}
 * />
 * ```
 */
export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  const isAtMin = value <= min
  const isAtMax = value >= max

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Decrement Button - Large touch target */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || isAtMin}
        className={cn(
          // 44px minimum tap target for mobile
          'h-11 w-11 shrink-0 rounded-2xl',
          'border-none bg-primary-50 text-primary-800',
          'active:scale-95 transition-transform',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="h-5 w-5 text-primary-800" />
      </Button>

      {/* Current Value Display */}
      <div
        className={cn(
          'flex-1 min-w-[80px] text-center',
          'px-4 py-2.5 rounded-2xl',
          'bg-gray-50 dark:bg-background',
        )}
      >
        <span
          className={cn(
            'text-2xl  tabular-nums',
            'text-foreground dark:text-foreground',
            disabled && 'opacity-50',
          )}
        >
          {value}
        </span>
      </div>

      {/* Increment Button - Large touch target */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || isAtMax}
        className={cn(
          // 44px minimum tap target for mobile
          'h-11 w-11 shrink-0 rounded-2xl',
          'border-none bg-primary-50 text-primary-800',
          'active:scale-95 transition-transform',
          'disabled:bg-opacity-50 disabled:cursor-not-allowed',
        )}
        aria-label="Increase quantity"
      >
        <Plus className="h-5 w-5 text-primary-800" />
      </Button>
    </div>
  )
}
