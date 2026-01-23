'use client'

import {
  ChartNoAxesCombined,
  HelpCircle,
  Layers,
  PackagePlus,
  SettingsIcon,
  Zap,
  CalendarFold,
  XCircle,
  Package,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useExpiryTodosCount } from '@/hooks/use-expiry-todos-count'
import { useCurrentUser } from '@/hooks/use-users'
import { useDraftBatchCount } from '@/components/draft-batch-notification'
import { TeamSwitcher } from './team-switcher'

import { Logo } from './ui/logo'

function useNavigationData() {
  const t = useTranslations('navigation')
  const { count: expiryTodosCount } = useExpiryTodosCount()
  const draftBatchCount = useDraftBatchCount()

  return React.useMemo(
    () => ({
      navSections: [
        {
          title: t('dashboard'),
          items: [
            {
              title: t('overview'),
              url: '/dashboard',
              icon: ChartNoAxesCombined,
              isActive: true,
            },
          ],
        },
        {
          title: t('batches'),
          items: [
            {
              title: t('expiring'),
              url: '/dashboard/expiring',
              icon: CalendarFold,
              badge: expiryTodosCount > 0 ? expiryTodosCount : undefined,
            },
            {
              title: t('newDeliveries'),
              url: '/dashboard/inventory/new',
              icon: PackagePlus,
              badge: draftBatchCount,
            },
            {
              title: t('ignored'),
              url: '/dashboard/inventory/ignored',
              icon: XCircle,
            },
            {
              title: t('all'),
              url: '/dashboard/inventory/batches',
              icon: Layers,
            },
          ],
        },
        {
          title: t('catalog'),
          items: [
            {
              title: t('products'),
              url: '/dashboard/inventory/products?sort=active_batches_count&direction=desc',
              icon: Package,
              isActive: true,
            },
          ],
        },
        {
          title: t('settings'),
          items: [
            {
              title: t('integrations'),
              url: '/dashboard/integrations',
              icon: Zap,
            },
            {
              title: t('settings'),
              url: '/dashboard/settings',
              icon: SettingsIcon,
            },
            {
              title: t('support'),
              url: '/dashboard/support',
              icon: HelpCircle,
            },
          ],
        },
      ],
    }),
    [t, expiryTodosCount, draftBatchCount],
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser()
  const navigationData = useNavigationData()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!user) return

  return (
    <Sidebar
      collapsible="icon"
      className="bg-secondary-100/10 dark:bg-brand-dark border-l-none"
      {...props}
    >
      <SidebarHeader className="flex gap-2 justify-center items-center h-16 border-b dark:bg-brand-dark">
        {/* Desktop logo with text */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 ease-in-out font-heading font-black text-4xl"
        >
          <Logo variant="svg" size="sm" priority />
          LIFO
        </Link>

        {/* Mobile vertical logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden sm:hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <Logo variant="svg" size="sm" priority />
        </Link>

        {/* Collapsed icon logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <Logo variant="svg" size="sm" priority />
        </Link>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-4 pt-4">
        <NavMain sections={navigationData.navSections} />
        {mounted && (
          <div className="group-data-[collapsible=icon]:hidden sm:hidden p-4 mt-4">
            <TeamSwitcher />
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="py-4">{mounted && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
