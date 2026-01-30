'use client'

import { useState } from 'react'
import { Calendar, Camera, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBatchActions } from '@/hooks/use-batches'
import { useStoreState } from '@/lib/stores/store-context'
import { useAutoOCRScanner } from '@/hooks/use-auto-ocr-scanner'
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
import type { ExpiryDateInfo } from '@/lib/stores/scanning-workflow-store'
import ScanningCamera from '@/components/scanning/shared/scanning-camera'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'

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
  const { activeStore } = useStoreState()

  // OCR Auto-scanner
  const autoOCRState = useAutoOCRScanner({
    isEnabled: showOCR && !!activeStore?.store_id,
    storeId: activeStore?.store_id || '',
    onExpiryDetected: (expiryInfo: ExpiryDateInfo) => {
      if (expiryInfo.extractedDate) {
        handleOCRDetected(expiryInfo.extractedDate)
      }
    },
    maxAttempts: 5,
    ocrConfidenceThreshold: 0.6,
  })

  const handleComplete = () => {
    if (!batch || !expiryDate) {
      toast.error('Please select an expiry date')
      return
    }

    // Validate date is in the future
    const selectedDate = parseISODateAsLocal(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      toast.error('Expiry date must be in the future')
      return
    }

    // Update batch with expiry date and change status to active
    try {
      // Calculate manufacture date (30 days before expiry as default)
      const manufactureDate = new Date(selectedDate)
      manufactureDate.setDate(manufactureDate.getDate() - 30)
      const manufactureDateStr = `${manufactureDate.getFullYear()}-${String(manufactureDate.getMonth() + 1).padStart(2, '0')}-${String(manufactureDate.getDate()).padStart(2, '0')}`

      updateBatch({
        batchId: batch.batch_id,
        updates: {
          expiry_date: expiryDate,
          status: 'active' as const,
          manufacture_date: manufactureDateStr,
        },
      })

      // Success feedback (mutation handles toast internally, but we add custom success handling)
      toast.success('Batch completed successfully!', {
        description: `Batch ${batch.batch_number} is now active and will be included in AI scoring`,
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
    // Stop OCR scanning first
    autoOCRState.stopAutoScan()

    // Close OCR view immediately to show the date input
    setShowOCR(false)

    // Update the expiry date after closing OCR view
    // Small delay ensures the input field is rendered before setting value
    setTimeout(() => {
      setExpiryDate(date)
      toast.success('Expiry date detected!', {
        description: `Date: ${date} - Review and click Complete`,
      })
    }, 50)
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('completeBatch')}</DialogTitle>
          <DialogDescription className="text-base">
            Add an expiry date to activate this batch and enable AI scoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Batch info */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-1 bg-white dark:bg-slate-950 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Batch Number
                </Label>
                <p className="font-bold mt-1 font-mono text-slate-900 dark:text-slate-100">
                  {batch.batch_number}
                </p>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-950 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Quantity
                </Label>
                <p className="font-bold mt-1 text-slate-900 dark:text-slate-100">
                  {batch.current_quantity} units
                </p>
              </div>
            </div>
          </div>

          {/* Expiry date input */}
          {!showOCR ? (
            <div className="space-y-3">
              <Label htmlFor="expiry-date" className="text-base font-semibold">
                Expiry Date *
                {expiryDate && (
                  <span className="ml-2 text-xs font-normal text-primary dark:text-primary-400">
                    ✓ Date set
                  </span>
                )}
              </Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-800 dark:text-primary-400" />
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-11 h-12 text-base  border-2 focus:border-primary-500 dark:focus:border-primary-400"
                    disabled={isPending}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOCR(true)}
                  disabled={isPending || !!expiryDate}
                  className="h-12 px-6 border-2 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {expiryDate ? 'Rescan' : 'Scan'}
                </Button>
              </div>
              {expiryDate && (
                <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                  <p className="text-sm  text-primary-800 dark:text-primary-200">
                    Captured date: <span className="font-bold">{expiryDate}</span>
                  </p>
                  <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                    You can modify this date using the calendar above
                  </p>
                </div>
              )}
              {!expiryDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Use the calendar or click Scan to use OCR
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Scan Expiry Date</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowOCR(false)
                    autoOCRState.stopAutoScan()
                  }}
                  className="hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950 transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
              <div className="rounded-xl border-2 border-primary-200 dark:border-primary-800 overflow-hidden shadow-lg">
                <ScanningCamera
                  mode="ocr"
                  title="Scan Expiry Date"
                  subtitle="Point camera at expiry date on product"
                  autoOCRState={autoOCRState}
                  autoStart={true}
                />
              </div>
              {autoOCRState.isAnalyzing && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Analyzing frame... Attempt {autoOCRState.attemptCount} / 5
                  </p>
                  {autoOCRState.lastReason && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                      {autoOCRState.lastReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1 sm:flex-none h-11 border-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!expiryDate || isPending}
            className="flex-1 sm:flex-none h-11 bg-linear-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isPending ? (
              <>
                <Check className="mr-2 h-5 w-5 animate-pulse" />
                Completing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Complete Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
