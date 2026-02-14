import { AppSidebar } from '@/components/app-sidebar'
import { DeletionWarningBanner } from '@/components/account/deletion-warning-banner'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { QueryBoundary } from '@/components/query-boundary'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'
import { HydrationBoundary } from '@tanstack/react-query'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashboardData = await prefetchDashboardData()

  return (
    <HydrationBoundary state={dashboardData.dehydratedState}>
      <QueryBoundary
        fallback={
          <div className="flex h-screen w-screen items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="overflow-y-auto relative">
            <DashboardNav />
            <DeletionWarningBanner />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </QueryBoundary>
    </HydrationBoundary>
  )
}
