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
      // items: [
      //   {
      //     title: 'Overview',
      //     url: '/dashboard',
      //   },
      //   {
      //     title: 'Batches',
      //     url: '/dashboard',
      //   },
      //   {
      //     title: 'Donations',
      //     url: '/dashboard',
      //   },
      //   {
      //     title: 'Discounts',
      //     url: '/dashboard',
      //   },
      // ],
    },
    {
      title: 'Products',
      url: '/dashboard/products',
      icon: Bot,
    },
    {
      title: 'Batches',
      url: '/dashboard/batches',
      icon: BookOpen,
    },
    {
      title: 'Action Log',
      url: '/dashboard/action-log',
      icon: Calendar,
    },
    // {
    //   title: 'Users',
    //   url: '/dashboard/users',
    //   icon: Users,
    // },
    {
      title: 'Settings',
      url: '/dashboard/settings',
      icon: Settings2,
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
