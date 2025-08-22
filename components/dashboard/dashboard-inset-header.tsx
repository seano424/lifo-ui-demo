import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-4 justify-between items-center capitalize text-center sm:text-left',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <Skeleton className="w-[400px] h-12 bg-gray-50 rounded-full" />
        ) : (
          <>
            <Typography variant="h2" className="font-bold">
              {title}
            </Typography>
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
