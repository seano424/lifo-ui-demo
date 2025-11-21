'use client'

import { useState } from 'react'
import { DraftBatchesList } from '@/components/batches/draft-batches-list'
import { CompleteDraftBatchDialog } from '@/components/batches/complete-draft-batch-dialog'
import { Typography } from '@/components/ui/typography'
import type { Batch } from '@/lib/queries/batches'

export default function DraftBatchesPage() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Typography variant="h2" className="mb-2">
          Draft Batches
        </Typography>
        <Typography variant="p" color="muted">
          Complete batches by adding expiry dates to enable AI scoring and inventory management
        </Typography>
      </div>

      {/* Draft batches list */}
      <DraftBatchesList onSelectBatch={handleSelectBatch} />

      {/* Completion dialog */}
      <CompleteDraftBatchDialog
        batch={selectedBatch}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setSelectedBatch(null)
        }}
      />
    </div>
  )
}
