'use client'

import { Typography } from '@/components/ui/typography'
import { BatchRow } from './batch-row'
import type { BatchListProps } from './types'
import { useCurrency } from '@/hooks/use-currency'
import { useBatchActions } from '@/hooks/use-batches'
import { Package } from 'lucide-react'
import type { Database } from '@/types/supabase-extended'
import type { BatchWithProduct } from '@/lib/queries/batches'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'

type UrgencyTier = 'expired' | 'soon' | 'upcoming' | 'no-date'

export function getUrgencyTier(batch: BatchWithProduct): UrgencyTier {
  if (!batch.expiry_date) return 'no-date'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = parseISODateAsLocal(batch.expiry_date)
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'expired'
  if (days <= 3) return 'soon'
  return 'upcoming'
}

export function BatchList({
  batches,
  storeQuantity,
  editingBatchId,
  onStartEdit,
  onCancelEdit,
}: BatchListProps) {
  const currencySymbol = useCurrency()
  const { updateBatch, deleteBatch } = useBatchActions()

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

  const soonBatches = batches.filter(b => getUrgencyTier(b) === 'soon')
  const expiredBatches = batches.filter(b => getUrgencyTier(b) === 'expired')
  const upcomingBatches = batches.filter(b => {
    const tier = getUrgencyTier(b)
    return tier === 'upcoming' || tier === 'no-date'
  })

  const batchRowProps = (batch: BatchWithProduct) => {
    const maxQuantity =
      storeQuantity != null ? storeQuantity - totalBatchQty + (batch.current_quantity || 0) : null
    return {
      batch,
      isEditing: batch.batch_id === editingBatchId,
      maxQuantity,
      onStartEdit: () => onStartEdit(batch.batch_id),
      onSave: (updates: { expiry_date?: string; current_quantity?: number }) =>
        handleSave(batch.batch_id, updates),
      onCancel: onCancelEdit,
      onDelete: (batchId: string) => deleteBatch({ batchId, productId: batch.product_id }),
      currencySymbol,
    }
  }

  return (
    <div className="divide-y divide-border/20">
      {soonBatches.length > 0 && (
        <BatchGroup
          label="expiring soon (3 days or less)"
          batches={soonBatches}
          batchRowProps={batchRowProps}
        />
      )}

      {upcomingBatches.length > 0 && (
        <BatchGroup
          label="expiring later"
          batches={upcomingBatches}
          batchRowProps={batchRowProps}
        />
      )}

      {expiredBatches.length > 0 && (
        <BatchGroup label="expired" batches={expiredBatches} batchRowProps={batchRowProps} />
      )}
    </div>
  )
}

interface BatchGroupProps {
  label: string
  batches: BatchWithProduct[]
  batchRowProps: (batch: BatchWithProduct) => React.ComponentProps<typeof BatchRow>
}

function BatchGroup({ label, batches, batchRowProps }: BatchGroupProps) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <Typography variant="extraSmall" color="muted" className="uppercase italic tracking-wider">
        {label}
      </Typography>

      <div className="flex flex-col gap-4">
        {batches.map(batch => (
          <BatchRow key={batch.batch_id} {...batchRowProps(batch)} />
        ))}
      </div>
    </div>
  )
}

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
