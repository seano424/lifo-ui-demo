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

  console.log('🎯 SettingsTabs - State:', {
    canViewSettings,
    permissionsLoading,
    shouldShowLoading: permissionsLoading || canViewSettings === undefined,
    shouldShowStoreInfo: !permissionsLoading && canViewSettings === true,
    shouldShowError: !permissionsLoading && canViewSettings === false,
    activeTab,
  })

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
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
        <div className="h-96 bg-gray-50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Typography variant="h1">Settings</Typography>
        <Typography variant="p" color="muted">
          Manage your store, account, and team settings
        </Typography>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-4 bg-opacity-0">
          <TabsTrigger value="store" variant="secondary">
            {t('tabs.store')}
          </TabsTrigger>
          <TabsTrigger value="notifications" variant="secondary">
            {t('tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="account" variant="secondary">
            {t('tabs.account')}
          </TabsTrigger>
          <TabsTrigger value="team" variant="secondary">
            {t('tabs.team')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
          {(() => {
            const shouldShowLoading = permissionsLoading || canViewSettings === undefined
            const shouldShowStoreInfo = !permissionsLoading && canViewSettings === true
            const shouldShowError = !permissionsLoading && canViewSettings === false

            console.log('🎨 Store tab rendering decision:', {
              shouldShowLoading,
              shouldShowStoreInfo,
              shouldShowError,
              permissionsLoading,
              canViewSettings,
            })

            if (shouldShowLoading) {
              console.log('⏳ Rendering loading skeleton')
              return (
                <div className="space-y-4">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-24" />
                </div>
              )
            } else if (shouldShowStoreInfo) {
              console.log('✅ Rendering StoreInformation component')
              return <StoreInformation />
            } else if (shouldShowError) {
              console.log('❌ Rendering permission error')
              return (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have permission to view store settings. Contact your store manager or
                    owner.
                  </AlertDescription>
                </Alert>
              )
            } else {
              console.log('🤔 Unexpected state, defaulting to loading')
              return (
                <div className="space-y-4">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-24" />
                </div>
              )
            }
          })()}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Typography variant="h2">{t('tabs.notifications')}</Typography>
          <Typography variant="p" color="muted">
            {t('tabs.notificationsDescription')}
          </Typography>
          {/* TODO: Implement notifications settings */}
          <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Typography variant="p" color="muted">
              Notification settings coming soon...
            </Typography>
          </div>
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
