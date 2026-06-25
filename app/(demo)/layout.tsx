import { AppSidebar } from '@/components/app-sidebar'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { QueryErrorBoundary } from '@/components/query-error-boundary'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { HydrationBoundary } from '@tanstack/react-query'
import { createDemoPrefetch } from '@/lib/mocks/demo-prefetch'
import { DemoInitializer } from '@/components/demo/demo-initializer'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const { dehydratedState } = createDemoPrefetch()

  return (
    <HydrationBoundary state={dehydratedState}>
      <DemoInitializer />
      <QueryErrorBoundary>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex flex-col min-w-0">
            <DashboardNav />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </QueryErrorBoundary>
    </HydrationBoundary>
  )
}
