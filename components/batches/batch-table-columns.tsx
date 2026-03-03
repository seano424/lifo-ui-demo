'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import { SortableHeader } from '@/components/batches/sortable-header'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { formatProductName } from '@/lib/utils/product-name'
import { Badge } from '../ui/badge'
import { Typography } from '../ui/typography'

const BATCH_TABLE_COLUMN_CONFIG = [
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
    headerKey: 'headers.available',
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
  {
    id: 'initial_quantity',
    headerKey: 'headers.initialQuantity',
    width: 100,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'created_at',
    headerKey: 'headers.createdAt',
    width: 120,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'updated_at',
    headerKey: 'headers.updatedAt',
    width: 120,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
] as const

// Helper function to get alignment classes from config
function getAlignmentClasses(id: (typeof BATCH_TABLE_COLUMN_CONFIG)[number]['id']): {
  headerClass: string
  cellClass: string
} {
  const config = BATCH_TABLE_COLUMN_CONFIG.find(c => c.id === id)
  if (config?.align === 'right') {
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
export function getDaysLeft(expiryDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper function to get urgency styling for Days remaining
export function getDaysLeftStyling(
  daysLeft: number,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): {
  textClass: string
  label: string
} {
  if (daysLeft < 0) {
    return {
      textClass: 'text-destructive',
      label: t('expired'),
    }
  }
  if (daysLeft === 0) {
    return {
      textClass: 'text-destructive',
      label: t('today'),
    }
  }
  if (daysLeft <= 3) {
    return {
      textClass: 'text-destructive',
      label: t('days', { count: daysLeft }),
    }
  }
  if (daysLeft <= 7) {
    return {
      textClass: '',
      label: t('days', { count: daysLeft }),
    }
  }
  return {
    textClass: 'text-muted-foreground',
    label: t('days', { count: daysLeft }),
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
  tExpiry: (key: string, params?: Record<string, string | number | Date>) => string
  tStatus: (key: string) => string
  storeName?: string
}): ColumnDef<BatchWithProduct>[] {
  const alignments = {
    product_name: getAlignmentClasses('product_name'),
    status: getAlignmentClasses('status'),
    expiry_date: getAlignmentClasses('expiry_date'),
    days_left: getAlignmentClasses('days_left'),
    current_quantity: getAlignmentClasses('current_quantity'),
    location: getAlignmentClasses('location'),
    initial_quantity: getAlignmentClasses('initial_quantity'),
    created_at: getAlignmentClasses('created_at'),
    updated_at: getAlignmentClasses('updated_at'),
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
        <div className={`flex items-center gap-2 ${alignments.product_name.cellClass}`}>
          {row.original.products?.image_url && (
            <div className="size-9 rounded-lg overflow-hidden shrink-0">
              <Image
                src={row.original.products.image_url}
                alt={row.original.products?.name ?? ''}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <div
            className="truncate font-medium"
            title={formatProductName(row.original.products?.name)}
          >
            {formatProductName(row.original.products?.name)}
          </div>
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
        const { label } = getDaysLeftStyling(daysLeft, tExpiry)

        return (
          <div className={alignments.days_left.cellClass}>
            <Badge size="sm" variant={daysLeft <= 3 ? 'danger' : 'success'}>
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
          {t('headers.available')}
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
        const expiryDate = row.original.expiry_date
          ? parseISODateAsLocal(row.original.expiry_date)
          : null

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
    {
      id: 'initial_quantity',
      accessorKey: 'initial_quantity',
      header: () => (
        <SortableHeader
          field="initial_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.initial_quantity.headerClass}
        >
          {t('headers.initialQuantity')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          color="muted"
          className={`${alignments.initial_quantity.cellClass} tabular-nums`}
        >
          {Math.round(Number(row.original.initial_quantity)).toLocaleString()}
        </Typography>
      ),
      size: BATCH_TABLE_COLUMN_CONFIG[6].width,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: () => (
        <SortableHeader
          field="created_at"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.created_at.headerClass}
        >
          {t('headers.createdAt')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const date = row.original.created_at ? new Date(row.original.created_at) : null
        return (
          <Typography variant="small" color="muted" className={alignments.created_at.cellClass}>
            {date ? date.toLocaleDateString() : '-'}
          </Typography>
        )
      },
      size: BATCH_TABLE_COLUMN_CONFIG[7].width,
    },
    {
      id: 'updated_at',
      accessorKey: 'updated_at',
      header: () => (
        <SortableHeader
          field="updated_at"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.updated_at.headerClass}
        >
          {t('headers.updatedAt')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const date = row.original.updated_at ? new Date(row.original.updated_at) : null
        return (
          <Typography variant="small" color="muted" className={alignments.updated_at.cellClass}>
            {date ? date.toLocaleDateString() : '-'}
          </Typography>
        )
      },
      size: BATCH_TABLE_COLUMN_CONFIG[8].width,
    },
  ]
}
