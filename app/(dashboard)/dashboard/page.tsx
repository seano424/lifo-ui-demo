'use client'

import { AlertSensitivityControls } from '@/components/dashboard/alert-sensitivity-controls'
import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'

import { useBatches } from '@/hooks/use-batches'
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('dashboardNav.pages')
  const { data: batches } = useBatches()
  const hasBatches = batches && batches.length > 0

  return (
    <div className="flex flex-col gap-8">
      <DashboardInsetHeader title={t('dashboard')} />

      {hasBatches && <BatchStatusSummary />}
      {hasBatches && <ExpiredItemsSummary />}

      {hasBatches && (
        <div className="border p-5 rounded-2xl">
          <DashboardKPICards />
        </div>
      )}
      {hasBatches && (
        <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
          <StoreInsightsDashboard />
        </div>
      )}
      {hasBatches && (
        <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
          <QuickActionCards />
        </div>
      )}
      {hasBatches && <AlertSensitivityControls />}
    </div>
  )
}
