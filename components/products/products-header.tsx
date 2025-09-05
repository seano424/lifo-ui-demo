'use client'

import { Download, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'

export default function ProductsHeader() {
  const t = useTranslations('dashboardNav.pages')
  const tDesc = useTranslations('dashboardNav.descriptions')
  const tButtons = useTranslations('buttons')

  const pageTitle = t('products')
  const pageDescription = tDesc('products')
  return (
    <DashboardInsetHeader
      title={pageTitle}
      description={pageDescription}
      rightContent={
        <div className="flex gap-2">
          <Button onClick={() => alert('Todo: Export products')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {tButtons('export')}
          </Button>
          <Button onClick={() => alert('Todo: Add product')}>
            <Plus className="mr-2 h-4 w-4" />
            {tButtons('addProduct')}
          </Button>
        </div>
      }
    />
  )
}
