'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { AutomationCard } from '@/components/dashboard/automation-card'

export default function AutomationsClient() {
  return (
    <div className="flex flex-col gap-6 pb-12 container py-8">
      <DashboardInsetHeader
        title="Automations"
        description="We calculate expiry dates from the delivery date + shelf life you set. Nothing to enter on delivery."
      />

      <AutomationCard showLinks={false} />
    </div>
  )
}
