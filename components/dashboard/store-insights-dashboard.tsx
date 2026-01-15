'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { AlertTriangle, ArrowRightFromLine, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

interface StoreInsightsDashboardProps {
  storeId?: string
}

export function StoreInsightsDashboard({ storeId: propStoreId }: StoreInsightsDashboardProps) {
  const t = useTranslations('storeInsights')

  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [_showDetailedView, _setShowDetailedView] = useState(false)
  const [isRescoring, setIsRescoring] = useState(false)
  const [scoringLogs, setScoringLogs] = useState<string[]>([])

  const triggerScoring = async () => {
    if (!storeId) return

    setIsRescoring(true)
    setScoringLogs(['🎯 Starting manual scoring trigger...'])

    try {
      setScoringLogs(prev => [...prev, '📡 Calling scoring API...'])

      const response = await fetch('/api/scoring/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          triggeredBy: 'manual-debug',
          debug: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Scoring failed: ${response.status}`)
      }

      const result = await response.json()
      setScoringLogs(prev => [
        ...prev,
        `✅ Scoring completed successfully!`,
        `📊 Processed: ${result.result?.batches_processed || 0} batches`,
        `⚡ High priority: ${result.result?.high_priority_count || 0} items`,
        `⏱️ Processing time: ${result.result?.processing_time_seconds || 0}s`,
        `🔄 Please refresh the page to see updated results`,
      ])

      // Auto-refresh insights after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      setScoringLogs(prev => [
        ...prev,
        `❌ Scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ])
    } finally {
      setIsRescoring(false)
    }
  }

  if (!storeId) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4 text-center sm:text-left">
        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="font-bold">
            {t('title')}
          </Typography>
          <Typography variant="p" className="text-muted-foreground dark:text-secondary-50">
            {t('description')}
          </Typography>
        </div>

        <div className="flex gap-2">
          <Button onClick={triggerScoring} disabled={isRescoring} variant="outline" size="sm">
            {isRescoring ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isRescoring ? 'Scoring...' : 'Re-Score'}
          </Button>

          <Button className="flex dark:hidden" asChild>
            <Link href="/dashboard/actionable-batches">
              {t('takeAction')} <ArrowRightFromLine className="w-4 h-4" />
            </Link>
          </Button>
          <Button className="hidden dark:flex" variant="black" asChild>
            <Link href="/dashboard/actionable-batches">
              {t('takeAction')} <ArrowRightFromLine className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 text-center sm:text-left">
          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">{t('metrics.urgentItems')}</Typography>
            <Typography variant="p">{t('metrics.urgentItemsDesc')}</Typography>
            <Typography variant="p">{t('comingSoon')}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">{t('metrics.actionsTaken')}</Typography>
            <Typography variant="p">{t('metrics.actionsTakenDesc')}</Typography>
            <Typography variant="p">{t('comingSoon')}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">{t('metrics.discountValue')}</Typography>
            <Typography variant="p">{t('metrics.discountValueDesc')}</Typography>
            <Typography variant="p">{t('comingSoon')}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">{t('metrics.avgScore')}</Typography>
            <Typography variant="p">{t('metrics.avgScoreDesc')}</Typography>
            <Typography variant="p">{t('comingSoon')}</Typography>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex text-center sm:text-left justify-center sm:justify-start items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('overview.title')}
            </CardTitle>
            <CardDescription className="text-center sm:text-left">
              {t('overview.description', {
                actionsTaken: t('comingSoon'),
                urgentBatches: t('comingSoon'),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center sm:text-left">
              {false && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('overview.scoringAlert')}</strong>{' '}
                    {t('overview.urgentBatchesAlert', {
                      urgentBatches: t('comingSoon'),
                    })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Analytics Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{t('overview.recentActivity')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="">{t('overview.actionsTaken')}</p>
                    <p className="text-blue-600">
                      {t('overview.actionsTakenPeriod', {
                        totalActions: t('comingSoon'),
                      })}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-50 rounded">
                    <p className="">{t('overview.discountsApplied')}</p>
                    <p className="text-primary-600">
                      {t('overview.saved', {
                        discountValue: t('comingSoon'),
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {t('overview.averageScore', {
                    avgScore: t('comingSoon'),
                    discountValue: t('comingSoon'),
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Debug Logs */}
        {scoringLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>🔍 Scoring Debug Logs</CardTitle>
              <CardDescription>Real-time logs from the latest scoring operation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-sm bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                {scoringLogs.map((log, index) => (
                  <div key={`log-${index}-${log.slice(0, 10)}`} className="text-foreground">
                    {log}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setScoringLogs([])}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Clear Logs
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
