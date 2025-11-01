import { AppSidebar } from '@/components/app-sidebar'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'
import { HydrationBoundary } from '@tanstack/react-query'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashboardData = await prefetchDashboardData()

  return (
    <HydrationBoundary state={dashboardData.dehydratedState}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-y-auto">
          <DashboardNav />
          <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 items-center">
            <div className="w-full max-w-full md:max-w-full lg:max-w-full xl:max-w-5xl px-2 md:px-0">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
