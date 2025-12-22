'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  className?: string
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
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

  const handleSelectAll = () => {
    onChange(max)
  }

  const isAllSelected = value === max

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={value <= min}
        className="h-10 w-10 rounded-full border-[rgba(0,0,0,0.06)]"
      >
        <Minus className="h-4 w-4 text-[#1d1d1f]" />
      </Button>

      <div className="flex items-center gap-2 min-w-[120px] justify-center">
        <span className="text-2xl font-semibold text-[#1d1d1f]">{value}</span>
        <span className="text-sm text-[#86868b]">/ {max}</span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={value >= max}
        className="h-10 w-10 rounded-full border-[rgba(0,0,0,0.06)]"
      >
        <Plus className="h-4 w-4 text-[#1d1d1f]" />
      </Button>

      {!isAllSelected && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleSelectAll}
          className="text-sm text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)]"
        >
          All
        </Button>
      )}
    </div>
  )
}
