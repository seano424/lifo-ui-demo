'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { SortableHeader } from '@/components/batches/sortable-header'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { getStatusBadge } from '@/lib/utils/batch-utils'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'

export function createBatchTableColumns({
  currentSort,
  updateSort,
  t,
  tStatus,
  tExpiry,
  currencySymbol = '$',
  storeName,
}: {
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  t: (key: string) => string
  tStatus: (key: string) => string
  tExpiry: (key: string, params?: { days: number }) => string
  currencySymbol?: string
  storeName?: string
}): ColumnDef<BatchWithProduct>[] {
  return [
    {
      id: 'batch_number',
      accessorKey: 'batch_number',
      header: () => (
        <SortableHeader field="batch_number" currentSort={currentSort} updateSort={updateSort}>
          <span className="text-sm text-foreground">{t('headers.batchNumber')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div
          className="font-mono text-sm text-muted-foreground truncate"
          title={row.original.batch_number}
        >
          {row.original.batch_number?.slice(-6) || ''}
        </div>
      ),
      size: 140,
    },
    {
      id: 'product_name',
      accessorFn: row => row.products?.name || '',
      header: () => (
        <SortableHeader field="product_name" currentSort={currentSort} updateSort={updateSort}>
          <span className="text-sm text-foreground">{t('headers.product')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div>
          <div className="truncate" title={row.original.products?.name}>
            {row.original.products?.name}
          </div>
          <div
            className="text-xs text-muted-foreground truncate"
            title={row.original.products?.sku}
          >
            {row.original.products?.sku}
          </div>
        </div>
      ),
      size: 200,
    },
    {
      id: 'location',
      header: () => (
        <div className="flex">
          <span className="text-sm text-foreground">{t('headers.location')}</span>
        </div>
      ),
      cell: () => (
        <div className="text-sm text-muted-foreground truncate text-right">{storeName || '-'}</div>
      ),
      size: 150,
    },
    {
      id: 'expiry_date',
      accessorKey: 'expiry_date',
      header: () => (
        <SortableHeader
          field="expiry_date"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          <span className="text-sm text-foreground">{t('headers.expiryDate')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => {
        let expiryDate: Date | null = null
        let isExpired = false

        if (row.original.expiry_date) {
          expiryDate = parseISODateAsLocal(row.original.expiry_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          isExpired = expiryDate < today
        }

        return (
          <div className="flex items-center gap-2 justify-end text-right">
            {expiryDate ? (
              <span className={`text-sm truncate ${isExpired ? 'text-destructive' : ''}`}>
                {expiryDate.toLocaleDateString()}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic truncate">
                {tExpiry('noExpiryDate')}
              </span>
            )}
          </div>
        )
      },
      size: 140,
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
          <span className="text-sm text-foreground">{t('headers.stock')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {Number(row.original.current_quantity).toLocaleString()}
        </div>
      ),
      size: 140,
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
          <span className="text-sm text-foreground">{t('headers.costPrice')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {currencySymbol}
          {Number(row.original.cost_price).toFixed(2)}
        </div>
      ),
      size: 140,
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
          <span className="text-sm text-foreground">{t('headers.sellPrice')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {currencySymbol}
          {Number(row.original.selling_price).toFixed(2)}
        </div>
      ),
      size: 140,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: () => (
        <SortableHeader
          field="status"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          <span className="text-sm text-foreground">{t('headers.status')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => {
        // Default to 'active' if no status is provided
        const status = row.original.status || 'active'
        return <div className="flex justify-end">{getStatusBadge(status, tStatus)}</div>
      },
      size: 140,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: () => (
        <SortableHeader
          field="created_at"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          <span className="text-sm text-foreground">{t('headers.createdAt')}</span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm truncate text-right">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '-'}
        </div>
      ),
      size: 140,
    },
  ]
}
