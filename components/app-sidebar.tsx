'use client'

import { ChartNoAxesCombined, Layers, SettingsIcon, Zap, CalendarFold, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
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
import { useExpiryTodosCount } from '@/hooks/use-expiry-todos-count'
import { useCurrentUser } from '@/hooks/use-users'

import { Logo } from './ui/logo'

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const base = isDemo ? '/demo' : '/dashboard'

function useNavigationData() {
  const t = useTranslations('navigation')
  const { count: expiryTodosCount } = useExpiryTodosCount()

  return React.useMemo(
    () => ({
      navSections: [
        {
          title: t('dashboard'),
          items: [
            {
              title: t('overview'),
              url: base,
              icon: ChartNoAxesCombined,
              isActive: true,
            },
            {
              title: t('all'),
              url: `${base}/inventory/batches`,
              icon: Layers,
            },
            {
              title: t('expiringSoon'),
              url: `${base}/expiring`,
              icon: CalendarFold,
              badge: expiryTodosCount > 0 ? expiryTodosCount : undefined,
            },
            {
              title: t('products'),
              url: `${base}/inventory/products?sort=active_batches_count&direction=desc`,
              icon: Package,
              isActive: true,
            },
          ],
        },
        {
          title: t('settings'),
          items: [
            {
              title: t('integrations'),
              url: `${base}/integrations`,
              icon: Zap,
            },
            {
              title: t('settings'),
              url: `${base}/settings`,
              icon: SettingsIcon,
            },
            {
              title: t('automations'),
              url: `${base}/settings/automations`,
              icon: Zap,
            },
          ],
        },
      ],
    }),
    [t, expiryTodosCount],
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser()
  const navigationData = useNavigationData()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!user) return

  return (
    <Sidebar
      collapsible="icon"
      className="bg-secondary-100/10 dark:bg-background border-l-none"
      {...props}
    >
      <SidebarHeader className="hidden md:flex gap-2 justify-start items-center h-16 border-b dark:bg-background">
        {/* Desktop logo with text */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden gap-2 hover:opacity-80 transition-opacity duration-200 ease-in-out text-4xl px-2"
        >
          <Logo variant="svg" size="sm" priority withText />
        </Link>

        {/* Mobile vertical logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:hidden sm:hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <Logo variant="svg" size="sm" priority withText />
        </Link>

        {/* Collapsed icon logo */}
        <Link
          href="/"
          className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity duration-200 ease-in-out"
        >
          <Logo variant="svg" size="sm" priority />
        </Link>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-4 pt-4">
        <NavMain sections={navigationData.navSections} />
      </SidebarContent>
      <SidebarFooter className="py-4">{mounted && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
