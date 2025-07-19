'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Users,
  Calendar,
  Box,
  BarChart,
  Milestone,
  Target,
  Tag,
  HelpCircle,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/hooks/use-users'

function useNavigationData() {
  const t = useTranslations('navigation')
  
  return React.useMemo(() => ({
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
        title: t('todo'),
        url: '/dashboard/to-do',
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
        icon: Settings2,
      },
      {
        title: t('helpCenter'),
        url: '/dashboard/help-center',
        icon: HelpCircle,
      },
    ],
    projects: [
      {
        name: 'Design Engineering',
        url: '/dashboard',
        icon: Frame,
      },
      {
        name: 'Sales & Marketing',
        url: '/dashboard',
        icon: PieChart,
      },
      {
        name: 'Travel',
        url: '/dashboard',
        icon: Map,
      },
    ],
  }), [t])
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading, isError } = useCurrentUser()
  const navigationData = useNavigationData()
  
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>
  if (!user) return <div>Not logged in</div>

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData.navMain} />
        {/* <NavProjects projects={navigationData.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
