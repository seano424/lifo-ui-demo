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
        <SidebarInset className="overflow-scroll">
          <DashboardNav />
          <div className="flex flex-1 flex-col gap-4 px-4 py-8 overflow-auto items-center">
            <div className="w-full max-w-5xl">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
