import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'

interface DaysLeftBadgeProps {
  days: number
}

export function DaysLeftBadge({ days }: DaysLeftBadgeProps) {
  const t = useTranslations('dashboard.redesign.expiringTable')

  // Determine urgency styling
  const urgencyStyle =
    days <= 3
      ? 'bg-gray-200 text-gray-900'
      : days <= 7
        ? 'bg-gray-100 text-gray-700'
        : 'bg-gray-100 text-gray-600'

  return (
    <Typography
      variant="p"
      color="default"
      className={cn('inline-flex items-center gap-1 rounded-lg px-2.5 py-1', urgencyStyle)}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {days} {days === 1 ? t('daysLeft.singular') : t('daysLeft.plural')}
    </Typography>
  )
}
