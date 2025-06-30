import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function Page() {
  return (
    <div>
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
    </div>
  )
}
