// components/batches/batch-list-presentation.tsx - Presentation component for batch list

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BatchWithProduct, BatchSort, BatchSortField } from '@/lib/queries/batches'
import { useBatchActions } from '@/hooks/use-batches'

interface BatchListPresentationProps {
  data: BatchWithProduct[]
  count: number
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
}

export function BatchListPresentation({
  data,
  count,
  isLoading,
  error,
  hasMore,
  fetchNextPage,
  isFetchingNextPage,
  currentSort,
  updateSort,
}: BatchListPresentationProps) {
  const [viewMode] = useState<'table' | 'cards'>('table')
  const t = useTranslations('batches.table')

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load batches: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading && data.length === 0) {
    return <BatchListSkeleton />
  }

  if (!isLoading && data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">{t('emptyState.title')}</CardTitle>
          <CardDescription className="text-center max-w-md">
            {t('emptyState.description')}
          </CardDescription>
          <Button className="mt-4">{t('emptyState.addFirstBatch')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle could go here if needed */}
      {/* <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
        >
          {viewMode === 'table' ? 'View as Cards' : 'View as Table'}
        </Button>
      </div> */}

      {viewMode === 'table' ? (
        <BatchTable data={data} currentSort={currentSort} updateSort={updateSort} />
      ) : (
        <BatchCards data={data} />
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={fetchNextPage} disabled={isFetchingNextPage} size="lg">
            {isFetchingNextPage ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {t('loading')}
              </>
            ) : (
              t('loadMore', { remaining: count - data.length })
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function BatchTable({
  data,
  currentSort,
  updateSort,
}: {
  data: BatchWithProduct[]
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
}) {
  const { markBatchAsExpired, markBatchAsDamaged, isUpdating } = useBatchActions()
  const t = useTranslations('batches.table')
  const tStatus = useTranslations('batches.status')
  const tExpiry = useTranslations('batches.expiry')

  const getSortIcon = (field: BatchSortField) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return currentSort.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const SortableHeader = ({
    field,
    children,
    className = '',
  }: {
    field: BatchSortField
    children: React.ReactNode
    className?: string
  }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        onClick={() => updateSort(field)}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        <div className="flex items-center gap-1">
          {children}
          {getSortIcon(field)}
        </div>
      </Button>
    </TableHead>
  )

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default' as const,
      expired: 'destructive' as const,
      damaged: 'destructive' as const,
      sold_out: 'secondary' as const,
      reserved: 'outline' as const,
    }
    const statusMap: { [key: string]: string } = {
      active: 'active',
      expired: 'expired',
      damaged: 'damaged',
      sold_out: 'soldOut',
      reserved: 'reserved',
    }
    const translationKey = statusMap[status] || 'active'
    const translatedStatus = tStatus(translationKey as 'active' | 'expired' | 'damaged' | 'soldOut' | 'reserved') || status
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {translatedStatus}
      </Badge>
    )
  }

  const getExpiryBadge = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">{tExpiry('expired')}</Badge>
    } else if (daysUntilExpiry <= 3) {
      return <Badge variant="destructive">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="secondary">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    } else {
      return <Badge variant="outline">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    }
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="batch_number" className="w-32 max-w-32">
                {t('headers.batchNumber')}
              </SortableHeader>
              <TableHead className="w-48">{t('headers.product')}</TableHead>
              <SortableHeader field="supplier" className="w-32">
                {t('headers.supplier')}
              </SortableHeader>
              <SortableHeader field="expiry_date" className="w-36">
                {t('headers.expiryDate')}
              </SortableHeader>
              <SortableHeader field="current_quantity" className="text-right w-24">
                {t('headers.stock')}
              </SortableHeader>
              <SortableHeader field="cost_price" className="text-right w-28">
                {t('headers.costPrice')}
              </SortableHeader>
              <SortableHeader field="selling_price" className="text-right w-28">
                {t('headers.sellPrice')}
              </SortableHeader>
              <SortableHeader field="status" className="w-24">
                {t('headers.status')}
              </SortableHeader>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(batch => (
              <TableRow key={batch.batch_id}>
                <TableCell className="font-mono text-sm w-32 max-w-32">
                  <div className="truncate" title={batch.batch_number}>
                    {batch.batch_number}
                  </div>
                </TableCell>
                <TableCell className="w-48">
                  <div>
                    <div className="font-medium truncate" title={batch.products?.name}>
                      {batch.products?.name}
                    </div>
                    <div
                      className="text-sm text-muted-foreground truncate"
                      title={`${batch.products?.sku} • ${batch.products?.category}`}
                    >
                      {batch.products?.sku} • {batch.products?.category}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-32">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={batch.supplier || 'Unknown'}>
                      {batch.supplier || 'Unknown'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-36">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {new Date(batch.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                    {getExpiryBadge(batch.expiry_date)}
                  </div>
                </TableCell>
                <TableCell className="text-right w-24">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="font-medium truncate"
                      title={Number(batch.current_quantity).toLocaleString()}
                    >
                      {Number(batch.current_quantity).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right w-28">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={`$${Number(batch.cost_price).toFixed(2)}`}>
                      {Number(batch.cost_price).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right w-28">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={`$${Number(batch.selling_price).toFixed(2)}`}>
                      {Number(batch.selling_price).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-24">{getStatusBadge(batch.status || 'active')}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isUpdating}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('actions.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('actions.editBatch')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => markBatchAsExpired(batch.batch_id)}
                        disabled={batch.status === 'expired'}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t('actions.markAsExpired')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => markBatchAsDamaged(batch.batch_id)}
                        disabled={batch.status === 'damaged'}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t('actions.markAsDamaged')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('actions.deleteBatch')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function BatchCards({ data }: { data: BatchWithProduct[] }) {
  const { markBatchAsExpired, markBatchAsDamaged, isUpdating } = useBatchActions()
  const t = useTranslations('batches.table')
  const tStatus = useTranslations('batches.status')
  const tExpiry = useTranslations('batches.expiry')

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default' as const,
      expired: 'destructive' as const,
      damaged: 'destructive' as const,
      sold_out: 'secondary' as const,
      reserved: 'outline' as const,
    }
    const statusMap: { [key: string]: string } = {
      active: 'active',
      expired: 'expired',
      damaged: 'damaged',
      sold_out: 'soldOut',
      reserved: 'reserved',
    }
    const translationKey = statusMap[status] || 'active'
    const translatedStatus = tStatus(translationKey as 'active' | 'expired' | 'damaged' | 'soldOut' | 'reserved') || status
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {translatedStatus}
      </Badge>
    )
  }

  const getExpiryBadge = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">{tExpiry('expired')}</Badge>
    } else if (daysUntilExpiry <= 3) {
      return <Badge variant="destructive">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="secondary">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    } else {
      return <Badge variant="outline">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map(batch => (
        <Card key={batch.batch_id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{batch.products?.name}</CardTitle>
                <CardDescription className="font-mono">{batch.batch_number}</CardDescription>
              </div>
              <div className="flex flex-col gap-1">
                {getStatusBadge(batch.status || 'active')}
                {getExpiryBadge(batch.expiry_date)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('headers.supplier')}:</span>
                <div className="font-medium">{batch.supplier || 'Unknown'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('headers.stock')}:</span>
                <div className="font-medium">{Number(batch.current_quantity).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('headers.costPrice')}:</span>
                <div className="font-medium">${Number(batch.cost_price).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('headers.sellPrice')}:</span>
                <div className="font-medium">${Number(batch.selling_price).toFixed(2)}</div>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">{t('headers.expiryDate')}:</span>
              <div className="font-medium">{new Date(batch.expiry_date).toLocaleDateString()}</div>
            </div>

            {batch.location_code && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('headers.location')}:</span>
                <div className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {batch.location_code}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="mr-1 h-3 w-3" />
                {t('actions.viewDetails')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('actions.editBatch')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => markBatchAsExpired(batch.batch_id)}
                    disabled={batch.status === 'expired'}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t('actions.markAsExpired')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => markBatchAsDamaged(batch.batch_id)}
                    disabled={batch.status === 'damaged'}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t('actions.markAsDamaged')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.deleteBatch')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BatchListSkeleton() {
  const t = useTranslations('batches.table')

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('headers.batchNumber')}</TableHead>
            <TableHead>{t('headers.product')}</TableHead>
            <TableHead>{t('headers.supplier')}</TableHead>
            <TableHead>{t('headers.expiryDate')}</TableHead>
            <TableHead className="text-right">{t('headers.stock')}</TableHead>
            <TableHead className="text-right">{t('headers.costPrice')}</TableHead>
            <TableHead className="text-right">{t('headers.sellPrice')}</TableHead>
            <TableHead>{t('headers.status')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
