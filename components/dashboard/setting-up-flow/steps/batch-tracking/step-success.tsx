'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Zap, Edit3, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface StepSuccessProps {
  autoCategories: number
  manualCategories: number
  productOverrides: number
}

/**
 * Success Step Component
 *
 * Shows completion confirmation and what happens next.
 * Provides CTA to go to dashboard.
 */
export function StepSuccess({
  autoCategories,
  manualCategories,
  productOverrides,
}: StepSuccessProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.success')
  const router = useRouter()
  const [showChecks, setShowChecks] = useState(false)

  // Stagger check animations
  useEffect(() => {
    const timer = setTimeout(() => setShowChecks(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleGoToDashboard = () => {
    // Refresh to trigger setup completion check
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-8 flex flex-col items-center gap-6 text-center">
        {/* Success Icon */}
        <div
          className={cn(
            'p-4 bg-green-100 dark:bg-green-900/20 rounded-full transition-all duration-500',
            showChecks ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <Typography variant="h2">{t('title')}</Typography>
          <Typography variant="p" className="text-muted-foreground max-w-md">
            {t('description')}
          </Typography>
        </div>

        {/* Summary Stats */}
        <Card className="p-6 w-full max-w-md bg-muted/50">
          <Typography variant="h4" className="mb-4">
            {t('summary.title')}
          </Typography>
          <div className="flex flex-col gap-3 text-left">
            <div
              className={cn(
                'flex items-center gap-3 transition-all duration-500 delay-100',
                showChecks ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
              )}
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <Typography variant="small" className="font-semibold">
                  {autoCategories} {t('summary.autoCategories')}
                </Typography>
                <Typography variant="small">{t('summary.autoDescription')}</Typography>
              </div>
            </div>

            <div
              className={cn(
                'flex items-center gap-3 transition-all duration-500 delay-200',
                showChecks ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
              )}
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Edit3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <Typography variant="small" className="font-semibold">
                  {manualCategories} {t('summary.manualCategories')}
                </Typography>
                <Typography variant="small">{t('summary.manualDescription')}</Typography>
              </div>
            </div>

            {productOverrides > 0 && (
              <div
                className={cn(
                  'flex items-center gap-3 transition-all duration-500 delay-300',
                  showChecks ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
                )}
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <Typography variant="small" className="font-semibold">
                    {productOverrides} {t('summary.productOverrides')}
                  </Typography>
                  <Typography variant="small">{t('summary.overridesDescription')}</Typography>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* What's Next */}
        <div className="w-full max-w-md text-left">
          <Typography variant="h4" className="mb-3">
            {t('nextSteps.title')}
          </Typography>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>{t('nextSteps.step1')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>{t('nextSteps.step2')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>{t('nextSteps.step3')}</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <Button onClick={handleGoToDashboard} size="lg" className="mt-4">
          {t('goToDashboard')}
        </Button>
      </Card>
    </div>
  )
}
