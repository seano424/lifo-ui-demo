'use client'

import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SettingUpFlow } from '@/components/dashboard/setting-up-flow'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'

export function DashboardPageClient() {
  const progress = useSetupProgress()

  // Show loading skeleton while checking setup progress
  if (progress.isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Setup is complete when user has store, batches, and notifications configured
  const isSetupComplete = progress.hasStore && progress.hasBatches && progress.hasNotifications

  // Show setup flow if not complete - the flow handles which step to show
  if (!isSetupComplete) {
    return <SettingUpFlow />
  }

  // Show main dashboard once setup is complete
  return (
    <div className="container md:py-6 lg:py-8">
      <DashboardContent />
    </div>
  )
}
