'use client'

import { useTranslations } from 'next-intl'
import { useStoreState } from '@/lib/stores/store-context'
import { useCurrentUser } from '@/hooks/use-users'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'
import { Button } from '../ui/button'

interface DashboardHeaderProps {
  timeRange: '7d' | '30d' | '90d'
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void
}

export function DashboardHeader({ timeRange, onTimeRangeChange }: DashboardHeaderProps) {
  const t = useTranslations('dashboard.redesign.header')
  const { activeStore } = useStoreState()
  const { data: currentUser, isLoading } = useCurrentUser()

  // Extract first name from full_name, with fallback to 'there'
  const userName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'there'

  // Determine greeting based on time of day
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  // Format date
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeButtons = [
    { key: '7d' as const, label: t('timeRange.7d') },
    { key: '30d' as const, label: t('timeRange.30d') },
    { key: '90d' as const, label: t('timeRange.90d') },
  ]

  return (
    <div className="flex-col gap-4 items-center justify-center sm:flex-row flex sm:items-end sm:justify-between">
      {/* Left: Greeting + Store/Date */}
      <div className="flex flex-col gap-2 text-center sm:text-left">
        {!isLoading ? (
          <Typography variant="h2">{t(`greeting.${greetingKey}`, { name: userName })}</Typography>
        ) : (
          <Typography variant="h2" className="opacity-0">
            Loading...
          </Typography>
        )}
        <Typography variant="p" color="muted" className="max-w-xs sm:max-w-none mx-auto sm:mx-0">
          {activeStore?.store_name} · {formattedDate}
        </Typography>
      </div>

      {/* Right: Time Range Buttons */}
      <div className="flex items-center gap-1.5">
        {timeButtons.map(btn => (
          <Button
            key={btn.key}
            variant="outline"
            onClick={() => onTimeRangeChange(btn.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 transition-colors',
              timeRange === btn.key
                ? 'border-none border-gray-200 bg-white text-gray-900 shadow-sm dark:border-primary-300 dark:bg-primary-900 dark:text-primary-100'
                : 'border-none border-transparent bg-transparent text-gray-400 hover:border-gray-100 hover:bg-white hover:text-gray-600 dark:border-gray-800 dark:bg-secondary-900/10 dark:text-secondary-100 dark:hover:border-gray-700 dark:hover:bg-secondary-900/20 dark:hover:text-secondary-100',
            )}
          >
            <Typography variant="p" color="default">
              {btn.label}
            </Typography>
          </Button>
        ))}
      </div>
    </div>
  )
}
