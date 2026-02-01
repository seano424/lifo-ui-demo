'use client'

import { NotificationCount } from '@/components/notifications/notification-count'
import { useExpiryTodosCount } from '@/hooks/use-expiry-todos-count'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotificationBellExpiry() {
  const { count: expiryTodosCount } = useExpiryTodosCount()

  return (
    <div className="relative">
      <Button
        size="sm"
        asLink
        variant="secondary"
        href={'/dashboard/expiring'}
        className="rounded-full aspect-square p-2.5 flex items-center justify-center bg-linear-to-br from-secondary-900 via-primary-900 to-transparent"
      >
        <BellIcon size={16} className="text-white" />
      </Button>
      <NotificationCount
        count={expiryTodosCount}
        variant="navbar"
        className="absolute -top-1.5 -right-2 z-20 pointer-events-none"
      />
    </div>
  )
}
