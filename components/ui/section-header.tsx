import { cn } from '@/lib/utils'
import { Typography } from './typography'

export default function SectionHeader({
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
    <div className={cn('flex justify-between items-center', className)}>
      <div className="flex flex-col gap-2">
        <Typography variant="h2" className="font-bold">
          {title}
        </Typography>
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
