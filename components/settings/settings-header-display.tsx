'use client'

import { useStoreState } from '@/lib/stores/store-context'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function SettingsHeaderDisplay() {
  const { activeStore, isLoadingStores, isChangingStore } = useStoreState()

  if (isLoadingStores || isChangingStore || !activeStore?.business_name) {
    return <DashboardInsetHeader title="Loading..." isLoading={true} />
  }

  return <DashboardInsetHeader title={`${activeStore?.business_name} Settings`} />
}
