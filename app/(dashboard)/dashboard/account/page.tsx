import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  return (
    <div className="container md:py-6 lg:py-8">
      <DashboardInsetHeader
        title="Account settings"
        description="Manage your account"
        rightContent={
          <div className="flex gap-2">
            <Button variant="outline">Export User Data</Button>
          </div>
        }
      />
    </div>
  )
}
