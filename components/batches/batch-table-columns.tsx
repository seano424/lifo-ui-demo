'use client'

import type { ColumnDef, Header } from '@tanstack/react-table'
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  MoreHorizontal,
  Package,
  Trash2,
} from 'lucide-react'
import { SortableHeader } from '@/components/batches/sortable-header'
import { Button } from '@/components/ui/button'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { getExpiryBadge, getStatusBadge } from '@/lib/utils/batch-utils'

interface ColumnResizerProps {
  header: Header<BatchWithProduct, unknown>
}

function ColumnResizer({ header }: ColumnResizerProps) {
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

const calculateMaxWidth = (
  data: BatchWithProduct[],
  accessor: (item: BatchWithProduct) => string,
) => {
  const maxLength = Math.max(...data.map(item => accessor(item)?.length || 0), 10)
  return Math.min(Math.max(maxLength * 8 + 40, 100), 400)
}

export function createBatchTableColumns({
  data,
  currentSort,
  updateSort,
  t,
  tStatus,
  tExpiry,
  markBatchAsExpired,
  markBatchAsDamaged,
  isUpdating,
  DEFAULT_COLUMN_WIDTHS,
}: {
  data: BatchWithProduct[]
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  t: (key: string) => string
  tStatus: (key: string) => string
  tExpiry: (key: string, params?: { days: number }) => string
  markBatchAsExpired: (id: string) => void
  markBatchAsDamaged: (id: string) => void
  isUpdating: boolean
  DEFAULT_COLUMN_WIDTHS: Record<string, number>
}): ColumnDef<BatchWithProduct>[] {
  return [
    {
      id: 'batch_number',
      accessorKey: 'batch_number',
      header: () => (
        <SortableHeader field="batch_number" currentSort={currentSort} updateSort={updateSort}>
          {t('headers.batchNumber')}
        </SortableHeader>
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
        <SortableHeader field="supplier" currentSort={currentSort} updateSort={updateSort}>
          {t('headers.supplier')}
        </SortableHeader>
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
        <SortableHeader field="expiry_date" currentSort={currentSort} updateSort={updateSort}>
          {t('headers.expiryDate')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {new Date(row.original.expiry_date).toLocaleDateString()}
            </span>
          </div>
          {getExpiryBadge(row.original.expiry_date, tExpiry)}
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
        <SortableHeader
          field="current_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('headers.stock')}
        </SortableHeader>
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
      minSize: 90,
      maxSize: calculateMaxWidth(data, item => Number(item.current_quantity).toLocaleString()),
      enableResizing: true,
    },
    {
      id: 'cost_price',
      accessorKey: 'cost_price',
      header: () => (
        <SortableHeader
          field="cost_price"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('headers.costPrice')}
        </SortableHeader>
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
        <SortableHeader
          field="selling_price"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('headers.sellPrice')}
        </SortableHeader>
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
        <SortableHeader field="status" currentSort={currentSort} updateSort={updateSort}>
          {t('headers.status')}
        </SortableHeader>
      ),
      cell: ({ row }) => getStatusBadge(row.original.status || 'active', tStatus),
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
}

export { ColumnResizer }
