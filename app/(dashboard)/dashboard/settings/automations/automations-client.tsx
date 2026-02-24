'use client'

import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { useActiveStoreId } from '@/lib/stores/store-context'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { AutomationRulesTable } from '@/components/automations/automation-rules-table'

export default function AutomationsClient() {
  const storeId = useActiveStoreId()
  const { data: rules = [], isLoading } = useAutomationRules()

  return (
    <div className="flex flex-col gap-6 pb-12 container py-8">
      <DashboardInsetHeader
        title="Automations"
        description="We calculate expiry dates from the delivery date + shelf life you set. Nothing to enter on delivery."
      />

      <AutomationRulesTable rules={rules} isLoading={isLoading || !storeId} />
    </div>
  )
}
