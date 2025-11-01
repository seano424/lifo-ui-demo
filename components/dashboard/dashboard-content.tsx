'use client'

import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { useTranslations } from 'next-intl'

export function DashboardContent() {
  const t = useTranslations('dashboardNav')

  return (
    <div className="flex flex-col gap-10 pb-8 animate-in fade-in-0 duration-1000">
      {/* Enhanced Header */}
      <DashboardInsetHeader
        title={t('titles.dashboard')}
        description={t('descriptions.dashboard')}
      />

      {/* Status Overview Section */}

      <div className="space-y-6">
        <BatchStatusSummary />

        {/* Quick Actions */}
        <div className="border border-border p-4 md:p-6 lg:p-8 rounded-3xl bg-background">
          <QuickActionCards />
        </div>

        <ExpiredItemsSummary />
      </div>

      {/* KPI Cards Section */}
      <div className="relative animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
        <div className="border border-border/50 p-4 md:p-6 lg:p-8 rounded-3xl bg-background">
          <DashboardKPICards />
        </div>
      </div>

      {/* Store Insights */}
      {/* <div className="border border-border/50 p-8 rounded-3xl bg-background">
        <StoreInsightsDashboard />
      </div> */}
    </div>
  )
}
