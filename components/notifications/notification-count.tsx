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
    sidebar: 'h-5 w-5 bg-primary-900',
    navbar:
      'min-h-5 min-w-5 bg-primary-900 border border-white px-0.5 py-0.5 text-[10px] font-medium shadow-lg',
    default: 'h-5 w-5 bg-primary-900',
  }

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        count > 9 && variant === 'sidebar' && 'w-6', // Make wider for double digits in sidebar
        count > 9 && variant === 'navbar' && 'px-2', // Add more padding for double digits in navbar
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
