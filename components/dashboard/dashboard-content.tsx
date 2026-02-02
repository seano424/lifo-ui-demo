'use client'

import { useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DeliveryBanner } from './delivery-banner'
import { StatCards } from './stat-cards/stat-cards'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import { CoverageBar } from './coverage-bar'
import { AutomationCard } from './automation-card'
import { Typography } from '../ui/typography'
import { Button } from '../ui/button'
import { ChevronRight } from 'lucide-react'

export function DashboardContent() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const daysFilter = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

  return (
    <div className="flex flex-col gap-8 pb-80 animate-in fade-in-0 duration-1000">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <DeliveryBanner />
      <StatCards daysFilter={daysFilter} />
      <div className="border border-muted rounded-2xl">
        <div className="flex items-center justify-between border-b border-muted p-4">
          <div className="flex flex-col gap-1">
            <Typography variant="h4">Expiring Soon</Typography>
            <Typography variant="p" color="muted">
              Batches closest to their expiry date
            </Typography>
          </div>
          <Button
            variant="subtle"
            asLink
            href="/dashboard/inventory/batches"
            className="gap-2 flex items-center"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

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
      </div>
      <CoverageBar />
      <AutomationCard />
    </div>
  )
}
