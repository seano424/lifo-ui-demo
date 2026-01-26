'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { ExpiringSoonCard } from '@/components/dashboard/expiring-soon-card'
import { InventoryOverviewCard } from '@/components/dashboard/inventory-overview-card'
import { DraftBatchNotification } from '@/components/draft-batch-notification'
import { useStoreState } from '@/lib/stores/store-context'
import { useTranslations } from 'next-intl'

export function DashboardContent() {
  const t = useTranslations('dashboardNav')
  const { activeStore } = useStoreState()

  return (
    <div className="flex flex-col gap-8 pb-8 animate-in fade-in-0 duration-1000">
      {/* Enhanced Header */}
      <DashboardInsetHeader
        title={t('titles.dashboard')}
        description={t('descriptions.dashboard')}
      />

      {/* Draft Batch Notification */}
      <DraftBatchNotification variant="full" />

      {/* Simplified Dashboard */}
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6">
          <ExpiringSoonCard storeId={activeStore?.store_id || null} />

          <InventoryOverviewCard storeId={activeStore?.store_id || null} />
        </div>
      </div>
    </div>
  )
}
