'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { SortableHeader } from '@/components/batches/sortable-header'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { Badge } from '../ui/badge'
import { Typography } from '../ui/typography'

// Export column metadata for use in skeleton
export const BATCH_TABLE_COLUMN_CONFIG = [
  {
    id: 'product_name',
    headerKey: 'headers.product',
    width: 130,
    align: 'left',
    hasMultipleLines: true,
    sortable: true,
  },
  {
    id: 'status',
    headerKey: 'headers.status',
    width: 100,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'expiry_date',
    headerKey: 'headers.expiryDate',
    width: 130,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'days_left',
    headerKey: 'headers.daysLeft',
    width: 110,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'current_quantity',
    headerKey: 'headers.quantity',
    width: 110,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'location',
    headerKey: 'headers.location',
    width: 130,
    align: 'right',
    hasMultipleLines: false,
    sortable: false,
  },
] as const

// Helper function to get alignment classes from config
function getAlignmentClasses(columnIndex: number): {
  headerClass: string
  cellClass: string
} {
  const align = BATCH_TABLE_COLUMN_CONFIG[columnIndex].align
  if (align === 'right') {
    return {
      headerClass: 'justify-end',
      cellClass: 'text-right',
    }
  }
  return {
    headerClass: '',
    cellClass: '',
  }
}

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
      textClass: 'text-destructive',
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
  tStatus,
  // storeName,
}: {
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  t: (key: string) => string
  tExpiry: (key: string, params?: { days: number }) => string
  tStatus: (key: string) => string
  storeName?: string
}): ColumnDef<BatchWithProduct>[] {
  const alignments = {
    product_name: getAlignmentClasses(0),
    status: getAlignmentClasses(1),
    expiry_date: getAlignmentClasses(2),
    days_left: getAlignmentClasses(3),
    current_quantity: getAlignmentClasses(4),
    location: getAlignmentClasses(5),
  }

  return [
    {
      id: 'product_name',
      accessorFn: row => row.products?.name || '',
      header: () => (
        <SortableHeader
          field="product_name"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.product_name.headerClass}
        >
          {t('headers.product')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className={alignments.product_name.cellClass}>
          <div className="truncate font-medium" title={row.original.products?.name}>
            {row.original.products?.name}
          </div>
          {/* <div
            className="text-sm text-muted-foreground truncate"
            title={row.original.products?.sku}
          >
            {row.original.products?.sku}
          </div> */}
        </div>
      ),
      size: BATCH_TABLE_COLUMN_CONFIG[0].width,
    },
    {
      id: 'days_left',
      accessorKey: 'expiry_date',
      header: () => (
        <SortableHeader
          field="expiry_date"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.days_left.headerClass}
        >
          {t('headers.daysLeft')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        if (!row.original.expiry_date) {
          return (
            <div className={alignments.days_left.cellClass}>
              <span className="text-sm">-</span>
            </div>
          )
        }

        const expiryDate = parseISODateAsLocal(row.original.expiry_date)
        const daysLeft = getDaysLeft(expiryDate)
        const { label } = getDaysLeftStyling(daysLeft)

        return (
          <div className={alignments.days_left.cellClass}>
            <Badge size="sm" variant={daysLeft <= 3 ? 'danger' : 'primary'}>
              {label}
            </Badge>
          </div>
        )
      },
      size: BATCH_TABLE_COLUMN_CONFIG[3].width,
    },
    {
      id: 'current_quantity',
      accessorKey: 'current_quantity',
      header: () => (
        <SortableHeader
          field="current_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.current_quantity.headerClass}
        >
          {t('headers.quantity')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          color="muted"
          className={`${alignments.current_quantity.cellClass} tabular-nums`}
        >
          {Math.round(Number(row.original.current_quantity)).toLocaleString()}
        </Typography>
      ),
      size: BATCH_TABLE_COLUMN_CONFIG[4].width,
    },
    {
      id: 'expiry_date',
      accessorKey: 'expiry_date',
      header: () => (
        <SortableHeader
          field="expiry_date"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.expiry_date.headerClass}
        >
          {t('headers.expiryDate')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        let expiryDate: Date | null = null
        // let daysLeft = 0

        if (row.original.expiry_date) {
          expiryDate = parseISODateAsLocal(row.original.expiry_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          // daysLeft = getDaysLeft(expiryDate)
        }

        return (
          <Typography variant="small" color="muted" className={alignments.expiry_date.cellClass}>
            {expiryDate ? expiryDate.toLocaleDateString() : tExpiry('noExpiryDate')}
          </Typography>
        )
      },
      size: BATCH_TABLE_COLUMN_CONFIG[2].width,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: () => (
        <SortableHeader
          field="status"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.status.headerClass}
        >
          {t('headers.status')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const status = row.original.status || 'active'
        return (
          <Typography variant="small" color="muted" className={alignments.status.cellClass}>
            {/* <Badge variant={getStatusVariant(status)}>{tStatus(status)}</Badge> */}
            {tStatus(status)}
          </Typography>
        )
      },
      size: BATCH_TABLE_COLUMN_CONFIG[1].width,
    },
    // {
    //   id: 'location',
    //   header: () => (
    //     <div className={`flex items-center font-normal ${alignments.location.headerClass}`}>
    //       {t('headers.location')}
    //     </div>
    //   ),
    //   cell: () => (
    //     <div className={`text-sm truncate ${alignments.location.cellClass}`}>
    //       {storeName || '-'}
    //     </div>
    //   ),
    //   size: BATCH_TABLE_COLUMN_CONFIG[5].width,
    // },
  ]
}
