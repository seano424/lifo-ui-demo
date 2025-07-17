'use client'

import { useStoreState } from '@/lib/stores/store-context'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import SettingsTabs from './settings-tabs'

export default function SettingsHeaderDisplay() {
  const { activeStore } = useStoreState()
  return (
    <div className="space-y-6">
      <DashboardInsetHeader title={`${activeStore?.business_name} Settings`} />
      <SettingsTabs />
    </div>
  )
}
