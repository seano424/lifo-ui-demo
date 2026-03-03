'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Zap, Type, Lightbulb } from 'lucide-react'
import type { ProcessedCategory, ProductOverride } from '../batch-tracking-step'

const DEFAULT_SHELF_LIFE = 14

interface StepHowToTrackProps {
  categories: ProcessedCategory[]
  categoryModes: Record<string, 'auto' | 'manual'>
  shelfLifeDays: Record<string, number | null>
  productOverrides: Record<string, ProductOverride>
  storeId: string | null
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
  onUpdateProductOverride: (productId: string, override: ProductOverride) => void
  onClearProductOverride: (productId: string) => void
  onResetToDefaults: () => void
  onActivate: () => void
  onBack: () => void
}

/**
 * Step 2: How to Track
 *
 * Configure shelf life and tracking mode for each category.
 * Rows are read-only; clicking a row opens a BottomSheet editor.
 */
export function StepHowToTrack({
  categories,
  categoryModes,
  shelfLifeDays,
  onUpdateMode,
  onUpdateShelfLife,
  onActivate,
  onBack,
}: StepHowToTrackProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.howToTrack')

  const handleSetAllAuto = () => {
    for (const cat of categories) {
      onUpdateMode(cat.id, 'auto')
    }
  }

  const handleSetAllManual = () => {
    for (const cat of categories) {
      onUpdateMode(cat.id, 'manual')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 text-center">
        <Typography variant="h2" className="font-extrabold font-fraunces max-w-lg mx-auto">
          How do you want to track expiry dates?
        </Typography>
        <Typography variant="h5" color="muted" className="max-w-3xl mx-auto">
          We&apos;ve suggested a shelf life for each category. Adjust any that don&apos;t match your
          store. You can fine-tune individual products later.
        </Typography>
      </div>

      {/* Categories table */}
      <Card className="overflow-hidden max-h-[400px] overflow-y-auto scrollbar-none py-4">
        {/* Column headers */}
        {/* <div className="grid grid-cols-[1fr_160px_80px] gap-4 px-4 py-3">
          <Typography variant="small" color="muted" className="font-mono tracking-tighter">
            Category
          </Typography>
          <Typography variant="small" color="muted" className="font-mono tracking-tighter">
            Method
          </Typography>
          <Typography
            variant="small"
            color="muted"
            className="text-right font-mono tracking-tighter"
          >
            Shelf Life
          </Typography>
        </div> */}

        <div className="divide-y divide-muted">
          {categories.map(category => (
            <CategoryConfigRow
              key={category.id}
              category={category}
              mode={categoryModes[category.id] || 'auto'}
              days={shelfLifeDays[category.id]}
              onUpdateMode={onUpdateMode}
              onUpdateShelfLife={onUpdateShelfLife}
            />
          ))}
        </div>
      </Card>

      {/* Bulk actions */}
      <div className="flex items-center gap-3 p-2 justify-center font-mono tracking-tighter">
        <Typography variant="small" color="muted" className="font-mono tracking-tighter">
          Set all to:
        </Typography>
        <button
          type="button"
          onClick={handleSetAllAuto}
          className="inline-flex items-center gap-1.5 text-sm text-secondary-700 hover:underline"
        >
          <Zap className="w-3 h-3" /> Auto-track
        </button>
        <span className="text-muted-foreground text-sm">·</span>
        <button
          type="button"
          onClick={handleSetAllManual}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
        >
          <Type className="w-3 h-3" /> Manual entry
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('backButton')}
        </Button>
        <Button onClick={onActivate}>Continue</Button>
      </div>
    </div>
  )
}

// =============================================================================
// MODE BADGE
// =============================================================================

function ModeBadge({ mode }: { mode: 'auto' | 'manual' }) {
  return (
    <span className="inline-flex justify-center items-center gap-1.5 p-2 text-sm font-medium rounded-lg border border-muted bg-secondary-50 text-secondary-700">
      {mode === 'auto' ? <Zap className="w-3 h-3" /> : <Type className="w-3 h-3" />}
      {mode === 'auto' ? 'Auto-track' : 'Manual entry'}
    </span>
  )
}

// =============================================================================
// CATEGORY CONFIG ROW
// =============================================================================

interface CategoryConfigRowProps {
  category: ProcessedCategory
  mode: 'auto' | 'manual'
  days: number | null
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
}

function CategoryConfigRow({
  category,
  mode,
  days,
  onUpdateMode,
  onUpdateShelfLife,
}: CategoryConfigRowProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="grid grid-cols-[1fr_160px_80px] items-center gap-4 px-4 py-2 w-full text-left hover:bg-muted transition-all duration-100 ease-in-out hover:cursor-pointer"
      >
        <Typography variant="small">{category.name}</Typography>
        <ModeBadge mode={mode} />
        <div className="text-right">
          {mode === 'auto' ? (
            <Typography variant="small">{days ?? DEFAULT_SHELF_LIFE} days</Typography>
          ) : (
            <Typography variant="small" color="muted">
              —
            </Typography>
          )}
        </div>
      </button>

      <CategoryEditSheet
        category={category}
        mode={mode}
        days={days}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdateMode={onUpdateMode}
        onUpdateShelfLife={onUpdateShelfLife}
      />
    </>
  )
}

// =============================================================================
// CATEGORY EDIT SHEET
// =============================================================================

interface CategoryEditSheetProps {
  category: ProcessedCategory
  mode: 'auto' | 'manual'
  days: number | null
  isOpen: boolean
  onClose: () => void
  onUpdateMode: (categoryId: string, mode: 'auto' | 'manual') => void
  onUpdateShelfLife: (categoryId: string, days: number | null) => void
}

function CategoryEditSheet({
  category,
  mode,
  days,
  isOpen,
  onClose,
  onUpdateMode,
  onUpdateShelfLife,
}: CategoryEditSheetProps) {
  const [draftMode, setDraftMode] = useState<'auto' | 'manual'>(mode)
  const [draftDays, setDraftDays] = useState(days ?? DEFAULT_SHELF_LIFE)
  const [daysInput, setDaysInput] = useState(String(days ?? DEFAULT_SHELF_LIFE))

  // Reset draft state whenever the sheet opens
  useEffect(() => {
    if (isOpen) {
      setDraftMode(mode)
      const resetDays = days ?? DEFAULT_SHELF_LIFE
      setDraftDays(resetDays)
      setDaysInput(String(resetDays))
    }
  }, [isOpen, mode, days])

  const handleSave = () => {
    onUpdateMode(category.id, draftMode)
    onUpdateShelfLife(category.id, draftMode === 'auto' ? draftDays : null)
    onClose()
  }

  // Example expiry date calculation
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + draftDays)
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(expiryDate)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <Typography variant="h3" className="font-bold">
          Edit: {category.name}
        </Typography>
      }
    >
      <div className="px-6 flex flex-col gap-6">
        <Typography variant="p" color="muted">
          Configure how expiry dates are handled for this category.
        </Typography>

        {/* Expiry Date Handling */}
        <div className="flex flex-col gap-3">
          <Typography variant="p" className="font-semibold">
            Expiry Date Handling
          </Typography>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {/* Auto-track */}
            <button
              type="button"
              onClick={() => setDraftMode('auto')}
              className={cn(
                'w-full flex items-start gap-3 p-4 text-left transition-all duration-100 ease-in-out',
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
                    'font-semibold transition-all duration-100 ease-in-out',
                    draftMode === 'auto' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  Auto-track
                </Typography>
                <Typography
                  variant="small"
                  color="muted"
                  className={cn(
                    'transition-all duration-100 ease-in-out',
                    draftMode === 'auto' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  Expiry dates calculated from delivery date + shelf life
                </Typography>
              </div>
            </button>

            {/* Manual entry */}
            <button
              type="button"
              onClick={() => setDraftMode('manual')}
              className={cn(
                'w-full flex items-start gap-3 p-4 text-left transition-all duration-100 ease-in-out',
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
                    'font-semibold transition-all duration-100 ease-in-out',
                    draftMode === 'manual' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  Manual entry
                </Typography>
                <Typography
                  variant="small"
                  color="muted"
                  className={cn(
                    'transition-all duration-100 ease-in-out',
                    draftMode === 'manual' ? 'text-white' : 'text-secondary-700',
                  )}
                >
                  When you log a delivery, we&apos;ll ask for the expiry date printed on the
                  packaging.
                </Typography>
              </div>
            </button>
          </div>
        </div>

        {/* Shelf Life (days) — only shown for auto mode */}
        {draftMode === 'auto' && (
          <div className={cn('flex flex-col gap-3 p-4 border border-border rounded-xl')}>
            <Typography
              variant="p"
              className={cn('font-semibold transition-all duration-100 ease-in-out')}
            >
              Shelf Life (days)
            </Typography>
            <input
              type="number"
              min="1"
              value={daysInput}
              onChange={e => setDaysInput(e.target.value)}
              onBlur={() => {
                const parsed = Math.max(1, Number.parseInt(daysInput, 10) || DEFAULT_SHELF_LIFE)
                setDraftDays(parsed)
                setDaysInput(String(parsed))
              }}
              className={cn(
                'w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
              )}
            />
            <div className="flex flex-col gap-1">
              <Typography
                variant="small"
                className={cn('font-medium transition-all duration-100 ease-in-out')}
              >
                Example:
              </Typography>
              <Typography
                variant="small"
                color="muted"
                className={cn('transition-all duration-100 ease-in-out')}
              >
                {category.name} delivered today → Expires {formattedDate} ({draftDays} days)
              </Typography>
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <Typography variant="small" color="muted">
            You can override shelf life for individual products later (e.g., artisan bread lasts 2
            days vs. regular bread 3 days)
          </Typography>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
