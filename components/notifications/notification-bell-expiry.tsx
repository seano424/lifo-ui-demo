'use client'

import { useExpiryTodosCount } from '@/hooks/use-expiry-todos-count'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export function NotificationBellExpiry() {
  const { count: expiryTodosCount } = useExpiryTodosCount()
  const t = useTranslations('common.aria')

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        asLink
        className="rounded-full border size-10"
        href={'/dashboard/expiring'}
        aria-label={
          expiryTodosCount > 0
            ? t('notificationBellWithCount', { count: expiryTodosCount })
            : t('notificationBell')
        }
      >
        <BellIcon size={16} className="text-gray-700 dark:text-white" />
      </Button>

      {expiryTodosCount > 0 && (
        <div className="absolute top-0 right-0 z-20 pointer-events-none size-3 bg-red-400 rounded-full aspect-square" />
      )}
    </div>
  )
}
