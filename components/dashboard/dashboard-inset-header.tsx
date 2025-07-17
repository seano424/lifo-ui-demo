import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'

export default function DashboardInsetHeader({
  title,
  description,
  rightContent,
  isLoading,
  className,
}: {
  title: string
  description?: string
  rightContent?: React.ReactNode
  isLoading?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex justify-between items-center capitalize', className)}>
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <Skeleton className="w-[400px] h-12 bg-gray-50 rounded-full" />
        ) : (
          <>
            <Typography variant="h1">{title}</Typography>
            {description && (
              <Typography variant="p" color="muted">
                {description}
              </Typography>
            )}
          </>
        )}
      </div>
      {rightContent && rightContent}
    </div>
  )
}
