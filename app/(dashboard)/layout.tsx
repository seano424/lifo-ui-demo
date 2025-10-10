import { AppSidebar } from '@/components/app-sidebar'
import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import { SettingsError } from '@/components/settings/settings-error-boundary'
import { TeamSwitcher } from '@/components/team-switcher'
import { Button } from '@/components/ui/button'
import { CompactLanguageSwitcher } from '@/components/ui/compact-language-switcher'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import UserButton from '@/components/users/user-button'
import { prefetchDashboardData } from '@/lib/react-query/prefetch'
import { isRetryableError } from '@/lib/utils/retry'
import { HydrationBoundary } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashboardData = await prefetchDashboardData()

  // Handle authentication errors at the dashboard level
  if (dashboardData.error) {
    // Check if it's a transient error vs real auth issue
    const isTransientError = isRetryableError(dashboardData.error, [
      'temporarily unavailable',
      'fetch failed',
      'ECONNRESET',
      'ETIMEDOUT',
    ])

    // If it's a transient error, let the page render - client will handle data fetching
    if (!isTransientError) {
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
    // For transient errors, continue rendering with empty hydration state
  }

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
