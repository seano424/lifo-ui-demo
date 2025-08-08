'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  BookOpen,
  Bot,
  SquareTerminal,
  Calendar,
  Box,
  BarChart,
  Target,
  HelpCircle,
  SettingsIcon,
} from 'lucide-react'

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
import { NavbarLogo } from './ui/logo'
import { cn } from '@/lib/utils'

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
        },
        {
          title: t('performance'),
          url: '/dashboard/performance',
          icon: BarChart,
        },
        {
          title: t('milestones'),
          url: '/dashboard/milestones',
          icon: Target,
        },
        {
          title: t('settings'),
          url: '/dashboard/settings',
          icon: SettingsIcon,
        },
        {
          title: t('helpCenter'),
          url: '/dashboard/help-center',
          icon: HelpCircle,
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader
        className={cn('min-h-12 flex justify-center', 'group-data-[collapsible=icon]:items-center')}
      >
        <NavbarLogo
          variant="horizontal"
          size="md"
          className={cn('group-data-[collapsible=icon]:hidden')}
        />
        <NavbarLogo
          variant="icon"
          size="sm"
          className={cn('group-data-[collapsible=icon]:block hidden')}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
