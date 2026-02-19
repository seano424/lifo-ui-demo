'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface ActivatingStateProps {
  /** When true, shows success animation */
  showSuccess?: boolean
}

/**
 * Activating State Component
 *
 * Shows progress animation while batch tracking is being activated.
 * When showSuccess is true, displays a success animation before auto-navigating to dashboard.
 */
export function ActivatingState({ showSuccess = false }: ActivatingStateProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.activating')
  const [progress, setProgress] = useState(0)

  // Animate progress bar to 90% while loading
  useEffect(() => {
    if (showSuccess) return // Don't run if already showing success

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    return () => clearInterval(interval)
  }, [showSuccess])

  // Animate to 100% when success is shown
  useEffect(() => {
    if (showSuccess) {
      setProgress(100)
    }
  }, [showSuccess])

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-8 flex flex-col items-center gap-6 text-center">
        {/* Icon - spinner while loading, checkmark when success */}
        <div
          className={cn(
            'p-4 rounded-full transition-all duration-500',
            showSuccess
              ? 'bg-green-100 dark:bg-green-900/20 scale-110'
              : 'bg-blue-100 dark:bg-blue-900/20',
          )}
        >
          {showSuccess ? (
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          ) : (
            <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
          )}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-md">
          <Typography variant="h3">{showSuccess ? t('successTitle') : t('title')}</Typography>
          <Typography variant="p">
            {showSuccess ? t('successDescription') : t('description')}
          </Typography>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                showSuccess ? 'bg-green-600 dark:bg-green-400' : 'bg-blue-600 dark:bg-blue-400',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <Typography variant="small">{progress}%</Typography>
        </div>
      </Card>
    </div>
  )
}
