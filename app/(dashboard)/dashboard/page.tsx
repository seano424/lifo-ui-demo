import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { UrgentAlerts } from '@/components/dashboard/urgent-alerts'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
import { StoreInsightsDashboard } from '@/components/dashboard/store-insights-dashboard'

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardInsetHeader title="Dashboard Overview" />
      <UrgentAlerts />
      <DashboardKPICards />
      <StoreInsightsDashboard />
    </div>
  )
}
