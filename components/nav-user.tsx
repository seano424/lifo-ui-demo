'use client'

import { LogoutButton } from '@/components/logout-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
// import { ThemeSwitcherSelect } from '@/components/ui/theme-switcher-select'
import type { User } from '@/lib/types/user'
import { BadgeCheck, Bell, ChevronsUpDown, CreditCard, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

function UserAvatar({
  avatarUrl,
  fullName,
  className,
}: {
  avatarUrl: string | null | undefined
  fullName: string | null | undefined
  className?: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials =
    fullName
      ?.split(' ')
      .map(n => n.charAt(0))
      .join('') || 'CN'

  if (avatarUrl && !imgError) {
    return (
      <Image
        src={avatarUrl}
        alt={fullName || ''}
        width={32}
        height={32}
        className={className ?? 'rounded-2xl'}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className="h-8 w-8 rounded-2xl bg-muted flex items-center justify-center text-xs font-medium shrink-0">
      {initials}
    </div>
  )
}

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar()
  const t = useTranslations('navUser')

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <UserAvatar avatarUrl={user.avatar_url} fullName={user.full_name} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate ">{user.full_name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl flex flex-col gap-1"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar
                  avatarUrl={user.avatar_url}
                  fullName={user.full_name}
                  className="rounded-2xl shrink-0"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate ">{user.full_name}</span>
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
              <DropdownMenuItem className="cursor-default dark:text-foreground">
                <LogoutButton />
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
