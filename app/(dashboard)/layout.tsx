import { HydrationBoundary } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import UserButton from '@/components/users/user-button'
import { prefetchCurrentUser } from '@/lib/react-query/prefetch'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { dehydratedState } = await prefetchCurrentUser()

  return (
    <HydrationBoundary state={dehydratedState}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <DashboardBreadcrumbs />
            </div>

            <UserButton />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
