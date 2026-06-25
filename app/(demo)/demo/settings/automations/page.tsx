import { AutomationCard } from '@/components/dashboard/automation-card'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { getTranslations } from 'next-intl/server'

export default async function DemoAutomationsPage() {
  const tNav = await getTranslations('navigation')
  const tAutomation = await getTranslations('dashboard.redesign.automation')

  return (
    <div className="flex flex-col gap-6 container py-6">
      <DashboardInsetHeader title={tNav('automations')} description={tAutomation('subtitle')} />
      <AutomationCard showLinks={false} />
    </div>
  )
}
