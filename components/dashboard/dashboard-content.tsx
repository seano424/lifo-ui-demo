'use client'

import { useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DeliveryBanner } from './delivery-banner'
import { StatCards } from './stat-cards/stat-cards'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import { CoverageBar } from './coverage-bar'
import { AutomationCard } from './automation-card'

export function DashboardContent() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const daysFilter = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

  return (
    <div className="flex flex-col gap-6 pb-80 animate-in fade-in-0 duration-1000">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <DeliveryBanner />
      <StatCards daysFilter={daysFilter} />
      <BatchesFilteredList
        showControls={false}
        highlightExpiring
        expiringDays={daysFilter}
        initialFilters={{
          filter: 'expiring',
          expiringDays: daysFilter.toString(),
          status: 'active',
        }}
      />
      <CoverageBar />
      <AutomationCard />
    </div>
  )
}
