'use client'

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
  const { data } = useDashboardRedesignSummary(daysFilter)

  if (!data) return null

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

  const coveragePercent =
    data.products_total > 0 ? Math.round((data.products_tracked / data.products_total) * 100) : 0
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
          ? t('trends.lessValue', { amount: Math.round(Math.abs(valueDiff)).toLocaleString() })
          : t('trends.moreValue', { amount: Math.round(Math.abs(valueDiff)).toLocaleString() }),
    isPositive: valueDiff <= 0, // Less value at risk is good
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Expiring (label varies by filter) */}
      <StatCard
        label={
          daysFilter === 30
            ? t('expiringThisWeek.label30')
            : daysFilter === 90
              ? t('expiringThisWeek.label90')
              : t('expiringThisWeek.label')
        }
        value={`${t('trends.batches', { count: data.expiring_count })}`}
        subtitle={t('expiringThisWeek.subtitle', { units: data.expiring_units })}
        trend={expiringTrend}
      />

      {/* Act on Today — always pinned to today/overdue, not affected by filter */}
      <StatCard
        label={t('actOnToday.label')}
        value={`${t('trends.batches', { count: data.act_on_today_count })}`}
        subtitle={t('actOnToday.subtitle')}
        href="/dashboard/expiring"
        hrefLabel={t('actOnToday.cta')}
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
      />

      {/* Value at Risk */}
      <StatCard
        label={t('valueAtRisk.label')}
        value={`${currencySymbol}${Math.round(data.value_at_risk).toLocaleString()}`}
        subtitle={t('valueAtRisk.subtitle')}
        trend={valueTrend}
      />
    </div>
  )
}
