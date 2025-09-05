import { useTranslations } from 'next-intl'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function TodosPage() {
  const t = useTranslations('dashboardNav.pages')
  const tDesc = useTranslations('todos')
  return (
    <div className="flex flex-col gap-6">
      <DashboardInsetHeader title={t('todos')} description={tDesc('pageDescription')} />
    </div>
  )
}
