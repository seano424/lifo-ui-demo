'use client'

import { AlertTriangle, Layers, Shield, DollarSign } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCurrency } from '@/hooks/use-currency'
import { useDashboardRedesignSummary } from '@/hooks/use-dashboard-redesign'
import { StatCard } from './stat-card'

interface StatCardsProps {
  daysFilter: 7 | 30 | 90
}

export function StatCards({ daysFilter }: StatCardsProps) {
  const t = useTranslations('dashboard.redesign.stats')
  const currencySymbol = useCurrency()
  const { data, isLoading } = useDashboardRedesignSummary(daysFilter)

  // Show loading skeletons while fetching
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label=""
          value=""
          subtitle=""
          icon={AlertTriangle}
          accentClass="bg-gray-900"
          isLoading
        />
        <StatCard label="" value="" subtitle="" icon={Layers} accentClass="bg-gray-700" isLoading />
        <StatCard label="" value="" subtitle="" icon={Shield} accentClass="bg-gray-700" isLoading />
        <StatCard
          label=""
          value=""
          subtitle=""
          icon={DollarSign}
          accentClass="bg-gray-900"
          isLoading
        />
      </div>
    )
  }

  // Calculate trends and format values
  const expiringDiff = data.expiring_count - data.expiring_count_prev
  const expiringTrend = {
    direction: (expiringDiff < 0 ? 'down' : 'up') as 'up' | 'down',
    value:
      expiringDiff === 0
        ? t('trends.noChange')
        : expiringDiff < 0
          ? t('trends.fewerThanLast', { count: Math.abs(expiringDiff) })
          : t('trends.moreThanLast', { count: Math.abs(expiringDiff) }),
    isPositive: expiringDiff <= 0, // Fewer expiring items is good
  }

  const batchesDiff = data.active_batches - data.active_batches_prev
  const batchesTrend = {
    direction: (batchesDiff < 0 ? 'down' : 'up') as 'up' | 'down',
    value:
      batchesDiff === 0
        ? t('trends.noChange')
        : batchesDiff > 0
          ? t('trends.plusThisWeek', { count: Math.abs(batchesDiff) })
          : t('trends.minusThisWeek', { count: Math.abs(batchesDiff) }),
    isPositive: batchesDiff >= 0, // More batches is generally good
  }

  const coveragePercent = Math.round((data.products_tracked / data.products_total) * 100)
  const coveragePrevPercent = data.coverage_percent_prev || 0
  const coverageDiff = coveragePercent - coveragePrevPercent
  const coverageTrend = {
    direction: (coverageDiff < 0 ? 'down' : 'up') as 'up' | 'down',
    value:
      coverageDiff === 0
        ? t('trends.noChange')
        : coverageDiff > 0
          ? t('trends.plusPercent', { percent: Math.abs(coverageDiff) })
          : t('trends.minusPercent', { percent: Math.abs(coverageDiff) }),
    isPositive: coverageDiff >= 0, // Higher coverage is good
  }

  const valueDiff = data.value_at_risk - data.value_at_risk_prev
  const valueTrend = {
    direction: (valueDiff < 0 ? 'down' : 'up') as 'up' | 'down',
    value:
      valueDiff === 0
        ? t('trends.noChange')
        : valueDiff < 0
          ? t('trends.lessValue', { amount: Math.abs(valueDiff).toFixed(0) })
          : t('trends.moreValue', { amount: Math.abs(valueDiff).toFixed(0) }),
    isPositive: valueDiff <= 0, // Less value at risk is good
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Expiring This Week */}
      <StatCard
        label={t('expiringThisWeek.label')}
        value={data.expiring_count}
        subtitle={t('expiringThisWeek.subtitle', { units: data.expiring_units })}
        trend={expiringTrend}
        icon={AlertTriangle}
        accentClass="bg-gray-900"
      />

      {/* Active Batches */}
      <StatCard
        label={t('activeBatches.label')}
        value={data.active_batches}
        subtitle={t('activeBatches.subtitle', { products: data.active_products })}
        trend={batchesTrend}
        icon={Layers}
        accentClass="bg-gray-700"
      />

      {/* Coverage */}
      <StatCard
        label={t('coverage.label')}
        value={`${coveragePercent}%`}
        subtitle={t('coverage.subtitle', {
          covered: data.products_tracked,
          total: data.products_total,
        })}
        trend={coverageTrend}
        icon={Shield}
        accentClass="bg-gray-700"
      />

      {/* Value at Risk */}
      <StatCard
        label={t('valueAtRisk.label')}
        value={`${currencySymbol}${data.value_at_risk.toFixed(0)}`}
        subtitle={t('valueAtRisk.subtitle')}
        trend={valueTrend}
        icon={DollarSign}
        accentClass="bg-gray-900"
      />
    </div>
  )
}
