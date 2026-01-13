'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import {
  ChartNoAxesCombined,
  HelpCircle,
  Layers,
  ListTodo,
  Package,
  Zap,
  ScanBarcode,
  ScanSearch,
  SettingsIcon,
  Clock,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

// Function to get the appropriate icon based on the current path
function getPageIcon(pathname: string) {
  // Remove query parameters and normalize path
  const cleanPath = pathname.split('?')[0]

  // Main dashboard pages from sidebar
  if (cleanPath === '/dashboard') return ChartNoAxesCombined
  if (cleanPath.startsWith('/dashboard/deliveries')) return ScanSearch
  if (cleanPath.startsWith('/dashboard/scan-out')) return ScanBarcode
  if (cleanPath.startsWith('/dashboard/todos')) return ListTodo
  if (cleanPath.startsWith('/dashboard/expiring-soon')) return Clock
  if (cleanPath.startsWith('/dashboard/inventory/products')) return Package
  if (cleanPath.startsWith('/dashboard/inventory/batches')) return Layers
  if (cleanPath.startsWith('/dashboard/integrations')) return Zap
  if (cleanPath.startsWith('/dashboard/settings')) return SettingsIcon
  if (cleanPath.startsWith('/dashboard/support')) return HelpCircle

  // Default fallback
  return ChartNoAxesCombined
}

export default function DashboardInsetHeader({
  page,
  title,
  description,
  rightContent,
  showIcon = true,
  isLoading,
  className,
}: {
  page?: string
  title?: string
  description?: string
  rightContent?: React.ReactNode
  showIcon?: boolean
  isLoading?: boolean
  className?: string
}) {
  const pathname = usePathname()
  const PageIcon = useMemo(() => getPageIcon(pathname), [pathname])

  // Always call hook unconditionally, use fallback page key if not provided
  const t = useTranslations(page || 'dashboard')

  // Use translations if page key is provided, otherwise use direct props
  const displayTitle = page ? t('page.title') : title
  const displayDescription = page ? t('page.description') : description

  return (
    <div className="relative animate-in fade-in-0 slide-in-from-top-4 duration-700">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 rounded-3xl -z-10" />

      <div
        className={cn(
          'relative flex flex-col lg:flex-row gap-4 md:gap-6 justify-between items-start lg:items-center p-4 md:p-6 lg:p-8 rounded-3xl border border-border/50 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-300 ',
          className,
        )}
      >
        <div className="flex flex-col gap-4 flex-1">
          {isLoading ? (
            <div className="space-y-4">
              {/* Icon and title skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl animate-pulse" />
                <Skeleton className="w-[300px] h-8 rounded-xl animate-pulse" />
              </div>
              {/* Description skeleton */}
              <div className="space-y-2">
                <Skeleton className="w-[500px] h-4 rounded-lg animate-pulse" />
                <Skeleton className="w-[400px] h-4 rounded-lg animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {/* Main title with dynamic icon */}
              <div className="flex items-center gap-2">
                {showIcon && (
                  <div className="p-2 rounded-xl bg-secondary-400/10 text-primary items-center">
                    <PageIcon className="h-6 w-6 text-secondary-900" />
                  </div>
                )}
                <Typography variant="h1" className="capitalize">
                  {displayTitle}
                </Typography>
              </div>

              {displayDescription && (
                <Typography className="max-w-5xl text-muted-foreground leading-relaxed" variant="p">
                  {displayDescription}
                </Typography>
              )}
            </>
          )}
        </div>

        {/* Right content with enhanced styling */}
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-[120px] h-10 rounded-xl animate-pulse" />
            <Skeleton className="w-[100px] h-10 rounded-xl animate-pulse" />
          </div>
        ) : (
          rightContent && <div className="flex items-center gap-3">{rightContent}</div>
        )}
      </div>
    </div>
  )
}
