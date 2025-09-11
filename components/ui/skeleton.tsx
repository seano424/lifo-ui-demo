import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-gray-50 dark:bg-primary-900 animate-pulse rounded-2xl', className)}
      {...props}
    />
  )
}

export { Skeleton }
