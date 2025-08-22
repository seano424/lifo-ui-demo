import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'

export default function Page() {
  return (
    <div className="flex flex-col gap-10 px-2 md:px-10 mb-40">
      <DashboardInsetHeader title="Dashboard Overview" />
      <UrgentAlerts />
      <div className="bg-muted/50 rounded-2xl border-0 p-5">
        <DashboardKPICards />
      </div>
      <StoreInsightsDashboard />
      <div className="bg-muted/50 rounded-2xl border-0 p-5">
        <QuickActionCards />
      </div>
    </div>
  )
}
