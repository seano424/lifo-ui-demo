'use client'

import { Typography } from '@/components/ui/typography'

interface StepHeaderProps {
  title: string
  subtitle?: string
  centered?: boolean
}

/**
 * Reusable step header component for consistent styling
 */
export function StepHeader({ title, subtitle, centered = true }: StepHeaderProps) {
  const containerClasses = centered
    ? 'text-center flex flex-col gap-2 flex flex-col items-center'
    : 'flex flex-col gap-2'

  return (
    <div className={containerClasses}>
      <Typography variant="h1">{title}</Typography>
      {subtitle && (
        <Typography variant="p" color="muted">
          {subtitle}
        </Typography>
      )}
    </div>
  )
}
