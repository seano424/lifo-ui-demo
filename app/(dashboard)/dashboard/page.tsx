import { getTranslations } from 'next-intl/server'

import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { createClient } from '@/lib/supabase/server'
import { fetchBatchesPage } from '@/lib/queries/batches'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'

export default async function DashboardPage() {
  const activeStoreId = await getActiveStoreCookie()

  // Show welcome screen if no active store selected
  if (!activeStoreId) {
    return <DashboardWelcome />
  }

  const supabase = await createClient()
  const t = await getTranslations('dashboardNav.pages')

  // Check if user has any batches (lightweight query)
  const { count } = await fetchBatchesPage(
    { page: 0, pageSize: 1 },
    { storeId: activeStoreId },
    supabase,
  )

  const hasBatches = count > 0

  // Show welcome screen if no batches exist
  if (!hasBatches) {
    return <DashboardWelcome />
  }

  return <DashboardContent title={t('dashboard')} />
}
