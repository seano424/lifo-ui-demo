import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { SettingsIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function DemoSettingsPage() {
  const t = await getTranslations('settings')

  return (
    <div className="flex flex-col gap-6 container py-6">
      <DashboardInsetHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border border-dashed rounded-xl text-muted-foreground">
        <SettingsIcon className="w-10 h-10 opacity-40" />
        <p className="text-sm">Settings are not available in the demo.</p>
      </div>
    </div>
  )
}
