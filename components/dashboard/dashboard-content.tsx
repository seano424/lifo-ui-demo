'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { DashboardHeader } from './dashboard-header'
import { StatCards } from './stat-cards/stat-cards'
import { BatchesFilteredList } from '@/components/batches/batches-filtered-list'
import { CoverageBar } from './coverage-bar'
import { AutomationCard } from './automation-card'
import { AutoTrackingBanner } from './auto-tracking-banner'
import { Typography } from '../ui/typography'
import { Button } from '../ui/button'
import { ChevronRight } from 'lucide-react'

export function DashboardContent() {
  const tNav = useTranslations('navigation')
  const tTable = useTranslations('dashboard.redesign.expiringTable')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const daysFilter = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

  return (
    <div className="flex flex-col gap-10 pb-80 animate-in fade-in-0 transition-all duration-300 ease-in-out min-h-screen">
      <AutoTrackingBanner />
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

      <StatCards daysFilter={daysFilter} />

      <div className="flex items-center justify-between border-b border-muted">
        <div className="flex flex-col gap-1">
          <Typography variant="h4">{tNav('expiringSoon')}</Typography>
          <Typography variant="p" color="muted" className="hidden sm:block">
            {tTable('description')}
          </Typography>
        </div>
        <Button
          variant="ghost"
          asLink
          href="/dashboard/inventory/batches"
          className="gap-2 flex items-center hover:text-secondary dark:hover:text-secondary px-0"
        >
          {tTable('viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <BatchesFilteredList
        showControls={false}
        highlightExpiring
        expiringDays={daysFilter}
        pageSize={500}
        clientSideSort={true}
        clientSideTimeFilter={true}
        initialFilters={{
          filter: 'expiring',
          expiringDays: '90', // Always load 90 days, filter client-side
          status: 'active',
        }}
      />
      <CoverageBar />
      <AutomationCard />
    </div>
  )
}
