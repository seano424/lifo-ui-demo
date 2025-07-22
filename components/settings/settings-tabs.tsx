// app/dashboard/settings/settings-tabs.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
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

const VALID_TABS = ['store', 'notifications', 'account', 'team'] as const
type ValidTab = (typeof VALID_TABS)[number]

export default function SettingsTabs() {
  const searchParams = useSearchParams()
  const t = useTranslations('settings')
  const { canViewSettings, isLoading: permissionsLoading } = useStorePermissions()

  const getInitialTab = (): ValidTab => {
    const tabParam = searchParams.get('tab')
    if (tabParam && VALID_TABS.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab
    }
    return 'store'
  }

  const [activeTab, setActiveTab] = useState<ValidTab>(getInitialTab)

  const handleTabChange = (newTab: string) => {
    if (VALID_TABS.includes(newTab as ValidTab)) {
      const validTab = newTab as ValidTab

      const url = new URL(window.location.href)
      url.searchParams.set('tab', validTab)
      window.history.replaceState({}, '', url.pathname + url.search)

      setActiveTab(validTab)
    }
  }

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex gap-4 bg-opacity-0" aria-label="Settings navigation">
          <TabsTrigger
            className="px-4 py-4"
            value="store"
            variant="secondary"
            aria-label="Store settings"
          >
            {t('tabs.store')}
          </TabsTrigger>
          <TabsTrigger
            className="px-4 py-4"
            value="notifications"
            variant="secondary"
            aria-label="Notification preferences"
          >
            {t('tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger
            className="px-4 py-4"
            value="account"
            variant="secondary"
            aria-label="Account information"
          >
            {t('tabs.account')}
          </TabsTrigger>
          <TabsTrigger
            className="px-4 py-4"
            value="team"
            variant="secondary"
            aria-label="Team management"
          >
            {t('tabs.team')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
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
                You don't have permission to view store settings. Contact your store manager or
                owner.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          {/* TODO: Implement notifications settings */}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
