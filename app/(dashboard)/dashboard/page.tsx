import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'
import { Typography } from '@/components/ui/typography'

export default function Page() {
  return (
    <div className="flex flex-col gap-8 px-2 md:px-10 mb-40">
      <DashboardInsetHeader title="Dashboard Overview" />
      <UrgentAlerts />
      <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-secondary-900 dark:border-secondary-900">
        <DashboardKPICards />
      </div>
      <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-secondary-900 dark:border-secondary-900">
        <StoreInsightsDashboard />
      </div>
      <div className="bg-muted/50 rounded-2xl border-0 p-5 dark:bg-secondary-900 dark:border-secondary-900">
        <QuickActionCards />
      </div>
    </div>
  )
}
