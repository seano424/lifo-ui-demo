'use client'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Typography } from './ui/typography'

import { NotificationCount } from '@/components/notifications/notification-count'

// Badge component for navigation items
function NavBadge({ count, className }: { count: number; className?: string }) {
  return (
    <NotificationCount
      count={count}
      variant="sidebar"
      className={cn('ml-auto shrink-0', className)}
    />
  )
}

export function NavMain({
  sections,
}: {
  sections: {
    title: string
    items: {
      title: string
      url: string
      icon?: LucideIcon
      isActive?: boolean
      badge?: number
      items?: {
        title: string
        url: string
        icon?: LucideIcon
        badge?: number
      }[]
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Prevent hydration mismatch by tracking when we're hydrated
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Helper function to check if path is active (only after hydration)
  const isPathActive = (itemUrl: string) => {
    if (!isHydrated) return false // Prevent hydration mismatch

    // Strip query parameters from the item URL for comparison
    const itemPath = itemUrl.split('?')[0]

    // pathname from usePathname() already excludes query parameters
    // Exact match is the primary check
    if (pathname === itemPath) return true

    // Special handling for /dashboard - only match exact path
    // to prevent it from matching /dashboard/todos, /dashboard/inventory, etc.
    if (itemPath === '/dashboard') {
      return pathname === '/dashboard'
    }

    // Special handling for settings: treat /settings/store as active for /settings
    if (itemPath.includes('/settings')) {
      return pathname.startsWith(itemPath)
    }

    // Check if current path starts with the item URL (for nested routes)
    // This handles cases like /dashboard/todos/123 matching /dashboard/todos
    if (pathname.startsWith(`${itemPath}/`)) {
      return true
    }

    return false
  }

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    setOpenMobile(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map(section => (
        <SidebarGroup className="px-4" key={section.title}>
          <SidebarGroupLabel className="mb-1">
            <Typography variant="extraSmall" color="muted" className=" uppercase text-slate-400/90">
              {section.title}
            </Typography>
          </SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map(item =>
              item.items && item.items.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className={cn(
                    'group/collapsible group-data-[state=open]/collapsible:flex group-data-[state=open]/collapsible:flex-col group-data-[state=open]/collapsible:items-center',
                  )}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="p-4  group-data-[collapsible=icon]:hidden"
                        tooltip={item.title}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {item.badge && <NavBadge count={item.badge} className="ml-0 mr-2" />}
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="flex flex-col gap-2">
                        {item.items.map(subItem => (
                          <SidebarMenuSubItem
                            className={cn(
                              'hover:bg-secondary-100/30 dark:hover:bg-primary-900 dark:active:bg-primary-900 rounded-2xl  pl-6 py-1',
                              isPathActive(subItem.url) &&
                                'bg-secondary-100/30 hover:bg-secondary-100/30 dark:hover:bg-primary-900 dark:bg-primary-900 dark:active:bg-primary-900 text-secondary-900 font-bold',
                              'group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:py-0',
                            )}
                            key={subItem.title}
                          >
                            <SidebarMenuSubButton asChild tooltip={subItem.title}>
                              <Link href={subItem.url} onClick={handleLinkClick}>
                                {subItem.icon && (
                                  <subItem.icon className="text-secondary-900 dark:text-primary-50" />
                                )}
                                <span>{subItem.title}</span>
                                {subItem.badge && <NavBadge count={subItem.badge} />}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem className="flex flex-col items-center gap-2" key={item.title}>
                  <SidebarMenuButton
                    className={cn(
                      'hover:bg-secondary-100/30 rounded-2xl dark:hover:bg-primary-900 dark:active:bg-primary-900 dark:data-[active=true]:bg-primary-900 py-2 px-2  relative',
                      isPathActive(item.url) &&
                        'bg-secondary-100/30 hover:bg-secondary-100/30 dark:bg-primary-900 dark:hover:bg-primary-900 dark:active:bg-primary-900 text-secondary-900 dark:text-brand-white font-bold ',
                    )}
                    asChild
                    tooltip={item.title}
                  >
                    <Link
                      href={item.url}
                      className="flex items-center w-full"
                      onClick={handleLinkClick}
                    >
                      {item.icon && (
                        <item.icon className="text-secondary-900 dark:text-primary-50" />
                      )}
                      <span>{item.title}</span>
                      {item.badge && <NavBadge count={item.badge} />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  )
}
