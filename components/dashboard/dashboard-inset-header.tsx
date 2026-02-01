'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Typography } from '../ui/typography'

export default function DashboardInsetHeader({
  page,
  title,
  description,
  rightContent,
  isLoading,
  className,
}: {
  page?: string
  title?: string
  description?: string
  rightContent?: React.ReactNode
  isLoading?: boolean
  className?: string
}) {
  // Always call hook unconditionally, use fallback page key if not provided
  const t = useTranslations(page || 'dashboard')

  // Use translations if page key is provided, otherwise use direct props
  const displayTitle = page ? t('page.title') : title
  const displayDescription = page ? t('page.description') : description

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {isLoading ? (
        <div className="flex flex-col gap-4 flex-1">
          {/* Title skeleton */}
          <Skeleton className="w-[300px] h-9 rounded-lg animate-pulse" />
          {/* Description skeleton */}
          <Skeleton className="w-[500px] h-5 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Typography variant="h3">{displayTitle}</Typography>
          {displayDescription && (
            <Typography variant="p" color="muted">
              {displayDescription}
            </Typography>
          )}
        </div>
      )}

      {/* Right content with enhanced styling */}
      {isLoading ? (
        <div className="flex items-center gap-3">
          <Skeleton className="w-[120px] h-10 rounded-xl animate-pulse" />
          <Skeleton className="w-[100px] h-10 rounded-xl animate-pulse" />
        </div>
      ) : (
        rightContent && <div className="flex flex-wrap items-center gap-3">{rightContent}</div>
      )}
    </div>
  )
}
