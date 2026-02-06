import { AppSidebar } from '@/components/app-sidebar'
import { DeletionWarningBanner } from '@/components/account/deletion-warning-banner'
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
        <SidebarInset className="overflow-y-auto relative">
          <DashboardNav />
          <DeletionWarningBanner />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
