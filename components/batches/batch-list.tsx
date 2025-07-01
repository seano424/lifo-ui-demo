// components/batches/batch-list.tsx

'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { type BatchFilters } from '@/lib/queries/batches'
import { useBatches, useBatchActions, useBatchesForProduct } from '@/hooks/use-batches'
import { BatchCard } from '@/components/batches/batch-card'
import { Package, Filter, AlertTriangle, Calendar, MapPin, Truck, Search } from 'lucide-react'

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
  const [filters, setFilters] = useState<BatchFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Use different hooks based on whether we're showing batches for a specific product
  const batchesForProduct = useBatchesForProduct(productId ?? '', filters)
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
              Error Loading Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-2xl font-bold">{title}</h2>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            {title}
          </h2>
          {data && data.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {filteredData.length} batch{filteredData.length !== 1 ? 'es' : ''}
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
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search batches..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value: string) => updateFilter('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="sold_out">Sold Out</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Expiring Soon
                </label>
                <Select
                  value={filters.expiringInDays?.toString() || 'all'}
                  onValueChange={(value: string) =>
                    updateFilter('expiringInDays', value === 'all' ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="1">Expiring in 1 day</SelectItem>
                    <SelectItem value="3">Expiring in 3 days</SelectItem>
                    <SelectItem value="7">Expiring in 7 days</SelectItem>
                    <SelectItem value="14">Expiring in 14 days</SelectItem>
                    <SelectItem value="30">Expiring in 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Input
                  placeholder="Location code..."
                  value={filters.location_code || ''}
                  onChange={e => updateFilter('location_code', e.target.value || undefined)}
                />
              </div>

              {/* Stock Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Status</label>
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
                    <SelectValue placeholder="All stock levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Supplier
                </label>
                <Input
                  placeholder="Supplier name..."
                  value={filters.supplier || ''}
                  onChange={e => updateFilter('supplier', e.target.value || undefined)}
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium opacity-0">Clear</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({})
                    setSearchTerm('')
                  }}
                  className="w-full"
                >
                  Clear Filters
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
            {isFetchingNextPage ? 'Loading more...' : 'Load More Batches'}
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {filteredData && filteredData.length > 0 && !maxItems && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            Showing {filteredData.length} batch{filteredData.length !== 1 ? 'es' : ''}
            {data && data.length !== filteredData.length && (
              <span> (filtered from {data.length})</span>
            )}
          </Badge>
        </div>
      )}

      {/* Empty State */}
      {filteredData && filteredData.length === 0 && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {searchTerm || Object.keys(filters).length > 0
                ? 'No batches found'
                : 'No batches yet'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {emptyMessage ||
                (searchTerm || Object.keys(filters).length > 0
                  ? 'Try adjusting your search or filters'
                  : productId
                    ? 'This product has no batches yet'
                    : 'Get started by adding your first batch')}
            </p>
            {(searchTerm || Object.keys(filters).length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({})
                  setSearchTerm('')
                }}
                className="mt-4"
              >
                Clear Filters
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
  return (
    <BatchList
      showFilters={false}
      title="Expiring Soon"
      emptyMessage="No batches expiring soon"
      maxItems={maxItems}
    />
  )
}

export function ProductBatchesList({ productId }: { productId: string }) {
  return (
    <BatchList
      productId={productId}
      showProductInfo={false}
      title="Product Batches"
      emptyMessage="This product has no batches yet"
    />
  )
}

export function LowStockBatchesList({ maxItems = 6 }: { maxItems?: number }) {
  return (
    <BatchList
      showFilters={false}
      title="Low Stock Alert"
      emptyMessage="All batches have sufficient stock"
      maxItems={maxItems}
    />
  )
}
