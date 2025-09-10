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
import { useCurrentUser } from '@/hooks/use-users'
import { TeamSwitcher } from './team-switcher'
import { NavbarLogo } from './ui/logo'
import { Typography } from './ui/typography'

function useNavigationData() {
  const t = useTranslations('navigation')

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
              url: '/dashboard/todos',
              icon: ListTodo,
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
    [t],
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading, isError } = useCurrentUser()
  const navigationData = useNavigationData()

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>
  if (!user) return <div>Not logged in</div>

  return (
    <Sidebar collapsible="icon" className="bg-secondary-100/10 dark:bg-brand-dark" {...props}>
      <SidebarHeader className="flex flex-col gap-2 justify-center items-center h-16 border-b">
        <div className="group-data-[collapsible=icon]:hidden hidden sm:flex items-center gap-2">
          <NavbarLogo variant="icon" size="sm" />
          <Typography variant="h2" className="lowercase font-black">
            LIFO
          </Typography>
        </div>
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

        <div className="group-data-[collapsible=icon]:hidden sm:hidden">
          <TeamSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-4 pt-4">
        <NavMain sections={navigationData.navSections} />
      </SidebarContent>
      <SidebarFooter className="py-4">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
