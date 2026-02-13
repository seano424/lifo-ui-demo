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
  highlightedBatchId,
  editingBatchId,
  onStartEdit,
  onCancelEdit,
  isLoading,
}: BatchListProps) {
  const currencySymbol = useCurrency()
  const { updateBatch } = useBatchActions()
  const [isOpen, setIsOpen] = useState(true)
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

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        <BatchSkeleton />
        <BatchSkeleton />
        <BatchSkeleton />
      </div>
    )
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
        <Typography variant="small" className="flex items-center gap-2">
          Batches
        </Typography>
        <ChevronDown className={cn('size-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="flex flex-col gap-4">
          {batches.map(batch => (
            <BatchRow
              key={batch.batch_id}
              batch={batch}
              isHighlighted={batch.batch_id === highlightedBatchId}
              isEditing={batch.batch_id === editingBatchId}
              onStartEdit={() => onStartEdit(batch.batch_id)}
              onSave={updates => handleSave(batch.batch_id, updates)}
              onCancel={onCancelEdit}
              currencySymbol={currencySymbol}
            />
          ))}
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
      <Typography variant="small" className="text-muted-foreground mb-4">
        Add an expiry date to start tracking this product's inventory by batch.
      </Typography>
    </div>
  )
}

// Loading skeleton
function BatchSkeleton() {
  return (
    <div className="px-5 py-3 flex items-center gap-3 animate-pulse">
      <div className="w-8 h-6 bg-muted rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="h-3 bg-muted rounded w-48" />
      </div>
      <div className="h-4 bg-muted rounded w-16" />
      <div className="h-4 bg-muted rounded w-12" />
    </div>
  )
}
