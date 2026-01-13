'use client'

import { NotificationCount } from '@/components/notifications/notification-count'
import { buttonVariants } from '@/components/ui/button'
import { useUrgentTodosCount } from '@/hooks/use-urgent-todos-count'
import { cn } from '@/lib/utils'
import { BellIcon } from 'lucide-react'
import Link from 'next/link'

interface NotificationBellProps {
  className?: string
  href?: string
}

export function NotificationBell({
  className = 'border rounded-full bg-primary-600',
  href = '/dashboard/expiring-soon',
}: NotificationBellProps) {
  const { count: urgentTodosCount } = useUrgentTodosCount()

  return (
    <div className="relative">
      <Link href={href} className={cn(buttonVariants({ size: 'icon' }), className)}>
        <BellIcon className="w-4 h-4 text-white" />
      </Link>
      <NotificationCount
        count={urgentTodosCount}
        variant="navbar"
        className="absolute -top-1.5 -right-2 z-20 pointer-events-none"
      />
    </div>
  )
}
