import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'
import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import { TeamSwitcher } from '@/components/team-switcher'
import { CompactLanguageSwitcher } from '@/components/ui/compact-language-switcher'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import UserButton from '@/components/users/user-button'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'
import { HydrationBoundary } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashboardData = await prefetchDashboardData()

  return (
    <HydrationBoundary state={dashboardData.dehydratedState}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-scroll">
          <header className="flex sticky top-0 bg-background z-50 h-16 shrink-0 items-center gap-2 justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <div className="hidden lg:block">
                <DashboardBreadcrumbs />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CompactLanguageSwitcher />
              <Button size="icon" className="border rounded-full">
                <BellIcon className="w-4 h-4" />
              </Button>

              <div className="hidden md:block">
                <TeamSwitcher />
              </div>
              <UserButton />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 px-4 py-8 overflow-auto items-center">
            <div className="w-full max-w-5xl">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
