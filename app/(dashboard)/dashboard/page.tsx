import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'

export default function Page() {
  // Backend is now working with sales_summary view
  const USE_MOCK_DATA = false
  
  return (
    <div className="space-y-6">
      <DashboardInsetHeader title="Dashboard Overview" />
      <DashboardKPICards useMockData={USE_MOCK_DATA} />
    </div>
  )
}
