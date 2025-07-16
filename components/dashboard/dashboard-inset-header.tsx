import { Typography } from '@/components/ui/typography'

export default function DashboardInsetHeader({
  title,
  description,
  rightContent,
}: {
  title: string
  description?: string
  rightContent?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center">
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
