'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * Activating State Component
 *
 * Shows progress animation while batch tracking is being activated.
 * Displays a progress bar and loading message.
 */
export function ActivatingState() {
  const t = useTranslations('setupFlow.batchTracking.steps.activating')
  const [progress, setProgress] = useState(0)

  // Animate progress bar
  useEffect(() => {
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
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-8 flex flex-col items-center gap-6 text-center">
        <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
          <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>

        <div className="flex flex-col gap-3 w-full max-w-md">
          <Typography variant="h3">{t('title')}</Typography>
          <Typography variant="p" className="text-muted-foreground">
            {t('description')}
          </Typography>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className={cn(
                'h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <Typography variant="small" className="text-muted-foreground">
            {progress}%
          </Typography>
        </div>
      </Card>
    </div>
  )
}
