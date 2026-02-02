'use client'

import { Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'
import { Badge } from '../ui/badge'

export function AutomationCard() {
  const t = useTranslations('dashboard.redesign.automation')
  const { data: rules, isLoading } = useAutomationRules()

  // Loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-3 w-32" />
        </div>
        <div className="px-6 py-4">
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    )
  }

  const activeRules = rules?.filter(r => r.status === 'active') || []
  const totalProducts = rules?.reduce((sum, r) => sum + r.products_count, 0) || 0
  const hasRules = rules && rules.length > 0

  // Empty state - no automation rules configured
  if (!hasRules) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center text-center">
          <Settings className="mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
          <Typography variant="h4">{t('emptyState.title')}</Typography>
          <Typography variant="p" color="muted">
            {t('emptyState.description')}
          </Typography>
          <Link
            href="/dashboard/settings/automation"
            className="transition-colors hover:text-gray-900"
          >
            {t('addRule')}
          </Link>
        </div>
      </Card>
    )
  }

  // Active state - show rules summary and list
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <Typography variant="h4">{t('title')}</Typography>
          <Typography variant="p" color="muted">
            {t('subtitle')}
          </Typography>
        </div>
        <Link
          href="/dashboard/settings/automation"
          className="flex items-center gap-1 transition-colors hover:text-gray-900"
        >
          <Typography variant="p" color="muted">
            {t('manage')}
          </Typography>
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Summary Stats Row */}
      <div className="flex items-center gap-6 border-b border-gray-50 px-6 py-4">
        <div>
          <Typography variant="h3">{activeRules.length}</Typography>
          <Typography variant="p" color="muted">
            {t('activeRules')}
          </Typography>
        </div>
        <div className="h-8 w-px bg-gray-100" />
        <div>
          <Typography variant="h3">{totalProducts}</Typography>
          <Typography variant="p" color="muted">
            {t('productsCovered')}
          </Typography>
        </div>
      </div>

      {/* Rules List */}
      <div className="divide-y divide-gray-50">
        {rules.map(rule => (
          <div
            key={rule.rule_id}
            className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  rule.status === 'active' ? 'bg-gray-900' : 'bg-gray-300',
                )}
              />
              <div className="flex gap-2">
                <Typography variant="p" color="default">
                  {rule.name}
                </Typography>
                <Typography variant="small" color="muted">
                  {t(`ruleTypes.${rule.type}`)} · {rule.products_count} items
                </Typography>
              </div>
            </div>
            <Badge variant={rule.status === 'active' ? 'primary' : 'danger'}>
              {t(`ruleStatus.${rule.status}`)}
            </Badge>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-3">
        <Typography variant="p">
          <Link href="/dashboard/settings/automation" className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('addRule')}
          </Link>
        </Typography>
      </div>
    </Card>
  )
}
