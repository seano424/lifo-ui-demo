'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { StoreUsersList } from '@/components/store-users/store-users-list'
import UserAccountInformation from '@/components/account/user-account-information'
// import { EmailTestComponent } from '@/components/debug/email-test'

export default function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('store')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
