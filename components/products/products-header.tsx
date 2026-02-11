'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { useTranslations } from 'next-intl'

export default function ProductsHeader() {
  const t = useTranslations('dashboardNav.pages')
  const tDesc = useTranslations('dashboardNav.descriptions')

  const pageTitle = t('products')
  const pageDescription = tDesc('products')
  return <DashboardInsetHeader title={pageTitle} description={pageDescription} />
}
