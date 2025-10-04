'use client'

import { AlertSensitivityControls } from '@/components/dashboard/alert-sensitivity-controls'
import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-150">
        <div className="space-y-6">
          <BatchStatusSummary />
        </div>
        <div className="space-y-6">
          <ExpiredItemsSummary />
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="relative animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/10 rounded-3xl -z-10" />
        <div className="relative border border-border/50 p-8 rounded-3xl bg-background/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
          <DashboardKPICards />
        </div>
      </div>

      {/* Insights and Actions Grid */}
      {/* Store Insights */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-transparent to-emerald-50/40 dark:from-green-950/15 dark:via-transparent dark:to-emerald-950/15 rounded-3xl -z-10" />
        <div className="relative bg-background/90 backdrop-blur-sm rounded-3xl border border-border/50 p-8 h-full transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
          <StoreInsightsDashboard />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-yellow-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-yellow-950/15 rounded-3xl -z-10" />
        <div className="relative bg-background/90 backdrop-blur-sm rounded-3xl border border-border/50 p-8 h-full transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
          <QuickActionCards />
        </div>
      </div>

      {/* Alert Controls */}
      <div className="relative animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-600">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50/30 via-transparent to-pink-50/30 dark:from-red-950/10 dark:via-transparent dark:to-pink-950/10 rounded-3xl -z-10" />
        <div className="relative bg-background/90 backdrop-blur-sm rounded-3xl border border-border/50 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/5">
          <AlertSensitivityControls />
        </div>
      </div>
    </div>
  )
}
