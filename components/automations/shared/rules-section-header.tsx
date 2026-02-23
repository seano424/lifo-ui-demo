import { Typography } from '@/components/ui/typography'

interface RulesSectionHeaderProps {
  title: string
  description: string
}

export function RulesSectionHeader({ title, description }: RulesSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="h4">{title}</Typography>
      <Typography variant="p" color="muted">
        {description}
      </Typography>
    </div>
  )
}
