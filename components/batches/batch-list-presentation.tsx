// components/batches/batch-list-presentation.tsx - Presentation component for batch list

'use client'

import { useState, useEffect } from 'react'
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
  Clock,
  TrendingUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Header,
} from '@tanstack/react-table'
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
  // Add filter props for unified design
  filters?: {
    expiringInDays?: number
    status?: string
  }
  onFiltersChange?: (filters: { expiringInDays?: number; status?: string }) => void
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
  filters,
  onFiltersChange,
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

  const renderContent = () => {
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
      <>
        {viewMode === 'table' ? (
          <BatchTable
            data={data}
            currentSort={currentSort}
            updateSort={updateSort}
            filters={filters}
            onFiltersChange={onFiltersChange}
            count={count}
            isLoading={isLoading}
          />
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
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* Always show header with controls */}
      <Card>
        <div className="p-4 border-b">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Filters and Sort controls */}
              {onFiltersChange && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-muted-foreground mr-2">{count} items</span>
                  <Select
                    value={filters?.expiringInDays?.toString() || 'all'}
                    onValueChange={value =>
                      onFiltersChange({
                        ...filters,
                        expiringInDays: value === 'all' ? undefined : parseInt(value),
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Expiry filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All items </SelectItem>
                      <SelectItem value="3">Expiring in 3 days</SelectItem>
                      <SelectItem value="7">Expiring in 7 days</SelectItem>
                      <SelectItem value="14">Expiring in 14 days</SelectItem>
                      <SelectItem value="30">Expiring in 30 days</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters?.status || 'all'}
                    onValueChange={value =>
                      onFiltersChange({
                        ...filters,
                        status: value === 'all' ? undefined : value,
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="sold_out">Sold Out</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Sort by:</span>

                {/* Sort field selector */}
                <Select
                  value={currentSort.field}
                  onValueChange={(field: BatchSortField) => updateSort(field)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      {currentSort.field === 'expiry_date' && (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {currentSort.field === 'batch_number' && <Package className="h-4 w-4" />}
                      {currentSort.field === 'supplier' && <Package className="h-4 w-4" />}
                      {currentSort.field === 'current_quantity' && (
                        <TrendingUp className="h-4 w-4" />
                      )}
                      {currentSort.field === 'cost_price' && <DollarSign className="h-4 w-4" />}
                      {currentSort.field === 'selling_price' && (
                        <DollarSign className="h-4 w-4" />
                      )}
                      {currentSort.field === 'status' && <Clock className="h-4 w-4" />}
                      {currentSort.field === 'received_date' && <Calendar className="h-4 w-4" />}
                      {currentSort.field === 'created_at' && <Calendar className="h-4 w-4" />}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expiry_date">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Expiry Date
                      </div>
                    </SelectItem>
                    <SelectItem value="batch_number">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Batch Number
                      </div>
                    </SelectItem>
                    <SelectItem value="supplier">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Supplier
                      </div>
                    </SelectItem>
                    <SelectItem value="current_quantity">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Stock Level
                      </div>
                    </SelectItem>
                    <SelectItem value="cost_price">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cost Price
                      </div>
                    </SelectItem>
                    <SelectItem value="selling_price">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Selling Price
                      </div>
                    </SelectItem>
                    <SelectItem value="status">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Status
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort direction toggle */}
                <Button
                  variant="outline"
                  onClick={() => updateSort(currentSort.field)}
                  disabled={isLoading}
                  className="px-3 hover:text-accent-foreground hover:bg-transparent"
                >
                  {currentSort.direction === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  <span className="ml-1">{currentSort.direction === 'asc' ? 'ASC' : 'DESC'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Content area */}
      {renderContent()}
    </div>
  )
}

// Column widths storage key
const COLUMN_WIDTHS_STORAGE_KEY = 'lifo-batch-table-columns'

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  batch_number: 120,
  product: 200,
  supplier: 120,
  expiry_date: 140,
  current_quantity: 100,
  cost_price: 110,
  selling_price: 110,
  status: 100,
  actions: 50,
}

// Resizer component
function ColumnResizer({ header }: { header: Header<BatchWithProduct, unknown> }) {
  return (
    <div
      className={`absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent  z-10 ${
        header.column.getIsResizing() ? '' : ''
      }`}
      style={{
        userSelect: 'none' as const,
        touchAction: 'none' as const,
      }}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => {
        header.column.resetSize()
      }}
    >
      <div
        className={`w-0.5 h-full ml-auto transition-all ${
          header.column.getIsResizing() ? 'bg-brand-secondary' : 'bg-transparent hover:bg-border'
        }`}
      />
    </div>
  )
}

function BatchTable({
  data,
  currentSort,
  updateSort,
  filters,
  onFiltersChange,
  count,
  isLoading,
}: {
  data: BatchWithProduct[]
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  filters?: {
    expiringInDays?: number
    status?: string
  }
  onFiltersChange?: (filters: { expiringInDays?: number; status?: string }) => void
  count: number
  isLoading: boolean
}) {
  const { markBatchAsExpired, markBatchAsDamaged, isUpdating } = useBatchActions()
  const t = useTranslations('batches.table')
  const tStatus = useTranslations('batches.status')
  const tExpiry = useTranslations('batches.expiry')

  // Load column widths from localStorage
  const [columnSizing, setColumnSizing] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return DEFAULT_COLUMN_WIDTHS
        }
      }
    }
    return DEFAULT_COLUMN_WIDTHS
  })

  // Save column widths to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnSizing))
    }
  }, [columnSizing])

  // Valid column IDs that exist in our table
  const validColumnIds = [
    'batch_number',
    'product',
    'supplier',
    'expiry_date',
    'current_quantity',
    'cost_price',
    'selling_price',
    'status',
  ]

  // Convert currentSort to TanStack Table sorting state, only if column exists
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (validColumnIds.includes(currentSort.field)) {
      return [
        {
          id: currentSort.field,
          desc: currentSort.direction === 'desc',
        },
      ]
    }
    return []
  })

  // Update sorting when currentSort changes
  useEffect(() => {
    if (validColumnIds.includes(currentSort.field)) {
      setSorting([
        {
          id: currentSort.field,
          desc: currentSort.direction === 'desc',
        },
      ])
    } else {
      setSorting([])
    }
  }, [currentSort])

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
    const translatedStatus =
      tStatus(translationKey as 'active' | 'expired' | 'damaged' | 'soldOut' | 'reserved') || status
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

  // Calculate dynamic max width based on content
  const calculateMaxWidth = (
    data: BatchWithProduct[],
    accessor: (item: BatchWithProduct) => string,
  ) => {
    const maxLength = Math.max(
      ...data.map(item => accessor(item)?.length || 0),
      10, // Minimum reasonable length
    )
    // Rough calculation: ~8px per character + padding
    return Math.min(Math.max(maxLength * 8 + 40, 100), 400)
  }

  // Column definitions
  const columns: ColumnDef<BatchWithProduct>[] = [
    {
      id: 'batch_number',
      accessorKey: 'batch_number',
      header: () => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'batch_number' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.batchNumber')}
              {currentSort.field === 'batch_number' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-sm truncate" title={row.original.batch_number}>
          {row.original.batch_number}
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.batch_number,
      minSize: 80,
      maxSize: calculateMaxWidth(data, item => item.batch_number || ''),
      enableResizing: true,
    },
    {
      id: 'product',
      accessorFn: row => row.products?.name || '',
      header: t('headers.product'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium truncate" title={row.original.products?.name}>
            {row.original.products?.name}
          </div>
          <div
            className="text-sm text-muted-foreground truncate"
            title={`${row.original.products?.sku} • ${row.original.products?.category}`}
          >
            {row.original.products?.sku} • {row.original.products?.category}
          </div>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.product,
      minSize: 120,
      maxSize: calculateMaxWidth(data, item => item.products?.name || ''),
      enableResizing: true,
    },
    {
      id: 'supplier',
      accessorKey: 'supplier',
      header: () => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'supplier' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.supplier')}
              {currentSort.field === 'supplier' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={row.original.supplier || 'Unknown'}>
            {row.original.supplier || 'Unknown'}
          </span>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.supplier,
      minSize: 80,
      maxSize: calculateMaxWidth(data, item => item.supplier || 'Unknown'),
      enableResizing: true,
    },
    {
      id: 'expiry_date',
      accessorKey: 'expiry_date',
      header: () => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'expiry_date' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.expiryDate')}
              {currentSort.field === 'expiry_date' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {new Date(row.original.expiry_date).toLocaleDateString()}
            </span>
          </div>
          {getExpiryBadge(row.original.expiry_date)}
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.expiry_date,
      minSize: 100,
      maxSize: Math.max(
        180,
        calculateMaxWidth(data, item => new Date(item.expiry_date).toLocaleDateString()),
      ),
      enableResizing: true,
    },
    {
      id: 'current_quantity',
      accessorKey: 'current_quantity',
      header: () => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'current_quantity' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.stock')}
              {currentSort.field === 'current_quantity' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span
            className="font-medium truncate"
            title={Number(row.original.current_quantity).toLocaleString()}
          >
            {Number(row.original.current_quantity).toLocaleString()}
          </span>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.current_quantity,
      minSize: 60,
      maxSize: calculateMaxWidth(data, item => Number(item.current_quantity).toLocaleString()),
      enableResizing: true,
    },
    {
      id: 'cost_price',
      accessorKey: 'cost_price',
      header: () => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'cost_price' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.costPrice')}
              {currentSort.field === 'cost_price' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={`$${Number(row.original.cost_price).toFixed(2)}`}>
            {Number(row.original.cost_price).toFixed(2)}
          </span>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.cost_price,
      minSize: 70,
      maxSize: calculateMaxWidth(data, item => `$${Number(item.cost_price).toFixed(2)}`),
      enableResizing: true,
    },
    {
      id: 'selling_price',
      accessorKey: 'selling_price',
      header: () => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'selling_price' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.sellPrice')}
              {currentSort.field === 'selling_price' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={`$${Number(row.original.selling_price).toFixed(2)}`}>
            {Number(row.original.selling_price).toFixed(2)}
          </span>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.selling_price,
      minSize: 70,
      maxSize: calculateMaxWidth(data, item => `$${Number(item.selling_price).toFixed(2)}`),
      enableResizing: true,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: () => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => {
              const field = 'status' as BatchSortField
              updateSort(field)
            }}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            <div className="flex items-center gap-1">
              {t('headers.status')}
              {currentSort.field === 'status' ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </div>
      ),
      cell: ({ row }) => getStatusBadge(row.original.status || 'active'),
      size: DEFAULT_COLUMN_WIDTHS.status,
      minSize: 70,
      maxSize: Math.max(
        130,
        calculateMaxWidth(data, item => item.status || 'active'),
      ),
      enableResizing: true,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
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
              onClick={() => markBatchAsExpired(row.original.batch_id)}
              disabled={row.original.status === 'expired'}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t('actions.markAsExpired')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => markBatchAsDamaged(row.original.batch_id)}
              disabled={row.original.status === 'damaged'}
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
      ),
      enableResizing: false,
      size: DEFAULT_COLUMN_WIDTHS.actions,
      minSize: 50,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      columnSizing,
      sorting,
    },
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange', // Smooth real-time resizing
    enableColumnResizing: true,
    enableSorting: false, // We handle sorting externally
    defaultColumn: {
      minSize: 50, // Global minimum size
      maxSize: 400, // Global maximum size
    },
  })

  return (
    <Card>
      {/* Table */}
      <div className="overflow-x-auto">
        <Table
          style={{
            width: table.getCenterTotalSize(),
            tableLayout: 'fixed', // Force fixed layout to prevent column confusion
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="relative border-r border-border/50 last:border-r-0 overflow-hidden"
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      maxWidth: header.getSize(),
                      position: 'relative',
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && <ColumnResizer header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.getSize(),
                      maxWidth: cell.column.getSize(),
                    }}
                    className="border-r border-border/50 last:border-r-0 overflow-hidden"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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
    const translatedStatus =
      tStatus(translationKey as 'active' | 'expired' | 'damaged' | 'soldOut' | 'reserved') || status
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
