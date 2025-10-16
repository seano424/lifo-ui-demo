'use client'

import { Button } from '@/components/ui/button'
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
      {urgentTodosCount > 0 && (
        <span
          className={cn(
            'absolute -top-1.5 -right-2 z-20 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-900 border border-white px-0.5 py-0.5 text-[10px] font-medium text-white shadow-lg',
            urgentTodosCount > 9 && 'px-2', // Add more padding for double digits
          )}
        >
          {urgentTodosCount > 99 ? '99+' : urgentTodosCount}
        </span>
      )}
    </div>
  )
}
