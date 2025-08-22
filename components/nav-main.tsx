'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
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

    if (pathname === itemUrl) return true

    // Special handling for settings: treat /settings/store as active for /settings
    if (itemUrl.includes('/settings')) {
      return pathname.startsWith(itemUrl)
    }

    return false
  }

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(item =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className={cn(
                'group/collapsible group-data-[state=open]/collapsible:flex group-data-[state=open]/collapsible:flex-col group-data-[state=open]/collapsible:items-center',
              )}
            >
              <SidebarMenuItem className="">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="p-4 font-medium group-data-[collapsible=icon]:hidden"
                    tooltip={item.title}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map(subItem => (
                      <SidebarMenuSubItem
                        className={cn(
                          'hover:bg-secondary-100/80 rounded-none font-medium pl-6 py-2',
                          isPathActive(subItem.url) &&
                            'bg-secondary-100/80 hover:bg-secondary-100/80 font-bold',
                          'group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:py-0',
                        )}
                        key={subItem.title}
                      >
                        <SidebarMenuSubButton asChild tooltip={subItem.title}>
                          <Link href={subItem.url} onClick={handleLinkClick}>
                            {subItem.icon && <subItem.icon className="!text-secondary-900" />}
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem className="flex flex-col items-center" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  'hover:bg-secondary-100/80 rounded-none p-4 font-medium',
                  isPathActive(item.url) &&
                    'bg-secondary-100/80 hover:bg-secondary-100/80 font-bold',
                )}
                asChild
                tooltip={item.title}
              >
                <Link
                  href={item.url}
                  className="flex items-center w-full"
                  onClick={handleLinkClick}
                >
                  {item.icon && <item.icon className="text-secondary-900" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
