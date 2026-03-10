'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Zap, Type, PartyPopper, Loader2 } from 'lucide-react'
import type { ProcessedCategory } from '../batch-tracking-step'

interface StepReviewProps {
  enabledCategories: ProcessedCategory[]
  categoryModes: Record<string, 'auto' | 'manual'>
  shelfLifeDays: Record<string, number | null>
  isSaving?: boolean
  onBack: () => void
  onConfirm: (createInitialBatches: boolean) => void
}

/**
 * Review & Summary screen for Batch Tracking Setup
 *
 * Shows the user a summary of their automation configuration before
 * committing. "Complete Setup" is the action that fires the save mutation.
 * "Change" goes back to the configure step.
 */
export function StepReview({
  enabledCategories,
  categoryModes,
  shelfLifeDays,
  isSaving = false,
  onBack,
  onConfirm,
}: StepReviewProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.review')
  const [createInitialBatches, setCreateInitialBatches] = useState(true)
  const autoCategories = enabledCategories.filter(c => categoryModes[c.id] === 'auto')
  const manualCategories = enabledCategories.filter(c => categoryModes[c.id] === 'manual')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 p-4 text-center">
        <Typography
          variant="h2"
          className="font-extrabold font-fraunces max-w-md lg:max-w-xl mx-auto"
        >
          Review &amp; Complete Setup
        </Typography>

        <Typography variant="h5" color="muted" className="max-w-3xl mx-auto">
          Review your expiry date settings before turning on. You can change these any time in
          Settings.
        </Typography>
      </div>

      <Card className="flex flex-col gap-4 p-0 overflow-hidden max-h-[400px] overflow-y-auto scrollbar-none">
        {/* Auto-tracking section */}
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <Typography variant="p" className="font-semibold">
                Auto-track ({autoCategories.length})
              </Typography>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Change
            </button>
          </div>

          {autoCategories.length === 0 ? (
            <Typography variant="small">No categories set to auto-track.</Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {autoCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between">
                  <Typography variant="small">{cat.name}</Typography>
                  <Typography variant="small" className="text-muted-foreground tabular-nums">
                    {shelfLifeDays[cat.id] ? `${shelfLifeDays[cat.id]}d from delivery` : '—'}
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual entry section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <Typography variant="p" className="font-semibold">
                Manual entry ({manualCategories.length})
              </Typography>
            </div>
            {autoCategories.length > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Change
              </button>
            )}
          </div>

          {manualCategories.length === 0 ? (
            <Typography variant="small">No categories set to manual entry.</Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {manualCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between">
                  <Typography variant="small">{cat.name}</Typography>
                  <Typography variant="small">Enter date on delivery</Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Initial batch toggle */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <Typography variant="p" className="font-semibold">
            {t('initialBatches.label')}
          </Typography>
          <Typography variant="small" color="muted">
            {t('initialBatches.description')}
          </Typography>
        </div>
        <Switch
          checked={createInitialBatches}
          onCheckedChange={setCreateInitialBatches}
          disabled={isSaving}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          {t('back')}
        </Button>
        <Button onClick={() => onConfirm(createInitialBatches)} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <PartyPopper className="w-4 h-4 mr-2" />
          )}
          {t('confirm')}
        </Button>
      </div>
    </div>
  )
}
