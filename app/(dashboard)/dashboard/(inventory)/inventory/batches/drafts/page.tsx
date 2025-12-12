'use client'

import { useState } from 'react'
import { DraftBatchesList } from '@/components/batches/draft-batches-list'
import { CompleteDraftBatchDialog } from '@/components/batches/complete-draft-batch-dialog'
import DraftBatchesHeader from '@/components/batches/draft-batches-header'
import type { Batch } from '@/lib/queries/batches'

export default function DraftBatchesPage() {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8 container md:py-6 lg:py-8">
      {/* Page header */}
      <DraftBatchesHeader />

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
