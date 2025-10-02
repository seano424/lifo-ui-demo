'use client'

import {
  ChartNoAxesCombined,
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
              title: t('inbound'),
              url: '/dashboard/inbound',
              icon: ScanSearch,
            },
            {
              title: t('outbound'),
              url: '/dashboard/outbound',
              icon: ScanBarcode,
            },
            {
              title: t('todos'),
              url: '/dashboard/todos?sort=urgency&direction=desc&urgency=critical%2Chigh', // this is to get the todos sorted by urgency by default -> high and critical
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
              url: '/dashboard/inventory/batches?sort=expiry_date&direction=asc&status=active',
              icon: Layers,
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
          ],
        },
      ],
    }),
    [t, urgentTodosCount],
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading, isError } = useCurrentUser()
  const navigationData = useNavigationData()

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>
  if (!user) return

  return (
    <Sidebar
      collapsible="icon"
      className="bg-secondary-100/10 dark:bg-brand-dark border-l-none"
      {...props}
    >
      <SidebarHeader className="flex gap-2 justify-center items-center h-16 border-b dark:bg-brand-dark">
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <NavbarLogo variant="icon" size="sm" className="dark:hidden" />
          <NavbarLogo variant="icon-dark" size="sm" className="dark:block hidden" />
          <Typography variant="h2" className="font-black">
            Lifo
          </Typography>
        </Link>
        <NavbarLogo
          variant="vertical"
          size="md"
          className="group-data-[collapsible=icon]:hidden sm:hidden"
        />
        <NavbarLogo
          variant="icon"
          size="sm"
          className="group-data-[collapsible=icon]:block hidden"
        />
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
