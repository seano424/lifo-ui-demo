import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import DashboardTabs from '@/components/dashboard/dashboard-tabs'

export default function Page() {
  return (
    <div className="space-y-6">
      <DashboardInsetHeader
        title="Inventory Dashboard"
        description="Track product batches by expiration date and reduce food waste with data-driven decisions"
        rightContent={
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-muted-foreground">Last updated</span>
            <span className="text-sm font-bold">30-6-2025, 13:22:54</span>
          </div>
        }
      />
      <DashboardTabs />
    </div>
  )
}
