'use client'

import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Lightbulb, RotateCcw } from 'lucide-react'
import type { ProductWithTrackingSettings } from '@/types/rpc-returns'
import type { ProductState } from './product-row'

const DEFAULT_SHELF_LIFE = 14

interface ProductEditSheetProps {
  product: ProductWithTrackingSettings
  currentOverride: ProductState | null
  isOpen: boolean
  onClose: () => void
  onSave: (state: ProductState | null) => void
}

export function ProductEditSheet({
  product,
  currentOverride,
  isOpen,
  onClose,
  onSave,
}: ProductEditSheetProps) {
  const inheritedMode = product.inherited_auto_create ? 'auto' : 'manual'
  const inheritedDays = product.inherited_shelf_life_days ?? DEFAULT_SHELF_LIFE

  const [draftMode, setDraftMode] = useState<'auto' | 'manual'>(
    currentOverride?.mode ?? inheritedMode,
  )
  const [draftDays, setDraftDays] = useState(currentOverride?.days ?? inheritedDays)

  // Reset draft when sheet opens
  useEffect(() => {
    if (isOpen) {
      setDraftMode(currentOverride?.mode ?? inheritedMode)
      setDraftDays(currentOverride?.days ?? inheritedDays)
    }
  }, [isOpen, currentOverride, inheritedMode, inheritedDays])

  const expiryDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + draftDays)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }, [draftDays])

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <Typography variant="h3" className="font-bold">
          Edit: {product.name}
        </Typography>
      }
    >
      <div className="px-6 flex flex-col gap-6">
        <Typography variant="p" color="muted">
          Override the category default for this individual product.
        </Typography>

        {/* Category default hint */}
        <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
          <Lightbulb className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <Typography variant="small" color="muted">
            Category default:{' '}
            <span className="font-medium">
              {inheritedMode === 'auto'
                ? `⚡ Auto-track (${inheritedDays} days)`
                : '✏️ Manual entry'}
            </span>
          </Typography>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col gap-3">
          <Typography variant="p" className="font-semibold">
            Expiry Date Handling
          </Typography>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {/* Auto-track option */}
            <button
              type="button"
              onClick={() => setDraftMode('auto')}
              className={cn(
                'w-full flex items-start gap-3 p-4 text-left transition-all duration-100',
                draftMode === 'auto'
                  ? 'bg-secondary-900 text-white'
                  : 'bg-background hover:bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  draftMode === 'auto' ? 'border-white' : 'border-muted-foreground/40',
                )}
              >
                {draftMode === 'auto' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <Typography
                  variant="p"
                  className={cn(
                    'font-semibold',
                    draftMode === 'auto' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  ⚡ Auto-track with shelf life
                </Typography>
                <Typography
                  variant="small"
                  className={cn(draftMode === 'auto' ? 'text-white/80' : 'text-muted-foreground')}
                >
                  Expiry dates calculated from delivery date + shelf life
                </Typography>
              </div>
            </button>

            {/* Manual entry option */}
            <button
              type="button"
              onClick={() => setDraftMode('manual')}
              className={cn(
                'w-full flex items-start gap-3 p-4 text-left transition-all duration-100',
                draftMode === 'manual'
                  ? 'bg-secondary-900 text-white'
                  : 'bg-background hover:bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  draftMode === 'manual' ? 'border-white' : 'border-muted-foreground/40',
                )}
              >
                {draftMode === 'manual' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <Typography
                  variant="p"
                  className={cn(
                    'font-semibold',
                    draftMode === 'manual' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  ✏️ Manual entry
                </Typography>
                <Typography
                  variant="small"
                  className={cn(draftMode === 'manual' ? 'text-white/80' : 'text-muted-foreground')}
                >
                  Staff enter expiry dates from product packaging
                </Typography>
              </div>
            </button>
          </div>
        </div>

        {/* Shelf life input — auto mode only */}
        {draftMode === 'auto' && (
          <div className="flex flex-col gap-3 p-4 border border-border rounded-xl">
            <Typography variant="p" className="font-semibold">
              Shelf Life (days)
            </Typography>
            <input
              type="number"
              min="1"
              value={draftDays}
              onChange={e =>
                setDraftDays(Number.parseInt(e.target.value, 10) || DEFAULT_SHELF_LIFE)
              }
              className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="font-medium">
                Example:
              </Typography>
              <Typography variant="small" color="muted">
                {product.name} delivered today → Expires {expiryDate} ({draftDays} days)
              </Typography>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {currentOverride && (
            <Button
              variant="outline"
              onClick={() => onSave(null)}
              className="mr-auto text-muted-foreground gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to category default
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              onSave({ mode: draftMode, days: draftMode === 'auto' ? draftDays : null })
            }
          >
            Save Changes
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
