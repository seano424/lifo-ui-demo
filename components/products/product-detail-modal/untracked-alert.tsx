'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UntrackedAlertProps } from './types'
import { useBatchActions } from '@/hooks/use-batches'
import { useState, useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function UntrackedAlert({
  count,
  productId,
  autoExpand = false,
  costPrice,
  sellingPrice,
}: UntrackedAlertProps) {
  const [expanded, setExpanded] = useState(autoExpand)
  const [date, setDate] = useState('')
  const [qty, setQty] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { createBatch, isCreating } = useBatchActions()

  // Auto-focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [expanded])

  // Don't render if no untracked units
  // NOTE: In Phase 1, count is hardcoded to 0 until store_products.quantity migration lands
  if (count <= 0) {
    return null
  }

  const handleAdd = async () => {
    if (!date) {
      toast.error('Please select an expiry date')
      return
    }

    const quantity = parseInt(qty, 10) || count

    if (quantity <= 0 || quantity > count) {
      toast.error(`Quantity must be between 1 and ${count}`)
      return
    }

    // Generate a unique batch number
    const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    try {
      createBatch({
        product_id: productId,
        batch_number: batchNumber,
        expiry_date: date,
        initial_quantity: quantity,
        current_quantity: quantity,
        cost_price: costPrice ?? sellingPrice ?? undefined,
        selling_price: sellingPrice ?? costPrice ?? undefined,
        status: 'active',
        store_id: '', // Will be set by useBatchActions hook
      } as Parameters<typeof createBatch>[0])

      // Reset form on success
      setDate('')
      setQty('')
      toast.success(`Batch created with ${quantity} units`)
    } catch (error) {
      console.error('Failed to create batch:', error)
      toast.error('Failed to create batch')
    }
  }

  return (
    <div className="border border-dashed border-border rounded-xl bg-muted/30">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-primary-500 flex items-center justify-center p-1">
            <AlertCircle className="size-6 text-white" />
          </div>
          <div>
            <Typography variant="p" className="font-medium">
              {count} units have no expiry date
            </Typography>
            <Typography variant="p" className="text-muted-foreground">
              {expanded ? '▾ Collapse' : '▸ Add Dates'}
            </Typography>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-end gap-3">
            {/* Expiry date input */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Expiry date
              </label>
              <Input
                ref={inputRef}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Quantity input */}
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Quantity
              </label>
              <Input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder={String(count)}
                min="1"
                max={count}
                className="w-full"
              />
            </div>

            {/* Add button */}
            <Button onClick={handleAdd} disabled={!date || isCreating} size="default">
              {isCreating ? 'Adding...' : '+ Add batch'}
            </Button>
          </div>
          <Typography variant="p" className="text-muted-foreground mt-2">
            Quantity defaults to all {count} untracked units if left blank.
          </Typography>
        </div>
      )}
    </div>
  )
}
