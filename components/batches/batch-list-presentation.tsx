// components/batches/batch-list-presentation.tsx - Presentation component for batch list

'use client'

import { useState } from 'react'
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

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
          <CardTitle className="text-lg mb-2">No batches found</CardTitle>
          <CardDescription className="text-center max-w-md">
            You don&apos;t have any batches in your inventory yet. Start by adding your first batch
            to track expiration dates and manage stock levels.
          </CardDescription>
          <Button className="mt-4">Add First Batch</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle could go here if needed */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
        >
          {viewMode === 'table' ? 'View as Cards' : 'View as Table'}
        </Button>
      </div>

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
                Loading more...
              </>
            ) : (
              `Load More Batches (${count - data.length} remaining)`
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
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>
  }

  const getExpiryBadge = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (daysUntilExpiry <= 3) {
      return <Badge variant="destructive">{daysUntilExpiry}d left</Badge>
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="secondary">{daysUntilExpiry}d left</Badge>
    } else {
      return <Badge variant="outline">{daysUntilExpiry}d left</Badge>
    }
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="batch_number">Batch #</SortableHeader>
            <TableHead>Product</TableHead>
            <SortableHeader field="supplier">Supplier</SortableHeader>
            <SortableHeader field="expiry_date">Expiry Date</SortableHeader>
            <SortableHeader field="current_quantity" className="text-right">
              Stock
            </SortableHeader>
            <SortableHeader field="cost_price" className="text-right">
              Cost
            </SortableHeader>
            <SortableHeader field="selling_price" className="text-right">
              Price
            </SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(batch => (
            <TableRow key={batch.batch_id}>
              <TableCell className="font-mono text-sm">{batch.batch_number}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{batch.products?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {batch.products?.sku} • {batch.products?.category}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {batch.supplier || 'Unknown'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(batch.expiry_date).toLocaleDateString()}
                  </div>
                  {getExpiryBadge(batch.expiry_date)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="font-medium">
                    {Number(batch.current_quantity).toLocaleString()}
                  </span>
                  {batch.reserved_quantity && Number(batch.reserved_quantity) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Number(batch.reserved_quantity)} reserved
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  {Number(batch.cost_price).toFixed(2)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  {Number(batch.selling_price).toFixed(2)}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(batch.status || 'active')}</TableCell>
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
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Batch
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => markBatchAsExpired(batch.batch_id)}
                      disabled={batch.status === 'expired'}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Mark as Expired
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => markBatchAsDamaged(batch.batch_id)}
                      disabled={batch.status === 'damaged'}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Mark as Damaged
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Batch
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function BatchCards({ data }: { data: BatchWithProduct[] }) {
  const { markBatchAsExpired, markBatchAsDamaged, isUpdating } = useBatchActions()

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default' as const,
      expired: 'destructive' as const,
      damaged: 'destructive' as const,
      sold_out: 'secondary' as const,
      reserved: 'outline' as const,
    }
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>
  }

  const getExpiryBadge = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (daysUntilExpiry <= 3) {
      return <Badge variant="destructive">{daysUntilExpiry}d left</Badge>
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="secondary">{daysUntilExpiry}d left</Badge>
    } else {
      return <Badge variant="outline">{daysUntilExpiry}d left</Badge>
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
                <span className="text-muted-foreground">Supplier:</span>
                <div className="font-medium">{batch.supplier || 'Unknown'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Stock:</span>
                <div className="font-medium">{Number(batch.current_quantity).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Cost:</span>
                <div className="font-medium">${Number(batch.cost_price).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>
                <div className="font-medium">${Number(batch.selling_price).toFixed(2)}</div>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <div className="font-medium">{new Date(batch.expiry_date).toLocaleDateString()}</div>
            </div>

            {batch.location_code && (
              <div className="text-sm">
                <span className="text-muted-foreground">Location:</span>
                <div className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {batch.location_code}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="mr-1 h-3 w-3" />
                View
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
                    Edit Batch
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => markBatchAsExpired(batch.batch_id)}
                    disabled={batch.status === 'expired'}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Mark as Expired
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => markBatchAsDamaged(batch.batch_id)}
                    disabled={batch.status === 'damaged'}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Mark as Damaged
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Batch
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
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch #</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Status</TableHead>
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
