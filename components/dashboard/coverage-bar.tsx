'use client'

import { useTranslations } from 'next-intl'
import { useDashboardRedesignSummary } from '@/hooks/use-dashboard-redesign'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '../ui/typography'

export function CoverageBar() {
  const t = useTranslations('dashboard.redesign.coverage')
  const { data, isLoading } = useDashboardRedesignSummary(7)

  if (isLoading || !data) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton className="mb-1 h-5 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="mb-3 h-2.5 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </Card>
    )
  }

  const covered = data.products_tracked
  const total = data.products_total
  const remaining = total - covered
  const percent = total > 0 ? Math.round((covered / total) * 100) : 0

  return (
    <Card className="p-6">
      {/* Header Row */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Typography variant="h4">{t('title')}</Typography>
          <Typography variant="p" color="muted">
            {t('subtitle')}
          </Typography>
        </div>
        <Typography variant="h2">{percent}%</Typography>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-200 transition-all duration-700"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('progressLabel', { percent })}
        />
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between">
        <Typography variant="p" color="muted">
          {t('tracked', { count: covered })}
        </Typography>
        <Typography variant="p" color="muted">
          {t('remaining', { count: remaining })}
        </Typography>
      </div>
    </Card>
  )
}
