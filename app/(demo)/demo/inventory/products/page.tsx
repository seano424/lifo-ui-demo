import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { ProductsFilteredList } from '@/components/products/products-filtered-list'
import { getTranslations } from 'next-intl/server'

interface Props {
  searchParams: Promise<{
    category?: string
    sort?: string
    direction?: string
  }>
}

export default async function DemoProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('inventory.products.page')

  return (
    <div className="flex flex-col gap-6 container py-6">
      <DashboardInsetHeader title={t('title')} description={t('description')} />
      <ProductsFilteredList
        initialFilters={{
          category: params.category,
          sort: params.sort,
          direction: params.direction,
        }}
      />
    </div>
  )
}
