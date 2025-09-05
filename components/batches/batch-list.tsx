'use client'

import { AlertTriangle, Calendar, Filter, MapPin, Package, Search, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { BatchCard } from '@/components/batches/batch-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { useBatchActions, useBatches, useBatchesForProduct } from '@/hooks/use-batches'
import type { BatchFilters } from '@/lib/queries/batches'

interface BatchListProps {
  productId?: string // If provided, show batches for specific product
  showFilters?: boolean
  showProductInfo?: boolean
  title?: string
  emptyMessage?: string
  maxItems?: number // For dashboard widgets
}

export function BatchList({
  productId,
  showFilters = true,
  showProductInfo = true,
  title,
  emptyMessage,
  maxItems,
}: BatchListProps) {
  const t = useTranslations('batchList')
  const [filters, setFilters] = useState<BatchFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Use different hooks based on whether we're showing batches for a specific product
  const batchesForProduct = useBatchesForProduct(productId || '', filters)
  const batches = useBatches(filters)
  const batchQuery = productId ? batchesForProduct : batches

  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage } = batchQuery

  const {
    deleteBatch,
    updateBatchQuantity,
    updateBatchPrice,
    updateBatchLocation,
    markBatchAsExpired,
    markBatchAsDamaged,
    markBatchAsSoldOut,
    isDeleting,
    isUpdating,
  } = useBatchActions()

  // Filter data by search term and apply max items limit
  const filteredData = useMemo(() => {
    let result = data || []

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        batch =>
          batch.batch_number.toLowerCase().includes(search) ||
          batch.supplier?.toLowerCase().includes(search) ||
          batch.location_code?.toLowerCase().includes(search),
      )
    }

    // Remove duplicates (just in case)
    result = result.filter(
      (batch, index, self) => self.findIndex(b => b.batch_id === batch.batch_id) === index,
    )

    // Apply max items limit for dashboard widgets
    if (maxItems) {
      result = result.slice(0, maxItems)
    }

    return result
  }, [data, searchTerm, maxItems])

  const updateFilter = (key: keyof BatchFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('errorLoadingBatches')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Typography variant="p" color="muted">
              {error instanceof Error ? error.message : t('unexpectedError')}
            </Typography>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && <Typography variant="h2">{title}</Typography>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={`skeleton-${i + 1}`} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <Typography variant="h2" className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            {title}
          </Typography>
          {data && data.length > 0 && (
            <Badge variant="ghost" className="text-sm">
              {t('currentBatches', { count: filteredData.length })}
            </Badge>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('search')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchBatches')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('status')}</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value: string) => updateFilter('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="expired">{t('expired')}</SelectItem>
                    <SelectItem value="damaged">{t('damaged')}</SelectItem>
                    <SelectItem value="sold_out">{t('soldOut')}</SelectItem>
                    <SelectItem value="reserved">{t('reserved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('expiringSoon')}
                </label>
                <Select
                  value={filters.expiringInDays?.toString() || 'all'}
                  onValueChange={(value: string) =>
                    updateFilter('expiringInDays', value === 'all' ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('allDates')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allDates')}</SelectItem>
                    <SelectItem value="1">{t('expiringInDays', { days: 1 })}</SelectItem>
                    <SelectItem value="3">{t('expiringInDays', { days: 3 })}</SelectItem>
                    <SelectItem value="7">{t('expiringInDays', { days: 7 })}</SelectItem>
                    <SelectItem value="14">{t('expiringInDays', { days: 14 })}</SelectItem>
                    <SelectItem value="30">{t('expiringInDays', { days: 30 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {t('location')}
                </label>
                <Input
                  placeholder={t('locationCode')}
                  value={filters.location_code || ''}
                  onChange={e => updateFilter('location_code', e.target.value || undefined)}
                />
              </div>

              {/* Stock Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('stockStatus')}</label>
                <Select
                  value={
                    filters.hasStock === undefined
                      ? 'all'
                      : filters.hasStock
                        ? 'in_stock'
                        : 'out_of_stock'
                  }
                  onValueChange={(value: string) => {
                    if (value === 'all') updateFilter('hasStock', undefined)
                    else if (value === 'in_stock') updateFilter('hasStock', true)
                    else updateFilter('hasStock', false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('allStockLevels')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStockLevels')}</SelectItem>
                    <SelectItem value="in_stock">{t('inStock')}</SelectItem>
                    <SelectItem value="out_of_stock">{t('outOfStock')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  {t('supplier')}
                </label>
                <Input
                  placeholder={t('supplierName')}
                  value={filters.supplier || ''}
                  onChange={e => updateFilter('supplier', e.target.value || undefined)}
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium opacity-0">{t('clear')}</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({})
                    setSearchTerm('')
                  }}
                  className="w-full"
                >
                  {t('clearFilters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredData.map(batch => (
          <BatchCard
            key={batch.batch_id}
            batch={batch}
            onDelete={() => deleteBatch(batch.batch_id)}
            onUpdateQuantity={newQuantity => updateBatchQuantity(batch.batch_id, newQuantity)}
            onUpdatePrice={(costPrice, sellingPrice) =>
              updateBatchPrice(batch.batch_id, costPrice, sellingPrice)
            }
            onUpdateLocation={locationCode => updateBatchLocation(batch.batch_id, locationCode)}
            onMarkAsExpired={() => markBatchAsExpired(batch.batch_id)}
            onMarkAsDamaged={() => markBatchAsDamaged(batch.batch_id)}
            onMarkAsSoldOut={() => markBatchAsSoldOut(batch.batch_id)}
            isDeleting={isDeleting}
            isUpdating={isUpdating}
            showProductInfo={showProductInfo}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && !maxItems && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? t('loadingMore') : t('loadMoreBatches')}
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {filteredData && filteredData.length > 0 && !maxItems && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            {t('showingBatches', { count: filteredData.length })}
            {data && data.length !== filteredData.length && (
              <span> {t('filteredFrom', { total: data.length })}</span>
            )}
          </Badge>
        </div>
      )}

      {/* Empty State */}
      {filteredData && filteredData.length === 0 && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Typography variant="h3">
              {searchTerm || Object.keys(filters).length > 0
                ? t('noBatchesFound')
                : t('noBatchesYet')}
            </Typography>
            <Typography variant="p" color="muted" className="mt-2">
              {emptyMessage ||
                (searchTerm || Object.keys(filters).length > 0
                  ? t('tryAdjustingFilters')
                  : productId
                    ? t('productNoBatches')
                    : t('getStartedFirstBatch'))}
            </Typography>
            {(searchTerm || Object.keys(filters).length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({})
                  setSearchTerm('')
                }}
                className="mt-4"
              >
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ✅ CONVENIENCE COMPONENTS for specific use cases

export function ExpiringBatchesList({ maxItems = 6 }: { maxItems?: number }) {
  const t = useTranslations('batchList.convenience')

  return (
    <BatchList
      showFilters={false}
      title={t('expiringSoon')}
      emptyMessage={t('noBatchesExpiringSoon')}
      maxItems={maxItems}
    />
  )
}

export function ProductBatchesList({ productId }: { productId: string }) {
  const t = useTranslations('batchList.convenience')

  return (
    <BatchList
      productId={productId}
      showProductInfo={false}
      title={t('productBatches')}
      emptyMessage={t('productNoBatches')}
    />
  )
}

export function LowStockBatchesList({ maxItems = 6 }: { maxItems?: number }) {
  const t = useTranslations('batchList.convenience')

  return (
    <BatchList
      showFilters={false}
      title={t('lowStockAlert')}
      emptyMessage={t('allBatchesSufficientStock')}
      maxItems={maxItems}
    />
  )
}
