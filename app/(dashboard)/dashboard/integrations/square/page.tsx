/**
 * Square Integration Management Page
 * Displays connection details and provides sync controls
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, RefreshCw, Square, Package, Boxes, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DisconnectSquareDialog } from '@/components/integrations/disconnect-square-dialog'
import {
  useSquareStatus,
  useSquareConnections,
  useSyncSquareCatalog,
  useSyncSquareInventory,
  useSyncSquareOrders,
} from '@/hooks/use-square-integration'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { formatDistanceToNow } from 'date-fns'
import { useEffect } from 'react'

export default function SquareManagementPage() {
  const router = useRouter()
  const t = useTranslations('integrations.square')
  const activeStoreId = useActiveStoreId()

  // Fetch connection status and details
  const { data: squareStatus, isLoading: isLoadingStatus } = useSquareStatus()
  const { data: connections, isLoading: isLoadingConnections } = useSquareConnections(activeStoreId)

  // Sync mutations
  const syncCatalogMutation = useSyncSquareCatalog()
  const syncInventoryMutation = useSyncSquareInventory()
  const syncOrdersMutation = useSyncSquareOrders()

  // Redirect if not connected
  useEffect(() => {
    if (!isLoadingStatus && !squareStatus?.is_connected) {
      router.push('/dashboard/integrations/square/connect')
    }
  }, [squareStatus, isLoadingStatus, router])

  // Get connectionId from squareStatus (which doesn't require activeStoreId)
  // This handles Square-first onboarding where store might not be set as active yet
  const connectionId = squareStatus?.connection_id || connections?.connections?.[0]?.connection_id

  const handleSyncCatalog = async () => {
    if (!connectionId) return
    await syncCatalogMutation.mutateAsync({ connectionId, fullSync: false })
  }

  const handleSyncInventory = async () => {
    if (!connectionId) return
    await syncInventoryMutation.mutateAsync({ connectionId, fullSync: false })
  }

  const handleSyncOrders = async () => {
    if (!connectionId) return
    await syncOrdersMutation.mutateAsync({ connectionId, daysBack: 7, fullSync: false })
  }

  const isAnySync =
    syncCatalogMutation.isPending || syncInventoryMutation.isPending || syncOrdersMutation.isPending

  if (isLoadingStatus || isLoadingConnections) {
    return (
      <div className="container max-w-5xl space-y-6 py-6 lg:py-8">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!squareStatus?.is_connected) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="container max-w-5xl space-y-6 py-6 lg:py-8">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/integrations')}
          className="mb-2"
        >
          <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
          {t('backToIntegrations')}
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black">
              <Square className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-gray-600">{t('manageSubtitle')}</p>
            </div>
          </div>

          {connectionId && <DisconnectSquareDialog connectionId={connectionId} />}
        </div>
      </div>

      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('connectionDetails')}</CardTitle>
          <CardDescription>{t('connectionDetailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t('merchantName')}</p>
              <p className="font-medium">{squareStatus.merchant_name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t('storeName')}</p>
              <p className="font-medium">{squareStatus.store_name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t('merchantId')}</p>
              <p className="font-mono text-sm">{squareStatus.merchant_id || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t('status')}</p>
              <Badge
                variant={squareStatus.connection_status === 'active' ? 'default' : 'secondary'}
              >
                {squareStatus.connection_status || 'unknown'}
              </Badge>
            </div>
          </div>

          {squareStatus.last_sync_at && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-600">
                {t('lastSync')}:{' '}
                <span className="font-medium text-gray-900">
                  {formatDistanceToNow(new Date(squareStatus.last_sync_at), { addSuffix: true })}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Catalog Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-lg">{t('syncCatalog')}</CardTitle>
            </div>
            <CardDescription>{t('syncCatalogDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncCatalog}
              loading={syncCatalogMutation.isPending}
              disabled={isAnySync}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {syncCatalogMutation.isPending ? t('syncing') : t('syncNow')}
            </Button>
          </CardContent>
        </Card>

        {/* Inventory Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-lg">{t('syncInventory')}</CardTitle>
            </div>
            <CardDescription>{t('syncInventoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncInventory}
              loading={syncInventoryMutation.isPending}
              disabled={isAnySync}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {syncInventoryMutation.isPending ? t('syncing') : t('syncNow')}
            </Button>
          </CardContent>
        </Card>

        {/* Orders Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-lg">{t('syncOrders')}</CardTitle>
            </div>
            <CardDescription>{t('syncOrdersDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncOrders}
              loading={syncOrdersMutation.isPending}
              disabled={isAnySync}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {syncOrdersMutation.isPending ? t('syncing') : t('syncNow')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('needHelp')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>{t('helpDescription')}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('helpPoint1')}</li>
            <li>{t('helpPoint2')}</li>
            <li>{t('helpPoint3')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
