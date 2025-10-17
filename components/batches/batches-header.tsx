'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function BatchesHeader() {
  const t = useTranslations('dashboardNav.pages')
  const tDesc = useTranslations('dashboardNav.descriptions')
  const tButtons = useTranslations('buttons')

  const pageTitle = t('batches')
  const pageDescription = tDesc('batches')

  return (
    <DashboardInsetHeader
      title={pageTitle}
      description={pageDescription}
      rightContent={
        <div className="flex gap-2">
          <Link href="/dashboard/deliveries">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tButtons('addBatch')}
            </Button>
          </Link>
        </div>
      }
    />
  )
}
