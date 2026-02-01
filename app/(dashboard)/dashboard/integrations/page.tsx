/**
 * Integrations Hub Page
 * Displays available third-party integrations and their connection status
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, Settings, RefreshCw, Trash2 } from 'lucide-react'
import Image from 'next/image'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import {
  useSquareStatus,
  useSyncSquareCatalog,
  useSyncSquareInventory,
} from '@/hooks/use-square-integration'
import { DisconnectSquareDialog } from '@/components/integrations/disconnect-square-dialog'
import { SyncErrorAlert } from '@/components/integrations/sync-error-alert'
import { useStoreState } from '@/lib/stores/store-context'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'

export default function IntegrationsPage() {
  const router = useRouter()
  const t = useTranslations('integrations.square')
  const { activeStore } = useStoreState()
  // const [activeTab, setActiveTab] = useState<'integrations' | 'connections'>('integrations')
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<Error | null>(null)

  // Fetch Square connection status
  const { data: squareStatus, isLoading: isLoadingSquare } = useSquareStatus()
  const syncCatalogMutation = useSyncSquareCatalog()
  const syncInventoryMutation = useSyncSquareInventory()

  const isConnected = squareStatus?.is_connected || false
  const stores = squareStatus?.stores || []
  const connectionId = squareStatus?.connection_id

  const handleSquareConnect = () => {
    router.push('/dashboard/integrations/square/connect')
  }

  const handleManage = (integrationId: string) => {
    if (integrationId === 'square') {
      router.push('/dashboard/integrations/square')
    }
  }

  const handleToggleExpand = (integrationId: string) => {
    setExpandedIntegration(prev => (prev === integrationId ? null : integrationId))
  }

  const handleSyncNow = async () => {
    if (!connectionId) return

    // Clear previous errors
    setSyncError(null)

    try {
      // Sync both catalog and inventory
      await syncCatalogMutation.mutateAsync({ connectionId, fullSync: false })
      await syncInventoryMutation.mutateAsync({ connectionId, fullSync: false })
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncError(error instanceof Error ? error : new Error('Sync failed'))
    }
  }

  const handleRetrySync = () => {
    handleSyncNow()
  }

  const handleDismissError = () => {
    setSyncError(null)
  }

  const isSyncing = syncCatalogMutation.isPending || syncInventoryMutation.isPending

  return (
    <div className="flex flex-col gap-6 container py-6 lg:py-8">
      <DashboardInsetHeader page="integrations" />

      {/* Active Section */}
      <div className="flex flex-col border border-border rounded-xl overflow-hidden">
        <div className="p-4 flex flex-col gap-4">
          <Typography variant="h5">Active</Typography>
          {/* Tabs */}
          {/* <div className="flex gap-6">
            <Button
              onClick={() => setActiveTab('integrations')}
              className={`pb-3 px-0 rounded-none hover:bg-transparent hover:text-gray-900 transition-colors relative ${activeTab === 'integrations'
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              variant="ghost"
            >
              Integrations
              {activeTab === 'integrations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-900/30" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('connections')}
              className={`pb-3 rounded-none transition-colors relative flex items-center hover:bg-transparent hover:text-gray-900 gap-2 ${activeTab === 'connections'
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Third party connections
              {activeTab === 'connections' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </Button>
          </div> */}

          <Typography variant="p">
            Integrations connect your external applications to unlock more ways to manage your
            inventory
          </Typography>
        </div>

        {/* Integrations */}
        <div className="divide-y divide-border border-t border-border">
          {/* Not Loading State */}
          {isLoadingSquare && (
            <div className="overflow-x-auto scrollbar-none">
              <div className="p-4 grid grid-cols-12 gap-4 w-[1200px] md:w-full md:min-w-max items-center">
                {/* left side */}
                <div className="flex items-center gap-4 col-span-3">
                  <div className="w-10 h-10 animate-pulse-slow rounded-lg bg-card shrink-0" />
                  <div className="h-4 w-20 animate-pulse rounded bg-card" />
                </div>

                {/* middle */}
                <div className="col-span-6">
                  <div className="h-4 w-full animate-pulse rounded bg-card" />
                </div>

                {/* right side */}
                <div className="flex items-center gap-5 col-span-3 justify-end">
                  <div className="h-4 w-24 animate-pulse-slow rounded bg-card" />
                  <div className="w-5 h-5 animate-pulse rounded bg-card shrink-0" />
                </div>
              </div>
            </div>
          )}

          {/* Not Connected State */}
          {!isLoadingSquare && !isConnected && (
            <div className="overflow-x-auto scrollbar-none">
              <div
                className="p-4 hover:bg-muted transition-colors cursor-pointer grid grid-cols-12 gap-4 w-[1200px] md:w-full md:min-w-max items-center"
                onClick={handleSquareConnect}
              >
                {/* left side */}
                <div className="flex items-center gap-4 col-span-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Image src="/square/square-icon.svg" alt="Square" width={20} height={20} />
                  </div>
                  <Typography variant="p">Square</Typography>
                </div>

                {/* middle */}
                <div className="col-span-6">
                  <Typography variant="p">{t('description')}</Typography>
                </div>

                {/* right side */}
                <div className="flex items-center gap-5 col-span-3 justify-end">
                  <Typography variant="p">{t('connect')}</Typography>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${
                      expandedIntegration === 'square' ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Connected Integrations */}
          {!isLoadingSquare && isConnected && (
            <div className="divide-y divide-border overflow-x-auto scrollbar-none">
              <div
                className="p-4 hover:bg-muted transition-colors cursor-pointer grid grid-cols-12 gap-4 w-[1200px] md:w-full md:min-w-max items-center"
                onClick={() => handleToggleExpand('square')}
              >
                {/* left side */}
                <div className="flex items-center gap-4 col-span-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Image src="/square/square-icon.svg" alt="Square" width={20} height={20} />
                  </div>
                  <Typography variant="p">Square</Typography>
                </div>

                {/* middle */}
                <div className="col-span-6">
                  <Typography variant="p">{t('description')}</Typography>
                </div>

                {/* right side */}
                <div className="flex items-center gap-5 col-span-3 justify-end">
                  <Typography variant="p">{t('connected')}</Typography>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${
                      expandedIntegration === 'square' ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {expandedIntegration === 'square' && stores.length > 0 && (
                <div className="px-4 pb-4 flex flex-col gap-8">
                  {/* Error Alert */}
                  {syncError && (
                    <div className="pt-4">
                      <SyncErrorAlert
                        error={syncError}
                        onRetry={handleRetrySync}
                        onDismiss={handleDismissError}
                        isRetrying={isSyncing}
                      />
                    </div>
                  )}

                  <div className={syncError ? 'flex flex-col gap-3' : 'pt-4 flex flex-col gap-3'}>
                    {stores.map(store => {
                      const isCurrentStore = activeStore?.store_id === store.store_id

                      return (
                        <div key={store.store_id} className="flex items-center justify-between p-2">
                          <div>
                            <Typography variant="p">{store.store_name}</Typography>
                            <Typography variant="muted">
                              Location ID: {store.location_id}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs text-foreground">
                              {store.connection_status}
                            </Badge>
                            {isCurrentStore && (
                              <Badge variant="default" className="text-xs text-foreground">
                                {t('currentLocation')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleManage('square')} variant="outline">
                        <Settings className="w-4 h-4" />
                        Manage
                      </Button>
                      <Button onClick={handleSyncNow} disabled={isSyncing}>
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync now'}
                      </Button>
                    </div>
                    <DisconnectSquareDialog
                      connectionId={connectionId}
                      trigger={
                        <Button variant="ghost">
                          <Trash2 className="w-4 h-4" />
                          Disconnect
                        </Button>
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
