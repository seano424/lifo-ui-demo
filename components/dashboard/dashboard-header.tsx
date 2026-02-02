'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useStoreState } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
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
  const [userName, setUserName] = useState<string>('there')

  // Get current user name
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.user_metadata?.full_name) {
        const firstName = user.user_metadata.full_name.split(' ')[0]
        setUserName(firstName)
      }
    }

    fetchUser()
  }, [])

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
    <div className="flex items-end justify-between">
      {/* Left: Greeting + Store/Date */}
      <div className="flex flex-col gap-2">
        <Typography variant="h2">{t(`greeting.${greetingKey}`, { name: userName })}</Typography>
        <Typography variant="p" color="muted">
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
                ? 'border border-gray-200 bg-white text-gray-900 shadow-sm'
                : 'border border-transparent bg-transparent text-gray-400 hover:border-gray-100 hover:bg-white hover:text-gray-600',
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
