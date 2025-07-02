'use client'

import * as React from 'react'
import {
  BookOpen,
  Bot,
  Frame,
  GalleryVerticalEnd,
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

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
  ],
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: 'Products',
          url: '/dashboard/products',
        },
        {
          title: 'Batches',
          url: '/dashboard/batches',
        },
        {
          title: 'Donations',
          url: '/dashboard',
        },
        {
          title: 'Discounts',
          url: '/dashboard/discounts',
        },
      ],
    },
    {
      title: 'Inventory',
      url: '/dashboard',
      icon: Bot,
    },
    {
      title: 'Batch Analytics',
      url: '/dashboard/batch-analytics',
      icon: BookOpen,
    },
    {
      title: 'Action Log',
      url: '/dashboard/action-log',
      icon: Calendar,
    },
    {
      title: 'Users',
      url: '/dashboard/users',
      icon: Users,
    },
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
