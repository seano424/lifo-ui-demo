import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { getTranslations } from 'next-intl/server'
import { Zap } from 'lucide-react'

export default async function DemoIntegrationsPage() {
  const tNav = await getTranslations('navigation')

  return (
    <div className="flex flex-col gap-6 container py-6 lg:py-8">
      <DashboardInsetHeader page="integrations" />
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border border-dashed rounded-xl text-muted-foreground">
        <Zap className="w-10 h-10 opacity-40" />
        <p className="text-sm">Integrations are not available in the demo.</p>
      </div>
    </div>
  )
}
