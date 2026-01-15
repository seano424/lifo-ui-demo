/**
 * Square Connection Card Component
 * Displays Square integration status and provides quick actions
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Settings, MapPin } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { SquareConnectionStatus } from '@/lib/types/integrations'
import { formatDistanceToNow } from 'date-fns'
import { useStoreState } from '@/lib/stores/store-context'

interface SquareConnectionCardProps {
  status?: SquareConnectionStatus
  isLoading: boolean
  onConnect: () => void
}

export function SquareConnectionCard({ status, isLoading, onConnect }: SquareConnectionCardProps) {
  const router = useRouter()
  const t = useTranslations('integrations.square')
  const { activeStore } = useStoreState()

  const isConnected = status?.is_connected || false
  const stores = status?.stores || []
  const hasMultipleLocations = stores.length > 1

  const handleManage = () => {
    router.push('/dashboard/integrations/square')
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded bg-gray-200" />
            <div className="flex-1 space-y-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card
        className="p-6 transition-colors cursor-pointer group hover:bg-gray-50"
        onClick={onConnect}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Image src="/square/square-icon.svg" alt="Square" width={40} height={40} />
            <div>
              <Typography variant="h4" className="font-semibold">
                Square
              </Typography>
              <Typography variant="p" className="text-sm text-muted-foreground">
                {t('description')}
              </Typography>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-fit group-hover:bg-white group-hover:text-primary-900 hover:bg-white hover:text-primary-900 pointer-events-none"
          >
            {t('connect')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="p-6 transition-colors cursor-pointer group hover:bg-gray-50"
      onClick={handleManage}
    >
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/square/square-icon.svg" alt="Square" width={32} height={32} />
            <div className="space-y-1">
              <div className="flex items-center gap-4 flex-wrap">
                <Typography variant="h2">Square</Typography>
                <Badge variant="secondary">{t('connected')}</Badge>
              </div>
              {/* <Typography variant="muted">
                {status?.merchant_name || 'N/A'}
              </Typography> */}
            </div>
          </div>
          <Button
            variant="outline"
            className="sm:w-fit group-hover:bg-white group-hover:text-primary-900 hover:bg-white hover:text-primary-900 pointer-events-none"
          >
            <Settings className="h-4 w-4" />
            {t('manage')}
          </Button>
        </div>

        {/* Connected Locations Section */}
        {stores.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Typography variant="muted">
                {hasMultipleLocations
                  ? t('connectedLocationsDescription', { count: stores.length })
                  : t('connectedLocationsDescriptionSingle')}
              </Typography>
            </div>

            <div className="space-y-4">
              {stores.map(store => {
                const isCurrentStore = activeStore?.store_id === store.store_id

                return (
                  <div
                    key={store.store_id}
                    className={`rounded-3xl shadow-xs border p-4 ${
                      isCurrentStore ? 'border border-primary-50' : 'border border-secondary-50'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Typography variant="p" className="text-sm ">
                            {store.store_name}
                          </Typography>
                          <Badge
                            variant={store.connection_status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {store.connection_status}
                          </Badge>
                          {isCurrentStore && (
                            <Badge variant="primary" className="text-xs">
                              {t('currentLocation')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography variant="muted" className="text-xs font-mono">
                            {t('locationId')}: {store.location_id}
                          </Typography>
                          {store.last_sync_at && (
                            <Typography variant="muted" className="text-xs">
                              {t('lastSync')}:{' '}
                              {formatDistanceToNow(new Date(store.last_sync_at), {
                                addSuffix: true,
                              })}
                            </Typography>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
