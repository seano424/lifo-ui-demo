'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import UserAccountInformation from '@/components/account/user-account-information'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
// import { EmailTestComponent } from '@/components/debug/email-test'

const VALID_TABS = ['store', 'notifications', 'account', 'team'] as const
type ValidTab = (typeof VALID_TABS)[number]

export default function SettingsTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize tab from URL parameter immediately to prevent flash
  const getInitialTab = (): ValidTab => {
    const tabParam = searchParams.get('tab')
    if (tabParam && VALID_TABS.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab
    }
    return 'store' // default
  }
  
  const [activeTab, setActiveTab] = useState<ValidTab>(getInitialTab)

  // Handle tab change - update URL immediately, then state
  const handleTabChange = (newTab: string) => {
    if (VALID_TABS.includes(newTab as ValidTab)) {
      const validTab = newTab as ValidTab
      
      // Update URL immediately using native browser API for instant feedback
      const url = new URL(window.location.href)
      url.searchParams.set('tab', validTab)
      window.history.replaceState({}, '', url.pathname + url.search)
      
      // Update state
      setActiveTab(validTab)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-4 bg-opacity-0">
        <TabsTrigger value="store" variant="secondary">
          Store
        </TabsTrigger>
        <TabsTrigger value="notifications" variant="secondary">
          Notifications
        </TabsTrigger>
        <TabsTrigger value="account" variant="secondary">
          Account
        </TabsTrigger>
        <TabsTrigger value="team" variant="secondary">
          Team
        </TabsTrigger>
      </TabsList>

      <TabsContent value="store" className="space-y-4">
        <Typography variant="h2">Store</Typography>
        <Typography variant="p" color="muted">
          Manage your store settings.
        </Typography>
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Typography variant="h2">Notifications</Typography>
        <Typography variant="p" color="muted">
          Manage your notification settings.
        </Typography>
      </TabsContent>

      <TabsContent value="account" className="space-y-4">
        <UserAccountInformation />
      </TabsContent>

      <TabsContent value="team" className="space-y-4">
        {/* <EmailTestComponent /> */}
        <StoreUsersList />
      </TabsContent>
    </Tabs>
  )
}
