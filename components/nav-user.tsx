'use client'

import { LogoutButton } from '@/components/logout-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageButtonGroup } from '@/components/ui/language-switcher'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ThemeSwitcherSelect } from '@/components/ui/theme-switcher-select'
import type { User } from '@/lib/types/user'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Globe,
  Palette,
  Sparkles,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar()
  const t = useTranslations('navUser')

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-2xl">
                <AvatarImage src={user.avatar_url || ''} alt={user.full_name || ''} />
                <AvatarFallback className="rounded-2xl">
                  {/* First two letters of the full name */}
                  {user.full_name
                    ?.split(' ')
                    .map(name => name.charAt(0))
                    .join('') || 'CN'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.full_name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-2xl">
                  <AvatarImage src={user.avatar_url || ''} alt={user.full_name || ''} />
                  <AvatarFallback className="rounded-2xl">
                    {/* First two letters of the full name */}
                    {user.full_name
                      ?.split(' ')
                      .map(name => name.charAt(0))
                      .join('') || 'CN'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.full_name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/upgrade">
                  <Sparkles />
                  {t('upgradeToPro')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings?tab=account">
                  <BadgeCheck />
                  {t('account')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings?tab=billing">
                  <CreditCard />
                  {t('billing')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings?tab=notifications">
                  <Bell />
                  {t('notifications')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="flex-col items-start p-0 cursor-default hover:!bg-transparent">
                <div className="flex items-center gap-2 px-2 py-1.5 w-full hover:text-black group-hover:text-black">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{t('language')}</span>
                </div>
                <div className="px-2 pb-2">
                  <LanguageButtonGroup />
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="flex-col items-start p-0 cursor-default hover:!bg-transparent">
                <div className="flex items-center gap-2 px-2 py-1.5 w-full hover:text-black group-hover:text-black">
                  <Palette className="h-4 w-4" />
                  <span className="text-sm">{t('theme')}</span>
                </div>
                <div className="px-2 pb-2">
                  <ThemeSwitcherSelect />
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-default hover:!bg-transparent">
              <LogoutButton className="w-full bg-transparent text-foreground" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
