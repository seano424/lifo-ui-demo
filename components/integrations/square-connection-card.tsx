/**
 * Square Connection Card Component
 * Displays Square integration status and provides quick actions
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Square, ExternalLink, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SquareConnectionStatus } from '@/lib/types/integrations'
import { formatDistanceToNow } from 'date-fns'

interface SquareConnectionCardProps {
  status: SquareConnectionStatus | undefined
  isLoading: boolean
  onConnect: () => void
}

export function SquareConnectionCard({ status, isLoading, onConnect }: SquareConnectionCardProps) {
  const router = useRouter()
  const t = useTranslations('integrations.square')

  const isConnected = status?.is_connected || false

  const handleViewDetails = () => {
    router.push('/dashboard/integrations/square')
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Square brand accent */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-black via-gray-800 to-black" />

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black">
              <Square className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('title')}
                {isConnected && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('connected')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ) : isConnected && status ? (
          <>
            <div className="space-y-2 text-sm">
              {status.merchant_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('merchantName')}:</span>
                  <span className="font-medium">{status.merchant_name}</span>
                </div>
              )}
              {status.store_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('storeName')}:</span>
                  <span className="font-medium">{status.store_name}</span>
                </div>
              )}
              {status.last_sync_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('lastSync')}:</span>
                  <span className="text-gray-700">
                    {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {status.connection_status && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('status')}:</span>
                  <Badge variant={status.connection_status === 'active' ? 'default' : 'secondary'}>
                    {status.connection_status}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleViewDetails} variant="default" size="sm" className="flex-1">
                <Settings className="mr-2 h-4 w-4" />
                {t('manage')}
              </Button>
              <Button onClick={handleViewDetails} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">{t('notConnectedDescription')}</p>
            <Button onClick={onConnect} variant="default" size="lg" className="w-full">
              <Square className="mr-2 h-4 w-4" />
              {t('connect')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
