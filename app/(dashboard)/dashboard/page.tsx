import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { QuickActionCards } from '@/components/dashboard/quick-action-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'

export default function Page() {
  return (
    <div className="space-y-6 my-8">
      <DashboardInsetHeader title="Dashboard Overview" />
      <UrgentAlerts />
      <QuickActionCards />
      <DashboardKPICards />
      <StoreInsightsDashboard />
    </div>
  )
}
