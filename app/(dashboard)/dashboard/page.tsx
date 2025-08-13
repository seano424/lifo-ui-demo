'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'

export default function Page() {
  return (
    <div className="space-y-6 my-8">
      <DashboardInsetHeader title="Dashboard Overview" />

      {/* Urgent Alerts - Shows critical expiry warnings */}
      <UrgentAlerts />

      {/* KPI Cards will go here once merged from features/dashboard-kpi-cards-v2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for KPI cards */}
      </div>
      {/* Quick Action Cards - Provides shortcuts to common tasks */}
      <QuickActionCards />

      <DashboardKPICards />
    </div>
  )
}
