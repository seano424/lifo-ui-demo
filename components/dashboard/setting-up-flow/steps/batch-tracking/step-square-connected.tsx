'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface StepSquareConnectedProps {
  isSyncing: boolean
  categoryCount: number
  productCount: number
  storeName: string
  onNext: () => void
}

/**
 * Step 0: Square Connected
 *
 * Confirms Square catalog sync and shows imported data stats.
 * Handles sync-in-progress with loading state.
 */
export function StepSquareConnected({
  isSyncing,
  categoryCount,
  productCount,
  storeName,
  onNext,
}: StepSquareConnectedProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.squareConnected')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="h3" className="mb-2">
          {t('title')}
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          {t('description')}
        </Typography>
      </div>

      {isSyncing ? (
        <Card className="p-8 flex flex-col items-center gap-6 text-center">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>

          <div className="flex flex-col gap-2">
            <Typography variant="h4">{t('syncing.title')}</Typography>
            <Typography variant="p" className="text-muted-foreground max-w-md">
              {t('syncing.description')}
            </Typography>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Typography variant="h4">{storeName}</Typography>
                <Typography variant="small" className="text-muted-foreground">
                  {t('connectionActive')}
                </Typography>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <Typography variant="large" className="font-semibold">
                  {productCount.toLocaleString()}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  {t('productsImported')}
                </Typography>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <Typography variant="large" className="font-semibold">
                  {categoryCount.toLocaleString()}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  {t('categoriesFound')}
                </Typography>
              </div>
            </div>

            <div className="pt-2">
              <Typography variant="small" className="text-muted-foreground">
                {t('nextSteps')}
              </Typography>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onNext} size="lg">
              {t('nextButton')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
