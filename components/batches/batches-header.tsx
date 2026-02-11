'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { useTranslations } from 'next-intl'

export default function BatchesHeader() {
  const t = useTranslations('dashboardNav.pages')
  const tDesc = useTranslations('dashboardNav.descriptions')

  const pageTitle = t('batches')
  const pageDescription = tDesc('batches')

  return <DashboardInsetHeader title={pageTitle} description={pageDescription} />
}
