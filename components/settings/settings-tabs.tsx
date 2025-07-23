// app/dashboard/settings/settings-tabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Typography } from '@/components/ui/typography'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import UserAccountInformation from '@/components/account/user-account-information'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StoreInformation from '@/components/settings/store-information'
import { useStorePermissions } from '@/hooks/use-store-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
          'w-32 pb-2 flex items-center justify-center',
        )}
      >
        {t('tabs.store')}
      </Link>
      <Link
        href="/dashboard/settings/notifications"
        className={cn(
          isNotificationsSettings && 'border-b-2 border-brand-secondary',
          'w-32 pb-2 flex items-center justify-center',
        )}
      >
        {t('tabs.notifications')}
      </Link>
      <Link
        href="/dashboard/settings/account"
        className={cn(
          isAccountSettings && 'border-b-2 border-brand-secondary',
          'w-32 pb-2 flex items-center justify-center',
        )}
      >
        {t('tabs.account')}
      </Link>
      <Link
        href="/dashboard/settings/team"
        className={cn(
          isTeamSettings && 'border-b-2 border-brand-secondary',
          'w-32 pb-2 flex items-center justify-center',
        )}
      >
        {t('tabs.team')}
      </Link>

      {/* <TabsContent value="store" className="space-y-4">
        {permissionsLoading || canViewSettings === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        ) : canViewSettings ? (
          <StoreInformation />
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to view store settings. Contact your store manager or
              owner.
            </AlertDescription>
          </Alert>
        )}
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col">
              <Typography variant="h2">{t('tabs.notifications')}</Typography>
              <Typography variant="p" color="muted">
                {t('tabs.notificationsDescription')}
              </Typography>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t">
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <Typography variant="p" color="muted">
                Notification settings coming soon...
              </Typography>
              <Typography variant="small" color="muted" className="mt-2">
                Configure email alerts, push notifications, and more
              </Typography>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <UserAccountInformation />
      </TabsContent>

      <TabsContent value="team" className="space-y-4">
        <StoreUsersList />
      </TabsContent> */}
    </div>
  )
}
