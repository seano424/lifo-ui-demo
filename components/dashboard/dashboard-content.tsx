'use client'

// Old components (commented out - kept for potential future use)
// import { BatchStatusSummary } from '@/components/dashboard/batch-status-summary'
// import { DashboardKPICards } from '@/components/dashboard/dashboard-kpi-cards'
// import { ExpiredItemsSummary } from '@/components/dashboard/expired-items-summary'
// import { QuickActionCards } from '@/components/dashboard/quick-action-cards'

// New simplified components
import { AddDeliveryButton } from '@/components/dashboard/add-delivery-button'
import { ExpiringSoonCard } from '@/components/dashboard/expiring-soon-card'
import { InventoryOverviewCard } from '@/components/dashboard/inventory-overview-card'
import { Typography } from '@/components/ui/typography'
import { useStoreState } from '@/lib/stores/store-context'
import { useTranslations } from 'next-intl'

export function DashboardContent() {
  const t = useTranslations('dashboard')
  const { activeStore } = useStoreState()

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in-0 duration-500">
      {/* Simple Header */}
      <div className="space-y-2">
        <Typography variant="h1" className="text-2xl md:text-3xl font-bold">
          {activeStore?.store_name || t('title')}
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          {t('subtitle')}
        </Typography>
      </div>

      {/* Primary: Expiring Soon */}
      <ExpiringSoonCard storeId={activeStore?.store_id || null} />

      {/* Secondary: Inventory Overview */}
      <InventoryOverviewCard storeId={activeStore?.store_id || null} />

      {/* CTA: Add Delivery */}
      <AddDeliveryButton />

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
