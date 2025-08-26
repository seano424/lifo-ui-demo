'use client'

import {
  BookOpen,
  Bot,
  Box,
  Calendar,
  Layers,
  Package,
  SettingsIcon,
  SquareTerminal,
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
import { cn } from '@/lib/utils'
import { TeamSwitcher } from './team-switcher'
import { NavbarLogo } from './ui/logo'
import { Typography } from './ui/typography'

function useNavigationData() {
  const t = useTranslations('navigation')

  return React.useMemo(
    () => ({
      navMain: [
        {
          title: t('dashboard'),
          url: '/dashboard',
          icon: SquareTerminal,
          isActive: true,
        },
        {
          title: t('inbound'),
          url: '/dashboard/inbound',
          icon: Bot,
        },
        {
          title: t('outbound'),
          url: '/dashboard/outbound',
          icon: BookOpen,
        },
        {
          title: t('todos'),
          url: '/dashboard/todos',
          icon: Calendar,
        },
        {
          title: t('inventory'),
          url: '/dashboard/inventory',
          icon: Box,
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
          ],
          isActive: true,
        },
        // {
        //   title: t('performance'),
        //   url: '/dashboard/performance',
        //   icon: BarChart,
        // },
        // {
        //   title: t('milestones'),
        //   url: '/dashboard/milestones',
        //   icon: Target,
        // },
        {
          title: t('settings'),
          url: '/dashboard/settings',
          icon: SettingsIcon,
        },
        // {
        //   title: t('helpCenter'),
        //   url: '/dashboard/help-center',
        //   icon: HelpCircle,
        // },
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
    <Sidebar collapsible="icon" className="group-data-[collapsible=icon]:pt-5" {...props}>
      <SidebarHeader
        className={cn(
          'flex flex-col gap-2 justify-center items-center',
          'group-data-[collapsible=icon]:pt-12',
        )}
      >
        <div
          className={cn('group-data-[collapsible=icon]:hidden hidden sm:flex items-center gap-2')}
        >
          <NavbarLogo variant="icon" size="md" />
          <Typography
            variant="h1"
            className="text-transparent bg-clip-text bg-gradient-to-r from-primary-900 to-secondary-900 dark:from-primary-50 dark:text-primary-900"
          >
            LIFO
          </Typography>
        </div>
        <NavbarLogo
          variant="vertical"
          size="md"
          className={cn('group-data-[collapsible=icon]:hidden sm:hidden')}
        />
        <NavbarLogo
          variant="icon"
          size="sm"
          className={cn('group-data-[collapsible=icon]:block hidden')}
        />

        <div className={cn('group-data-[collapsible=icon]:hidden sm:hidden')}>
          <TeamSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-5">
        <NavMain items={navigationData.navMain} />
      </SidebarContent>
      <SidebarFooter className="py-4">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
