'use client'

import * as React from 'react'
import {
  // Removed: AudioWaveform,
  BookOpen,
  Bot,
  // Removed: Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
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
      title: 'Overview',
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
        },
      ],
    },
    {
      title: 'Inventory',
      url: '/dashboard',
      icon: Bot,
      items: [
        {
          title: 'All Inventory',
          url: '/dashboard',
        },
        {
          title: 'Expiring Soon',
          url: '/dashboard',
        },
        {
          title: 'Expired',
          url: '/dashboard',
        },
        {
          title: 'Alerts',
          url: '/dashboard',
        },
      ],
    },
    {
      title: 'Actions',
      url: '/dashboard',
      icon: BookOpen,
      items: [
        {
          title: 'Add New Product',
          url: '/dashboard',
        },
        {
          title: 'Add New Batch',
          url: '/dashboard',
        },
        {
          title: 'Edit Product',
          url: '/dashboard',
        },
        {
          title: 'Edit Batch',
          url: '/dashboard',
        },
        {
          title: 'Add Discount',
          url: '/dashboard',
        },
        {
          title: 'Add Donation',
          url: '/dashboard',
        },
      ],
    },
    {
      title: 'Analytics',
      url: '/dashboard',
      icon: Settings2,
      items: [
        {
          title: 'Overview',
          url: '/dashboard',
        },
        {
          title: 'Reports',
          url: '/dashboard',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/dashboard',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/dashboard',
        },
        {
          title: 'Store Settings',
          url: '/dashboard',
        },
        {
          title: 'Team',
          url: '/dashboard',
        },
        {
          title: 'Notifications',
          url: '/dashboard',
        },
        {
          title: 'Billing',
          url: '/dashboard',
        },
        {
          title: 'Limits',
          url: '/dashboard',
        },
      ],
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
