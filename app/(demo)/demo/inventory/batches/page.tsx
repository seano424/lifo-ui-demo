import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { getTranslations } from 'next-intl/server'

interface Props {
  searchParams: Promise<{
    filter?: string
    expiringDays?: string
    status?: string
    search?: string
    sort?: string
    direction?: string
  }>
}

export default async function DemoBatchesPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('inventory.batches.page')

  return (
    <div className="flex flex-col gap-6 container py-6">
      <DashboardInsetHeader title={t('title')} description={t('description')} />
      <BatchesFilteredList
        highlightExpiring={true}
        initialFilters={{
          filter: params.filter,
          expiringDays: params.expiringDays,
          status: params.status,
          search: params.search,
          sort: params.sort,
          direction: params.direction,
        }}
      />
    </div>
  )
}
