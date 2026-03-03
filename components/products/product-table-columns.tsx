'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import type { useTranslations } from 'next-intl'

import { SortableHeader } from '@/components/products/sortable-header'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'
import { formatProductName } from '@/lib/utils/product-name'

const PRODUCT_TABLE_COLUMN_CONFIG = [
  {
    id: 'name',
    headerKey: 'product',
    width: 130,
    align: 'left',
    hasMultipleLines: true,
    sortable: true,
  },
  {
    id: 'store_quantity',
    headerKey: 'totalStock',
    width: 150,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'active_batches_count',
    headerKey: 'totalUnitsWithExpiryDates',
    width: 150,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'active_batches',
    headerKey: 'activeBatches',
    width: 150,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'needs_expiry',
    headerKey: 'datesMissing',
    width: 150,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'category',
    headerKey: 'category',
    width: 150,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'brand',
    headerKey: 'brand',
    width: 120,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
] as const

function getAlignmentClasses(id: (typeof PRODUCT_TABLE_COLUMN_CONFIG)[number]['id']): {
  headerClass: string
  cellClass: string
} {
  const config = PRODUCT_TABLE_COLUMN_CONFIG.find(c => c.id === id)
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

export function createProductTableColumns({
  currentSort,
  updateSort,
  t,
  getCategoryName,
}: {
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  t: ReturnType<typeof useTranslations>
  getCategoryName: (product: Product) => string
}): ColumnDef<Product>[] {
  const alignments = {
    name: getAlignmentClasses('name'),
    store_quantity: getAlignmentClasses('store_quantity'),
    active_batches_count: getAlignmentClasses('active_batches_count'),
    active_batches: getAlignmentClasses('active_batches'),
    needs_expiry: getAlignmentClasses('needs_expiry'),
    category: getAlignmentClasses('category'),
    brand: getAlignmentClasses('brand'),
  }

  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <SortableHeader
          field="name"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.name.headerClass}
        >
          {t('product')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className={`flex items-center gap-2 ${alignments.name.cellClass}`}>
          {row.original.image_url && (
            <div className="size-9 rounded-lg overflow-hidden shrink-0">
              <Image
                src={row.original.image_url}
                alt={row.original.name}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <div className="truncate font-medium" title={formatProductName(row.original.name)}>
            {formatProductName(row.original.name)}
          </div>
        </div>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[0].width,
    },
    {
      id: 'store_quantity',
      header: () => (
        <SortableHeader
          field="store_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.store_quantity.headerClass}
        >
          {t('totalStock')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          color="muted"
          className={`${alignments.store_quantity.cellClass} tabular-nums`}
        >
          {row.original.store_quantity ?? 0}
        </Typography>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[1].width,
    },
    {
      id: 'active_batches_count',
      accessorKey: 'active_batches_count',
      header: () => (
        <SortableHeader
          field="batch_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.active_batches_count.headerClass}
        >
          {t('totalUnitsWithExpiryDates')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          color="muted"
          className={`${alignments.active_batches_count.cellClass} tabular-nums`}
        >
          {row.original.batch_quantity ?? 0}
        </Typography>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[2].width,
    },
    {
      id: 'active_batches',
      accessorFn: row => row.active_batches_count,
      header: () => (
        <SortableHeader
          field="active_batches_count"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.active_batches.headerClass}
        >
          {t('activeBatches')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          color="muted"
          className={`${alignments.active_batches.cellClass} tabular-nums`}
        >
          {row.original.active_batches_count ?? 0}
        </Typography>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[3].width,
    },
    {
      id: 'needs_expiry',
      header: () => (
        <SortableHeader
          field="needs_expiry"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.needs_expiry.headerClass}
        >
          {t('datesMissing')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const storeQty = row.original.store_quantity ?? 0
        const batchQty = row.original.batch_quantity ?? 0
        const needsExpiry = Math.max(0, storeQty - batchQty)
        return (
          <Typography
            variant="small"
            color="muted"
            className={`${alignments.needs_expiry.cellClass} tabular-nums`}
          >
            {needsExpiry}
          </Typography>
        )
      },
      size: PRODUCT_TABLE_COLUMN_CONFIG[4].width,
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: () => (
        <SortableHeader
          field="category"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.category.headerClass}
        >
          {t('category')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className={`flex items-center justify-end ${alignments.category.cellClass}`}>
          <Badge
            variant="successRounded"
            size="sm"
            className="font-light rounded-lg! border border-lime-200"
          >
            {row.original.category_code ? getCategoryName(row.original) : t('uncategorized')}
          </Badge>
        </div>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[5].width,
    },
    {
      id: 'brand',
      accessorKey: 'brand',
      header: () => (
        <SortableHeader
          field="brand"
          currentSort={currentSort}
          updateSort={updateSort}
          className={alignments.brand.headerClass}
        >
          {t('brand')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography variant="small" color="muted" className={alignments.brand.cellClass}>
          {row.original.brand || '-'}
        </Typography>
      ),
      size: PRODUCT_TABLE_COLUMN_CONFIG[6].width,
    },
  ]
}
