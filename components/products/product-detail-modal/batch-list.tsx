'use client'

import { Typography } from '@/components/ui/typography'
import { BatchRow } from './batch-row'
import type { BatchListProps } from './types'
import { useCurrency } from '@/hooks/use-currency'
import { useBatchActions } from '@/hooks/use-batches'
import { ChevronDown, Package } from 'lucide-react'
import type { Database } from '@/types/supabase-extended'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function BatchList({
  batches,
  storeQuantity,
  editingBatchId,
  onStartEdit,
  onCancelEdit,
}: BatchListProps) {
  const currencySymbol = useCurrency()
  const { updateBatch } = useBatchActions()
  const [isOpen, setIsOpen] = useState(true)

  const totalBatchQty = batches
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + (b.current_quantity || 0), 0)
  const handleSave = (
    batchId: string,
    updates: { expiry_date?: string; current_quantity?: number },
  ) => {
    updateBatch({
      batchId,
      updates: updates as Database['inventory']['Tables']['batches']['Update'],
    })
    onCancelEdit()
  }

  if (batches.length === 0) {
    return <EmptyBatchesState />
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-0"
      >
        <Typography variant="h5" className="flex items-center gap-2 font-semibold">
          Stock with expiry dates ({totalBatchQty} of {storeQuantity ?? '?'})
        </Typography>
        <ChevronDown className={cn('size-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="flex flex-col gap-4">
          {batches.map(batch => {
            // store_quantity is POS-synced and can change externally, so this is a UX
            // guardrail only — not a DB-level constraint. See untracked_qty in the RPC.
            const maxQuantity =
              storeQuantity != null
                ? storeQuantity - totalBatchQty + (batch.current_quantity || 0)
                : null
            return (
              <BatchRow
                key={batch.batch_id}
                batch={batch}
                isEditing={batch.batch_id === editingBatchId}
                maxQuantity={maxQuantity}
                onStartEdit={() => onStartEdit(batch.batch_id)}
                onSave={updates => handleSave(batch.batch_id, updates)}
                onCancel={onCancelEdit}
                currencySymbol={currencySymbol}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// Empty state when no batches exist
function EmptyBatchesState() {
  return (
    <div className="px-5 py-10 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
      <Typography variant="p" className="font-medium mb-1">
        No batches tracked yet
      </Typography>
      <Typography variant="p" className="text-muted-foreground mb-4">
        Add an expiry date to start tracking this product's inventory by batch.
      </Typography>
    </div>
  )
}
