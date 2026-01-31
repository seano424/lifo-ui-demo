'use client'

import { filterOptions } from '@/lib/todo-filter-config'
import type { TodoFiltersState } from './types'
import { useTranslations } from 'next-intl'

interface TodoFilterSummaryProps {
  filters: TodoFiltersState
  onClear: () => void
}

export function TodoFilterSummary({ filters, onClear }: TodoFilterSummaryProps) {
  const parts: string[] = []
  const t = useTranslations('todos')
  // Build summary text
  if (filters.urgency_level && filters.urgency_level.length > 0) {
    const labels = filters.urgency_level
      .map(v => filterOptions.urgency_level.find(o => o.value === v)?.label)
      .filter(Boolean)
      .join(', ')
    parts.push(`Urgency: ${labels}`)
  }

  if (filters.action_type && filters.action_type.length > 0) {
    const labels = filters.action_type
      .map(v => filterOptions.action_type.find(o => o.value === v)?.label)
      .filter(Boolean)
      .join(', ')
    parts.push(`Action: ${labels}`)
  }

  if (filters.batch_status && filters.batch_status.length > 0) {
    const labels = filters.batch_status
      .map(v => filterOptions.batch_status.find(o => o.value === v)?.label)
      .filter(Boolean)
      .join(', ')
    parts.push(`Status: ${labels}`)
  }

  if (filters.expiry_range) {
    const label = filterOptions.expiry_range.find(o => o.value === filters.expiry_range)?.label
    if (label) parts.push(`Expiry: ${label}`)
  }

  // No filters = no summary
  if (parts.length === 0) {
    return <span className="text-sm text-foreground ml-2">{t('filters.noFiltersApplied')}</span>
  }

  return (
    <div className="flex items-center gap-3 text-sm ml-2">
      <span className="text-foreground">{parts.join(' • ')}</span>
      <button type="button" onClick={onClear} className="text-violet-600 hover:text-violet-700 ">
        {t('filters.clearAll')}
      </button>
    </div>
  )
}
