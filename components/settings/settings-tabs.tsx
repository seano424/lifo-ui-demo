'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import UserAccountInformation from '@/components/account/user-account-information'

const VALID_TABS = ['store', 'notifications', 'account', 'team'] as const
type ValidTab = (typeof VALID_TABS)[number]

export default function SettingsTabs() {
  const searchParams = useSearchParams()
  const t = useTranslations('settings')

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

  return (
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
        <Typography variant="h2">{t('tabs.store')}</Typography>
        <Typography variant="p" color="muted">
          {t('tabs.storeDescription')}
        </Typography>
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Typography variant="h2">{t('tabs.notifications')}</Typography>
        <Typography variant="p" color="muted">
          {t('tabs.notificationsDescription')}
        </Typography>
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <UserAccountInformation />
      </TabsContent>

      <TabsContent value="team" className="space-y-4">
        <StoreUsersList />
      </TabsContent>
    </Tabs>
  )
}
