'use client'

import {
  ChartNoAxesCombined,
  FileEdit,
  HelpCircle,
  Layers,
  ListTodo,
  Package,
  ScanBarcode,
  ScanSearch,
  SettingsIcon,
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
import { useUrgentTodosCount } from '@/hooks/use-urgent-todos-count'
import { useCurrentUser } from '@/hooks/use-users'
import { TeamSwitcher } from './team-switcher'
import { NavbarLogo } from './ui/logo'
import { Typography } from './ui/typography'

function useNavigationData() {
  const t = useTranslations('navigation')
  const { count: urgentTodosCount } = useUrgentTodosCount()

  return React.useMemo(
    () => ({
      navSections: [
        {
          title: t('dashboard'),
          items: [
            {
              title: t('dashboard'),
              url: '/dashboard',
              icon: ChartNoAxesCombined,
              isActive: true,
            },
          ],
        },
        {
          title: t('operations'),
          items: [
            {
              title: t('deliveries'),
              url: '/dashboard/deliveries',
              icon: ScanSearch,
            },
            {
              title: t('scanOut'),
              url: '/dashboard/scan-out',
              icon: ScanBarcode,
            },
            {
              title: t('todos'),
              url: '/dashboard/todos?tab=expiring&urgency=critical%2Chigh&sort=urgency&direction=desc',
              icon: ListTodo,
              badge: urgentTodosCount > 0 ? urgentTodosCount : undefined,
            },
          ],
        },
        {
          title: t('inventory'),
          items: [
            {
              title: t('products'),
              url: '/dashboard/inventory/products',
              icon: Package,
              isActive: true,
            },
            {
              title: t('batches'),
              url: '/dashboard/inventory/batches',
              icon: Layers,
            },
            {
              title: t('draftBatches'),
              url: '/dashboard/inventory/batches/drafts',
              icon: FileEdit,
            },
          ],
        },
        {
          title: t('settings'),
          items: [
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
    [t, urgentTodosCount],
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser()
  const navigationData = useNavigationData()

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
          className="group-data-[collapsible=icon]:hidden hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <NavbarLogo variant="icon" size="sm" className="dark:hidden" />
          <NavbarLogo variant="icon-dark" size="sm" className="dark:block hidden" />
          <Typography variant="h2" className="font-black">
            LIFO
          </Typography>
        </Link>

        {/* Mobile vertical logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden sm:hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <NavbarLogo variant="vertical" size="md" />
        </Link>

        {/* Collapsed icon logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <NavbarLogo variant="icon" size="sm" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-4 pt-4">
        <NavMain sections={navigationData.navSections} />
        <div className="group-data-[collapsible=icon]:hidden sm:hidden p-4 mt-4">
          <TeamSwitcher />
        </div>
      </SidebarContent>
      <SidebarFooter className="py-4">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
