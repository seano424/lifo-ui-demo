'use client'

import { cn } from '@/lib/utils'

interface NotificationCountProps {
  count: number
  className?: string
  variant?: 'sidebar' | 'navbar' | 'default'
}

export function NotificationCount({
  count,
  className,
  variant = 'default',
}: NotificationCountProps) {
  if (count <= 0) return null

  const baseClasses = 'flex items-center justify-center rounded-full text-xs font-medium text-white'

  const variantClasses = {
    sidebar: 'h-6 w-6 bg-secondary-900',
    navbar:
      'min-h-7 min-w-7 bg-secondary-900 border border-white p-1 text-[10px] font-medium shadow-lg',
    default: 'h-6 w-6 bg-secondary-900',
  }

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        count > 9 && variant === 'sidebar' && 'w-6 h-6', // Make wider for double digits in sidebar
        count > 9 && variant === 'navbar' && 'px-2', // Add more padding for double digits in navbar
        count > 99 && 'min-h-7 min-w-7', // Add more padding for triple digits in navbar
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
