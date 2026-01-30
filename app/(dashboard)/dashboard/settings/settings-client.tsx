'use client'

import UserAccountInformation from '@/components/account/user-account-information'
import { AlertSensitivityControls } from '@/components/dashboard/alert-sensitivity-controls'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { AlertCircle, Bell, CreditCard, Lock, Store, User, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
// Import existing components - preserve all functionality
import StoreInformation from '@/components/settings/store-information'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ComingSoon from '@/components/ui/coming-soon'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { usePermissionsNew } from '@/hooks/use-complete-user-profile'
import { useUnifiedSettings } from '@/hooks/use-unified-settings'

type TabValue = 'store' | 'account' | 'team' | 'notifications' | 'billing' | 'security'

export default function UnifiedSettingsPage() {
  const t = useTranslations('settings')
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>('store')

  // Load all data once
  const { isLoading, error } = useUnifiedSettings()
  const { isOwner, isManager, isLoading: isLoadingPermissions, storeId } = usePermissionsNew()

  // Handle URL state for tab persistence
  useEffect(() => {
    const tab = searchParams.get('tab') as TabValue
    if (tab && ['store', 'account', 'team', 'notifications', 'billing', 'security'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    const newTab = value as TabValue
    setActiveTab(newTab)
    // Update URL without causing navigation
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('tab', newTab)
    router.push(`/dashboard/settings?${newSearchParams.toString()}`, {
      scroll: false,
    })
  }

  // Determine which tabs to show based on permissions (single loading state!)
  const visibleTabs = () => {
    // If permissions are still loading, show skeleton tabs instead of wrong tabs
    if (isLoadingPermissions) {
      return null // This will trigger skeleton display
    }

    // If no store is selected, show minimal tabs
    if (!storeId) {
      return ['store', 'account', 'notifications'] as TabValue[]
    }

    const baseTabs: TabValue[] = ['store', 'account', 'notifications']

    if (isOwner || isManager) {
      baseTabs.push('team')
    }

    if (isOwner) {
      baseTabs.push('billing', 'security')
    }

    return baseTabs
  }

  // ✅ Add error handling back to the page
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardInsetHeader title={t('title')} description={t('description')} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : t('errors.loadingFailed')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show loading state while permissions load (now much faster with single query!)
  if (isLoadingPermissions) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardInsetHeader title={t('title')} description={t('description')} />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardInsetHeader title={t('title')} description={t('description')} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Show skeleton loader for tabs while permissions are loading */}
        {visibleTabs() === null ? (
          <div className="flex space-x-1 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ) : (
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${visibleTabs()?.length}, minmax(min-content, 1fr))`,
            }}
          >
            {visibleTabs()?.includes('store') && (
              <TabsTrigger value="store" className="flex items-center justify-center gap-2 px-1">
                <Store className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('tabs.store')}</span>
              </TabsTrigger>
            )}
            {visibleTabs()?.includes('account') && (
              <TabsTrigger value="account" className="flex items-center justify-center gap-2 px-1">
                <User className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('tabs.account')}</span>
              </TabsTrigger>
            )}
            {visibleTabs()?.includes('team') && (
              <TabsTrigger value="team" className="flex items-center justify-center gap-2 px-1">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('tabs.team')}</span>
              </TabsTrigger>
            )}
            {visibleTabs()?.includes('notifications') && (
              <TabsTrigger
                value="notifications"
                className="flex items-center justify-center gap-2 px-1"
              >
                <Bell className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {t('tabs.notifications')}
                </span>
              </TabsTrigger>
            )}
            {visibleTabs()?.includes('billing') && (
              <TabsTrigger value="billing" className="flex items-center justify-center gap-2 px-1">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('tabs.billing')}</span>
              </TabsTrigger>
            )}
            {visibleTabs()?.includes('security') && (
              <TabsTrigger value="security" className="flex items-center justify-center gap-2 px-1">
                <Lock className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{t('tabs.security')}</span>
              </TabsTrigger>
            )}
          </TabsList>
        )}

        {/* Loading state - show skeleton while data loads */}
        {isLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Store Settings Tab */}
            <TabsContent value="store" className="mt-6 space-y-6">
              <StoreInformation />
              <AlertSensitivityControls storeId={storeId || undefined} />
            </TabsContent>

            {/* Account Settings Tab */}
            <TabsContent value="account" className="mt-6">
              <UserAccountInformation />
            </TabsContent>

            {/* Team Management Tab */}
            {visibleTabs()?.includes('team') && (
              <TabsContent value="team" className="mt-6">
                <StoreUsersList />
              </TabsContent>
            )}

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="mt-6">
              <ComingSoon
                title={t('notifications.comingSoonTitle')}
                description={t('notifications.comingSoonDescription')}
              >
                <Typography variant="p" className="text-muted-foreground">
                  {t('notifications.checkBackSoon')}
                </Typography>
                <Typography variant="h4" className="text-muted-foreground">
                  👀
                </Typography>
              </ComingSoon>
            </TabsContent>

            {/* Billing Tab (Owner only) */}
            {visibleTabs()?.includes('billing') && (
              <TabsContent value="billing" className="mt-6">
                <ComingSoon
                  title={t('billing.comingSoonTitle')}
                  description={t('billing.comingSoonDescription')}
                >
                  <Typography variant="p" className="text-muted-foreground">
                    {t('billing.checkBackSoon')}
                  </Typography>
                  <Typography variant="h4" className="text-muted-foreground">
                    💳
                  </Typography>
                </ComingSoon>
              </TabsContent>
            )}

            {/* Security Tab (Owner/Manager only) */}
            {visibleTabs()?.includes('security') && (
              <TabsContent value="security" className="mt-6">
                <ComingSoon
                  title={t('security.comingSoonTitle')}
                  description={t('security.comingSoonDescription')}
                >
                  <Typography variant="p" className="text-muted-foreground">
                    {t('security.checkBackSoon')}
                  </Typography>
                  <Typography variant="h4" className="text-muted-foreground">
                    🔒
                  </Typography>
                </ComingSoon>
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  )
}
