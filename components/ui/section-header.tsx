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
    <div className="flex flex-col  text-center sm:text-left gap-2">
      <div
        className={cn('flex flex-col sm:flex-row sm:justify-between items-center gap-1', className)}
      >
        <Typography variant="h2" className="font-bold">
          {title}
        </Typography>

        <div className="flex items-center flex-shrink-0 gap-2">{rightContent && rightContent}</div>
      </div>
      {description && (
        <Typography variant="p" color="muted">
          {description}
        </Typography>
      )}
    </div>
  )
}
