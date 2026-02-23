'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Zap, Type, Loader2, ArrowRight } from 'lucide-react'
import type { ProcessedCategory } from '../batch-tracking-step'
import { useTranslations } from 'next-intl'

interface StepIntroProps {
  categories: ProcessedCategory[]
  isSkipping?: boolean
  onSetup: () => void
  onSkip: () => void
  onBack?: () => void
}

/**
 * Intro Screen for Batch Tracking Setup
 *
 * Frames the value prop before showing the category configuration table.
 * Gives users the option to set up automation or skip to manual defaults.
 */
export function StepIntro({
  categories,
  isSkipping = false,
  onSetup,
  onSkip,
  onBack,
}: StepIntroProps) {
  // Show up to 2 auto-matched categories as examples
  const autoExamples = categories.filter(c => c.mode === 'auto' && c.days).slice(0, 2)
  const manualExamples = categories.filter(c => c.mode === 'manual').slice(0, 1)

  const t = useTranslations('setupFlow')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 p-4 text-center">
        <Typography variant="h2" className="font-extrabold">
          Let&apos;s get started
        </Typography>

        <Typography variant="p" color="muted" className="max-w-lg mx-auto">
          In the next few steps, you&apos;ll pick which products to track and how expiry dates get
          added.
        </Typography>

        <button
          type="button"
          onClick={onSkip}
          className="w-full sm:w-auto transition-colors flex items-center gap-2 justify-center text-secondary-900 hover:text-primary-700"
          disabled={isSkipping}
        >
          {isSkipping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Skip and configure later <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Auto vs Manual explanation */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4 flex flex-col gap-3 border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <Typography variant="p" className="font-semibold">
              Auto-track
            </Typography>
          </div>
          <Typography variant="small">
            We calculate expiry dates from the delivery date + shelf life you set. Nothing to enter
            on delivery.
          </Typography>
          {autoExamples.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              {autoExamples.map(cat => (
                <Typography
                  key={cat.id}
                  variant="extraSmall"
                  className="text-muted-foreground font-mono"
                >
                  {cat.name} → {cat.days}d from delivery ✓
                </Typography>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 flex flex-col gap-3 border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Type className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <Typography variant="p" className="font-semibold">
              Manual entry
            </Typography>
          </div>
          <Typography variant="small">
            You&apos;ll enter the expiry date when each delivery arrives.
          </Typography>
          {manualExamples.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              {manualExamples.map(cat => (
                <Typography
                  key={cat.id}
                  variant="extraSmall"
                  className="text-muted-foreground font-mono"
                >
                  {cat.name} → date entered on delivery
                </Typography>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isSkipping}>
            Back
          </Button>
        )}

        <Button onClick={onSetup} className="w-fit" disabled={isSkipping}>
          {t('steps.addStore.importSummary.continueButton')}
        </Button>
      </div>
    </div>
  )
}
