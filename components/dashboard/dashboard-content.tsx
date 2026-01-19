'use client'

// Old components (commented out - kept for potential future use)
// import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
// import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
// import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
// import { QuickActionCards } from '@/components/dashboard/quick-action-cards'

// New simplified components
import { AddDeliveryButton } from '@/components/dashboard/add-delivery-button'
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

        <AddDeliveryButton />
      </div>

      {/* OLD DASHBOARD SECTIONS (Commented out for potential future use) */}
      {/*
      <div className="space-y-6">
        <BatchStatusSummary />

        <div className="border border-border p-4 md:p-6 lg:p-8 rounded-3xl bg-background">
          <QuickActionCards />
        </div>

        <ExpiredItemsSummary />
      </div>

      <div className="relative animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
        <div className="border border-border/50 p-4 md:p-6 lg:p-8 rounded-3xl bg-background">
          <DashboardKPICards />
        </div>
      </div>
      */}
    </div>
  )
}
