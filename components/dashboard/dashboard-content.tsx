'use client'

import { AlertSensitivityControls } from '@/components/dashboard/alert-sensitivity-controls'
import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'

interface DashboardContentProps {
  title: string
}

export function DashboardContent({ title }: DashboardContentProps) {
  return (
    <div className="flex flex-col gap-8">
      <DashboardInsetHeader title={title} />

      <BatchStatusSummary />
      <ExpiredItemsSummary />

      <div className="border p-5 rounded-2xl">
        <DashboardKPICards />
      </div>

      <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
        <StoreInsightsDashboard />
      </div>

      <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-brand-dark">
        <QuickActionCards />
      </div>

      <AlertSensitivityControls />
    </div>
  )
}
