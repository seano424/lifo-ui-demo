import { HydrationBoundary } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import { SettingsError } from '@/components/settings/settings-error-boundary'
import { TeamSwitcher } from '@/components/team-switcher'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import UserButton from '@/components/users/user-button'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashboardData = await prefetchDashboardData()

  // Handle authentication errors at the dashboard level
  if (dashboardData.error) {
    return (
      <SettingsError
        errorType="unauthorized"
        title="Dashboard Access Required"
        message="Please log in to access the dashboard."
        showRefreshButton={false}
        customAction={{
          label: 'Go to Login',
          href: '/login',
        }}
      />
    )
  }

  return (
    <HydrationBoundary state={dashboardData.dehydratedState}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-visible">
          <header className="flex sticky top-0 bg-background z-50 h-16 shrink-0 items-center gap-2 justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <div className="hidden md:block">
                <DashboardBreadcrumbs />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="icon" className="rounded-full border md:hidden">
                <BellIcon className="w-4 h-4" />
              </Button>
              <Button size="default" className="rounded-full border hidden md:flex">
                <BellIcon className="w-4 h-4" />
                Notifications
              </Button>
              <div className="hidden md:block">
                <TeamSwitcher />
              </div>
              <UserButton />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 overflow-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
