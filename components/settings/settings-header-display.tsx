'use client'

import { useStoreState } from '@/lib/stores/store-context'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function SettingsHeaderDisplay() {
  const { activeStore } = useStoreState()
  return <DashboardInsetHeader title={`${activeStore?.business_name} Settings`} />
}
