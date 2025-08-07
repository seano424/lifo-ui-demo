import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'

export default function Page() {
  return (
    <div className="space-y-6">
      <DashboardInsetHeader title="Dashboard Overview" />
      <DashboardKPICards />
    </div>
  )
}
