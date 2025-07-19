'use client'

import * as React from 'react'
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

// This is sample data.
const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: 'Inbound',
      url: '/dashboard/inbound',
      icon: Bot,
    },
    {
      title: 'Outbound',
      url: '/dashboard/outbound',
      icon: BookOpen,
    },
    {
      title: 'To-Do',
      url: '/dashboard/to-do',
      icon: Calendar,
    },

    {
      title: 'Inventory',
      url: '/dashboard/inventory',
      icon: Box,
    },
    {
      title: 'Performance',
      url: '/dashboard/performance',
      icon: BarChart,
    },
    {
      title: 'Milestones',
      url: '/dashboard/milestones',
      icon: Target,
    },
    {
      title: 'Settings',
      url: '/dashboard/settings',
      icon: Settings2,
    },
    {
      title: 'Help Center',
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
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading, isError } = useCurrentUser()
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>
  if (!user) return <div>Not logged in</div>

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
