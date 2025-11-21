'use client'

import { useState } from 'react'
import { Calendar, Camera, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBatchActions } from '@/hooks/use-batches'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Batch } from '@/lib/queries/batches'

interface CompleteDraftBatchDialogProps {
  batch: Batch | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CompleteDraftBatchDialog({
  batch,
  open,
  onOpenChange,
  onSuccess,
}: CompleteDraftBatchDialogProps) {
  const t = useTranslations('inventory.batches.draftBatches')
  const [expiryDate, setExpiryDate] = useState('')
  const [showOCR, setShowOCR] = useState(false)
  const { updateBatch, isUpdating } = useBatchActions()
  const isPending = isUpdating

  const handleComplete = () => {
    if (!batch || !expiryDate) {
      toast.error('Please select an expiry date')
      return
    }

    // Validate date is in the future
    const selectedDate = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      toast.error('Expiry date must be in the future')
      return
    }

    // Update batch with expiry date and change status to active
    try {
      updateBatch({
        batchId: batch.batch_id,
        updates: {
          expiry_date: expiryDate,
          status: 'active' as const,
          // Calculate manufacture date (30 days before expiry as default)
          manufacture_date: new Date(selectedDate.getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
      })

      // Success feedback (mutation handles toast internally, but we add custom success handling)
      toast.success('Batch completed successfully!', {
        description: `${batch.products?.name} is now active and will be included in AI scoring`,
      })
      setExpiryDate('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to complete batch', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleOCRDetected = (date: string) => {
    setExpiryDate(date)
    setShowOCR(false)
    toast.success('Expiry date detected!', {
      description: 'Review the date and click Complete',
    })
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('completeBatch')}</DialogTitle>
          <DialogDescription>
            Add an expiry date to activate this batch and enable AI scoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Batch info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <Label className="text-muted-foreground">Product</Label>
              <p className="font-medium">{batch.products?.name || 'Unknown Product'}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-muted-foreground">Batch Number</Label>
                <p className="font-medium">{batch.batch_number}</p>
              </div>
              <div className="flex-1">
                <Label className="text-muted-foreground">Quantity</Label>
                <p className="font-medium">{batch.current_quantity} units</p>
              </div>
            </div>
          </div>

          {/* Expiry date input */}
          {!showOCR ? (
            <div className="space-y-2">
              <Label htmlFor="expiry-date">Expiry Date *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOCR(true)}
                  disabled={isPending}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the calendar or click Scan to use OCR
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scan Expiry Date</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOCR(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  OCR scanning component will be integrated here
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Placeholder: simulate OCR detection
                    const futureDate = new Date()
                    futureDate.setDate(futureDate.getDate() + 30)
                    handleOCRDetected(futureDate.toISOString().split('T')[0])
                  }}
                >
                  Simulate OCR (for testing)
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!expiryDate || isPending}
          >
            {isPending ? (
              <>
                <Check className="mr-2 h-4 w-4 animate-pulse" />
                Completing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
