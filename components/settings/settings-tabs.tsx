'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export default function SettingsTabs() {
  const pathname = usePathname()
  const t = useTranslations('settings')

  const isStoreSettings = pathname.includes('/store')
  const isNotificationsSettings = pathname.includes('/notifications')
  const isAccountSettings = pathname.includes('/account')
  const isTeamSettings = pathname.includes('/team')

  return (
    <div className="max-w-5xl mx-auto flex gap-4">
      <Link
        href="/dashboard/settings/store"
        className={cn(
          isStoreSettings && 'border-b-2 border-brand-secondary',
          'flex-1 pb-2 flex items-center justify-center text-center',
        )}
      >
        {t('tabs.store')}
      </Link>
      <Link
        href="/dashboard/settings/notifications"
        className={cn(
          isNotificationsSettings && 'border-b-2 border-brand-secondary',
          'flex-1 pb-2 flex items-center justify-center text-center',
        )}
      >
        {t('tabs.notifications')}
      </Link>
      <Link
        href="/dashboard/settings/account"
        className={cn(
          isAccountSettings && 'border-b-2 border-brand-secondary',
          'flex-1 pb-2 flex items-center justify-center text-center',
        )}
      >
        {t('tabs.account')}
      </Link>
      <Link
        href="/dashboard/settings/team"
        className={cn(
          isTeamSettings && 'border-b-2 border-brand-secondary',
          'flex-1 pb-2 flex items-center justify-center text-center',
        )}
      >
        {t('tabs.team')}
      </Link>
    </div>
  )
}
