'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import {
  ChartNoAxesCombined,
  Layers,
  ListTodo,
  Package,
  ScanBarcode,
  ScanSearch,
  SettingsIcon,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

// Function to get the appropriate icon based on the current path
function getPageIcon(pathname: string) {
  // Remove query parameters and normalize path
  const cleanPath = pathname.split('?')[0]

  // Main dashboard pages from sidebar
  if (cleanPath === '/dashboard') return ChartNoAxesCombined
  if (cleanPath.startsWith('/dashboard/inbound')) return ScanSearch
  if (cleanPath.startsWith('/dashboard/outbound')) return ScanBarcode
  if (cleanPath.startsWith('/dashboard/todos')) return ListTodo
  if (cleanPath.startsWith('/dashboard/inventory/products')) return Package
  if (cleanPath.startsWith('/dashboard/inventory/batches')) return Layers
  if (cleanPath.startsWith('/dashboard/settings')) return SettingsIcon

  // Default fallback
  return ChartNoAxesCombined
}

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
  const pathname = usePathname()
  const PageIcon = useMemo(() => getPageIcon(pathname), [pathname])

  return (
    <div className="relative animate-in fade-in-0 slide-in-from-top-4 duration-700">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 rounded-3xl -z-10" />

      <div
        className={cn(
          'relative flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center p-8 rounded-3xl border border-border/50 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5',
          className,
        )}
      >
        <div className="flex flex-col gap-4 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="w-[400px] h-12 bg-gray-50 rounded-2xl" />
              <Skeleton className="w-[300px] h-6 bg-gray-50 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Main title with dynamic icon */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <PageIcon className="h-6 w-6" />
                </div>
                <Typography
                  variant="h1"
                  className="font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent capitalize pb-2"
                >
                  {title}
                </Typography>
              </div>

              {description && (
                <Typography className="max-w-5xl text-muted-foreground leading-relaxed" variant="p">
                  {description}
                </Typography>
              )}
            </>
          )}
        </div>

        {/* Right content with enhanced styling */}
        {rightContent && <div className="flex items-center gap-3">{rightContent}</div>}
      </div>
    </div>
  )
}
