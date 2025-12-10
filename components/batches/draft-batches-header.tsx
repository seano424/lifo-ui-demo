'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { useTranslations } from 'next-intl'

export default function DraftBatchesHeader() {
  const t = useTranslations('inventory.batches.draftBatches')

  const pageTitle = 'Draft Batches'
  const pageDescription = t('draftBatchWarning')

  return <DashboardInsetHeader title={pageTitle} description={pageDescription} />
}
