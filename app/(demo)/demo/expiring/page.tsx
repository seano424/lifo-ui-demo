import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { getTranslations } from 'next-intl/server'

interface Props {
  searchParams: Promise<{
    expiringDays?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }>
}

export default async function DemoExpiringSoonPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('expiring-soon.page')

  return (
    <div className="flex flex-col gap-6 container py-6 min-h-screen">
      <DashboardInsetHeader title={t('title')} description={t('description')} />
      <BatchesFilteredList
        highlightExpiring={true}
        initialFilters={{
          filter: 'expiring',
          expiringDays: params.expiringDays || '30',
          status: params.status || 'active',
          search: params.search,
          sort: params.sort,
          direction: params.direction,
        }}
      />
    </div>
  )
}
