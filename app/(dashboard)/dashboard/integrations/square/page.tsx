/**
 * Square Integration Management Page
 * Displays connection details and provides sync controls
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, RefreshCw, Square, Package, Boxes, ShoppingCart, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DisconnectSquareDialog } from '@/components/integrations/disconnect-square-dialog'
import {
  useSquareStatus,
  useSyncSquareCatalog,
  useSyncSquareInventory,
  useSyncSquareOrders,
} from '@/hooks/use-square-integration'
import { formatDistanceToNow } from 'date-fns'
import { useEffect } from 'react'
import { useStoreState } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'
import { useStoreActions, useUserStores } from '@/hooks/use-stores'

export default function SquareManagementPage() {
  const router = useRouter()
  const t = useTranslations('integrations.square')

  // Get currently selected store from team switcher
  const { activeStore } = useStoreState()
  const { switchStore, isChangingStore } = useStoreActions()
  const { userStores } = useUserStores()

  // Fetch connection status - contains all necessary connection details
  const { data: squareStatus, isLoading: isLoadingStatus } = useSquareStatus()

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

  // Get connectionId from squareStatus
  const connectionId = squareStatus?.connection_id

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
    await syncOrdersMutation.mutateAsync({
      connectionId,
      daysBack: 7,
      fullSync: false,
    })
  }

  const isAnySync =
    syncCatalogMutation.isPending || syncInventoryMutation.isPending || syncOrdersMutation.isPending

  if (isLoadingStatus) {
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
    <ErrorBoundary>
      <div className="container max-w-5xl space-y-6 py-6 lg:py-8">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/integrations')}
            className="mb-2 min-h-[44px] min-w-[44px]"
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            {t('backToIntegrations')}
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black">
                <Square className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
                <p className="text-sm text-gray-600 sm:text-base">{t('manageSubtitle')}</p>
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
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{t('merchantName')}</p>
                <p className="">{squareStatus.merchant_name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{t('merchantId')}</p>
                <p className="font-mono text-sm">{squareStatus.merchant_id || 'N/A'}</p>
              </div>
            </div>

            {squareStatus.last_sync_at && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  {t('lastSync')}:{' '}
                  <span className=" text-gray-900">
                    {formatDistanceToNow(new Date(squareStatus.last_sync_at), {
                      addSuffix: true,
                    })}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Locations */}
        <Card className="space-y-4">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-800" />
              <CardTitle>{t('connectedLocations')}</CardTitle>
            </div>
            <CardDescription className="px-1">
              {squareStatus.stores?.length === 1
                ? t('connectedLocationsDescriptionSingle')
                : t('connectedLocationsDescription', {
                    count: squareStatus.stores?.length || 0,
                  })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {squareStatus.stores?.map(store => {
                const isCurrentStore = activeStore?.store_id === store.store_id
                const fullStore = userStores.find(us => us.store.store_id === store.store_id)?.store

                const handleSwitchToStore = () => {
                  if (fullStore) {
                    switchStore(fullStore)
                  }
                }

                return (
                  <div
                    key={store.store_id}
                    className={`rounded-3xl border p-4 ${isCurrentStore ? 'border border-primary-50' : 'border-white'}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Typography variant="p">{store.store_name}</Typography>
                          <Badge
                            variant={store.connection_status === 'active' ? 'default' : 'secondary'}
                          >
                            {store.connection_status}
                          </Badge>
                          {isCurrentStore && (
                            <Badge variant="primary">{t('currentLocation')}</Badge>
                          )}
                        </div>
                        <Typography variant="muted" className="font-mono">
                          {t('locationId')}: {store.location_id}
                        </Typography>
                      </div>

                      {!isCurrentStore && fullStore ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSwitchToStore}
                          disabled={isChangingStore}
                          className="min-h-[44px] min-w-[44px] shrink-0"
                        >
                          {t('switchToStore')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="min-h-[44px] min-w-[44px] shrink-0"
                        >
                          {t('currentLocation')}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sync Controls */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Catalog Sync */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-800" />
                <CardTitle className="text-base sm:text-lg">{t('syncCatalog')}</CardTitle>
              </div>
              <CardDescription className="text-sm">{t('syncCatalogDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncCatalog}
                loading={syncCatalogMutation.isPending}
                loadingText={t('syncing')}
                disabled={isAnySync}
                className="w-full min-h-[44px]"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('syncNow')}
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Sync */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary-800" />
                <CardTitle className="text-base sm:text-lg">{t('syncInventory')}</CardTitle>
              </div>
              <CardDescription className="text-sm">{t('syncInventoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncInventory}
                loading={syncInventoryMutation.isPending}
                loadingText={t('syncing')}
                disabled={isAnySync}
                className="w-full min-h-[44px]"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('syncNow')}
              </Button>
            </CardContent>
          </Card>

          {/* Orders Sync */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary-800" />
                <CardTitle className="text-base sm:text-lg">{t('syncOrders')}</CardTitle>
              </div>
              <CardDescription className="text-sm">{t('syncOrdersDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncOrders}
                loading={syncOrdersMutation.isPending}
                loadingText={t('syncing')}
                disabled={isAnySync}
                className="w-full min-h-[44px]"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('syncNow')}
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
    </ErrorBoundary>
  )
}
