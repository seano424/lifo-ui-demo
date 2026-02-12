'use client'

import { Typography } from '@/components/ui/typography'
import { BatchRow } from './batch-row'
import type { BatchListProps } from './types'
import { useCurrency } from '@/hooks/use-currency'
import { useBatchActions } from '@/hooks/use-batches'
import { Package } from 'lucide-react'
import type { Database } from '@/types/supabase-extended'

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
    <div>
      {/* Section header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <Typography
            variant="small"
            className="font-medium text-muted-foreground uppercase tracking-wider"
          >
            Batches
          </Typography>
          <Typography variant="small" className="text-muted-foreground/60">
            {batches.length} tracked
          </Typography>
        </div>
        <Typography variant="small" className="text-muted-foreground/60">
          Sorted by expiry · soonest first
        </Typography>
      </div>

      {/* Batch rows */}
      <div className="divide-y divide-border/50">
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
