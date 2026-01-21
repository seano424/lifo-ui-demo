'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { SortableHeader } from '@/components/batches/sortable-header'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'

// Helper function to calculate days until expiry
function getDaysLeft(expiryDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper function to get urgency styling for days left
function getDaysLeftStyling(daysLeft: number): {
  textClass: string
  label: string
} {
  if (daysLeft < 0) {
    return {
      textClass: 'text-destructive font-semibold',
      label: 'Expired',
    }
  }
  if (daysLeft === 0) {
    return {
      textClass: 'text-destructive',
      label: 'Today',
    }
  }
  if (daysLeft <= 3) {
    return {
      textClass: 'text-destructive',
      label: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
    }
  }
  if (daysLeft <= 7) {
    return {
      textClass: '',
      label: `${daysLeft} days`,
    }
  }
  return {
    textClass: 'text-muted-foreground',
    label: `${daysLeft} days`,
  }
}

export function createBatchTableColumns({
  currentSort,
  updateSort,
  t,
  tExpiry,
  storeName,
}: {
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  t: (key: string) => string
  tExpiry: (key: string, params?: { days: number }) => string
  storeName?: string
}): ColumnDef<BatchWithProduct>[] {
  return [
    {
      id: 'product_name',
      accessorFn: row => row.products?.name || '',
      header: () => (
        <SortableHeader field="product_name" currentSort={currentSort} updateSort={updateSort}>
          {t('headers.product')}
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
      size: 170,
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
          {t('headers.expiryDate')}
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
              <span className="text-sm truncate">{tExpiry('noExpiryDate')}</span>
            )}
          </div>
        )
      },
      size: 130,
    },
    {
      id: 'days_left',
      accessorKey: 'expiry_date',
      header: () => (
        <SortableHeader
          field="expiry_date"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('headers.daysLeft')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        if (!row.original.expiry_date) {
          return (
            <div className="text-right">
              <span className="text-sm">-</span>
            </div>
          )
        }

        const expiryDate = parseISODateAsLocal(row.original.expiry_date)
        const daysLeft = getDaysLeft(expiryDate)
        const { textClass, label } = getDaysLeftStyling(daysLeft)

        return (
          <div className="text-right">
            <span className={`text-sm ${textClass}`}>{label}</span>
          </div>
        )
      },
      size: 130,
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
          {t('headers.quantity')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {Number(row.original.current_quantity).toLocaleString()}
        </div>
      ),
      size: 130,
    },
    {
      id: 'location',
      header: () => <div className="flex">{t('headers.location')}</div>,
      cell: () => <div className="text-sm text-muted-foreground truncate">{storeName || '-'}</div>,
      size: 130,
    },
  ]
}
