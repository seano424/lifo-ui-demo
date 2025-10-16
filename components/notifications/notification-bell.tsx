'use client'

import { NotificationCount } from '@/components/notifications/notification-count'
import { Button } from '@/components/ui/button'
import { useUrgentTodosCount } from '@/hooks/use-urgent-todos-count'
import { BellIcon } from 'lucide-react'
import Link from 'next/link'

interface NotificationBellProps {
  className?: string
  href?: string
}

export function NotificationBell({
  className = 'border rounded-full bg-primary-600',
  href = '/dashboard/todos',
}: NotificationBellProps) {
  const { count: urgentTodosCount } = useUrgentTodosCount()

  return (
    <div className="relative">
      <Button size="icon" className={className} asChild>
        <Link href={href}>
          <BellIcon className="w-4 h-4 text-white" />
        </Link>
      </Button>
      <NotificationCount
        count={urgentTodosCount}
        variant="navbar"
        className="absolute -top-1.5 -right-2 z-20"
      />
    </div>
  )
}
