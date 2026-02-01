import DashboardBreadcrumbs from '@/components/dashboard/dashboard-breadcrumbs'
import { NotificationBellExpiry } from '@/components/notifications/notification-bell-expiry'
import { TeamSwitcher } from '@/components/team-switcher'
import { CompactLanguageSwitcher } from '@/components/ui/compact-language-switcher'
import { CompactThemeSwitcher } from '@/components/compact-theme-switcher'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import UserButton from '@/components/users/user-button'

export function DashboardNav() {
  return (
    <header className="flex sticky top-0 bg-background z-50 h-16 shrink-0 items-center gap-2 justify-between px-4 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <div className="hidden lg:block">
          <DashboardBreadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CompactThemeSwitcher />
        <CompactLanguageSwitcher />
        <NotificationBellExpiry />
        <TeamSwitcher compact />
        <UserButton />
      </div>
    </header>
  )
}
