'use client'

import { useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DeliveryBanner } from './delivery-banner'
import { StatCards } from './stat-cards/stat-cards'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import { CoverageBar } from './coverage-bar'
import { AutomationCard } from './automation-card'

export function DashboardContent() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')

  const daysFilter = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in-0 duration-1000">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <DeliveryBanner />
      <StatCards daysFilter={daysFilter} />
      <BatchesFilteredList
        showControls={false}
        highlightExpiring
        initialFilters={{
          filter: 'expiring',
          expiringDays: '30',
          status: 'active',
        }}
      />
      <CoverageBar />
      <AutomationCard />
    </div>
  )
}
