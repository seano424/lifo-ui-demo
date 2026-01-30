'use client'

import { Building2, MapPin, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useStoreState } from '@/lib/stores/store-context'
import { Typography } from '../ui/typography'

// Store type styling
const storeTypeConfig = {
  supermarket: {
    color: 'bg-blue-500 text-blue-50',
    label: 'Supermarket',
    badge: 'bg-blue-100 text-blue-800',
  },
  convenience: {
    color: 'bg-primary-500 text-primary-50',
    label: 'Convenience Store',
    badge: 'bg-primary-100 text-primary-800',
  },
  restaurant: {
    color: 'bg-orange-500 text-orange-50',
    label: 'Restaurant',
    badge: 'bg-orange-100 text-orange-800',
  },
  bakery: {
    color: 'bg-primary text-yellow-50',
    label: 'Bakery',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  butcher: {
    color: 'bg-destructive text-red-50',
    label: 'Butcher',
    badge: 'bg-destructive text-destructive',
  },
  organic: {
    color: 'bg-emerald-500 text-emerald-50',
    label: 'Organic Store',
    badge: 'bg-emerald-100 text-emerald-800',
  },
} as const

interface StoreHeaderDisplayProps {
  variant?: 'compact' | 'full'
  showAddress?: boolean
  className?: string
}

export function StoreHeaderDisplay({
  variant = 'compact',
  showAddress = true,
  className = '',
}: StoreHeaderDisplayProps) {
  const t = useTranslations('common.scanning')
  const { activeStore, isLoadingStores } = useStoreState()

  if (isLoadingStores) {
    return (
      <Card className={`border-0 bg-muted/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 animate-pulse items-center justify-center rounded-2xl bg-muted">
              <Store className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-2xl bg-muted"></div>
              <div className="h-3 w-24 animate-pulse rounded-2xl bg-muted"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activeStore) {
    return (
      <Card className={`border-0 bg-muted/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
              <Store className="size-5" />
            </div>
            <div>
              <p className="">{t('noStoreSelected')}</p>
              <p className="text-sm">{t('pleaseSelectStore')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const storeConfig =
    storeTypeConfig[activeStore.store_type as keyof typeof storeTypeConfig] ||
    storeTypeConfig.supermarket

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`flex size-8 items-center justify-center rounded-2xl ${storeConfig.color}`}>
          <Store className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <Typography variant="h1" color="primary">
            {activeStore.store_name}
          </Typography>
          <div className="flex items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <Typography variant="p" color="muted">
              {activeStore.city}
            </Typography>
            {activeStore.store_type && (
              <Badge variant="secondary" className="ml-1">
                <Typography variant="p" color="muted">
                  {storeConfig.label}
                </Typography>
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={`border-0 bg-linear-to-r from-background to-muted/20 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl ${storeConfig.color}`}
          >
            <Store className="size-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Typography variant="h1" color="primary">
                {activeStore.store_name}
              </Typography>
              {activeStore.store_type && (
                <Badge className={storeConfig.badge}>{storeConfig.label}</Badge>
              )}
            </div>

            {activeStore.business_name && activeStore.business_name !== activeStore.store_name && (
              <div className="flex items-center gap-1">
                <Building2 className="size-4" />
                <Typography variant="p" color="muted">
                  {activeStore.business_name}
                </Typography>
              </div>
            )}

            {showAddress && (activeStore.address || activeStore.city) && (
              <div className="flex items-start gap-1">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  {activeStore.address && (
                    <Typography variant="p" color="muted">
                      {activeStore.address}
                    </Typography>
                  )}
                  {!activeStore.address && activeStore.city && (
                    <Typography variant="p" color="muted">
                      {activeStore.city}, {activeStore.country}
                    </Typography>
                  )}
                  {activeStore.store_code && (
                    <Typography variant="code" color="primary">
                      Store Code: {activeStore.store_code}
                    </Typography>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple hook for components that just need the active store name
export function useActiveStoreName(): string {
  const { activeStore } = useStoreState()
  return activeStore?.store_name || 'No Store Selected'
}
