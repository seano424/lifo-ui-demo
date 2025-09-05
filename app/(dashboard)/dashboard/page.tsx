'use client'

import { useTranslations } from 'next-intl'
import { AlertSensitivityControls } from '@/components/dashboard/alert-sensitivity-controls'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'
import { useBatches } from '@/hooks/use-batches'

export default function Page() {
  const t = useTranslations('dashboardNav.pages')
  const { data: batches } = useBatches()
  const hasBatches = batches && batches.length > 0

  return (
    <div className="flex flex-col gap-6">
      <DashboardInsetHeader title={t('dashboard')} />
      {hasBatches && <UrgentAlerts />}
      {hasBatches && (
        <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
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
      {hasBatches && (
        <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
          <AlertSensitivityControls />
        </div>
      )}
    </div>
  )
}
