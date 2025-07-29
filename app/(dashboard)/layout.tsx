import { HydrationBoundary } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import UserButton from '@/components/users/user-button'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'
import { SettingsError } from '@/components/settings/settings-error-boundary'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const result = await prefetchDashboardData()

  // Handle authentication errors at the dashboard level
  if (result.error) {
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

  // Handle no store access
  if (result.userStores && result.userStores.length === 0) {
    return (
      <SettingsError
        errorType="not-found"
        title="No Store Access"
        message="You don't have access to any stores yet. Contact your administrator."
        showRefreshButton={false}
        customAction={{
          label: 'Contact Support',
          href: '/support',
        }}
      />
    )
  }

  return (
    <HydrationBoundary state={result.dehydratedState}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 justify-between px-4 border-b mb-4">
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
