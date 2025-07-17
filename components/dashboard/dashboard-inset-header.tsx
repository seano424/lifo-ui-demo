import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export default function DashboardInsetHeader({
  title,
  description,
  rightContent,
  className,
}: {
  title: string
  description?: string
  rightContent?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex justify-between items-center capitalize', className)}>
      <div className="flex flex-col gap-1">
        <Typography variant="h1">{title}</Typography>
        {description && (
          <Typography variant="p" color="muted">
            {description}
          </Typography>
        )}
      </div>
      {rightContent && rightContent}
    </div>
  )
}
