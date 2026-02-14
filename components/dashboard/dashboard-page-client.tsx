'use client'

import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SettingUpFlow } from '@/components/dashboard/setting-up-flow'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'
import { useUserStores } from '@/hooks/use-stores'
import { useStorePermissions } from '@/hooks/use-store-permissions'

export function DashboardPageClient() {
  // Initialize store loading state early to prevent flash
  useUserStores()

  const progress = useSetupProgress()
  const permissions = useStorePermissions()

  // Show loading skeleton while checking setup progress
  if (progress.isLoading || permissions.isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full container py-6 lg:py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Setup is complete when user has store and batch tracking setup
  const isSetupComplete = progress.hasStore && progress.hasBatchTrackingSetup

  // Only show setup flow for owners and managers who can actually configure batch tracking
  // Employees should skip directly to the dashboard
  const canConfigureBatchTracking = permissions.isOwner || permissions.isManager

  // Show setup flow if not complete AND user has permission to configure it
  if (!isSetupComplete && canConfigureBatchTracking) {
    return <SettingUpFlow />
  }

  // Show main dashboard for:
  // 1. Users who have completed setup
  // 2. Employees who can't configure batch tracking (skip setup flow)
  return (
    <div className="container py-6 lg:py-8">
      <DashboardContent />
    </div>
  )
}
