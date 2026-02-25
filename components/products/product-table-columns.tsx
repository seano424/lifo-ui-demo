'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import type { useTranslations } from 'next-intl'

import { SortableHeader } from '@/components/products/sortable-header'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'

// Export column metadata for use in skeleton
export const PRODUCT_TABLE_COLUMN_CONFIG = [
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
    width: 100,
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
    id: 'needs_expiry',
    headerKey: 'datesMissing',
    width: 110,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'created_at',
    headerKey: 'dateAdded',
    width: 110,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'category',
    headerKey: 'category',
    width: 240,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'brand',
    headerKey: 'brand',
    width: 240,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
] as const

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
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <SortableHeader field="name" currentSort={currentSort} updateSort={updateSort}>
          {t('product')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
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
          <div className="truncate font-medium" title={row.original.name}>
            {row.original.name}
          </div>
        </div>
      ),
      size: 200,
    },
    {
      id: 'store_quantity',
      header: () => (
        <SortableHeader
          field="store_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('totalStock')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography variant="small" color="muted" className="text-right">
          {row.original.store_quantity ?? 0}
        </Typography>
      ),
      size: 180,
    },
    {
      id: 'active_batches_count',
      accessorKey: 'active_batches_count',
      header: () => (
        <SortableHeader
          field="batch_quantity"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('totalUnitsWithExpiryDates')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography variant="small" color="muted" className="text-right">
          {row.original.batch_quantity ?? 0}
        </Typography>
      ),
      size: 300,
    },
    {
      id: 'needs_expiry',
      header: () => (
        <SortableHeader
          field="needs_expiry"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('datesMissing')}
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const storeQty = row.original.store_quantity ?? 0
        const batchQty = row.original.batch_quantity ?? 0
        const needsExpiry = Math.max(0, storeQty - batchQty)
        return (
          <Typography variant="small" color="muted" className="text-right">
            {needsExpiry}
          </Typography>
        )
      },
      size: 180,
    },
    // {
    //   id: 'created_at',
    //   accessorKey: 'created_at',
    //   header: () => (
    //     <SortableHeader
    //       field="created_at"
    //       currentSort={currentSort}
    //       updateSort={updateSort}
    //       className="justify-end"
    //     >
    //       {t('dateAdded')}
    //     </SortableHeader>
    //   ),
    //   cell: ({ row }) => (
    //     <Typography variant="small" color="muted" className="text-right">
    //       {row.original.created_at
    //         ? new Date(row.original.created_at).toLocaleDateString()
    //         : t('notAvailable')}
    //     </Typography>
    //   ),
    //   size: 150,
    // },
    {
      id: 'category',
      accessorKey: 'category',
      header: () => (
        <SortableHeader
          field="category"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('category')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-right">
          <Badge
            variant="successRounded"
            size="sm"
            className="font-light rounded-lg! border border-lime-200"
          >
            {row.original.category_code ? getCategoryName(row.original) : t('uncategorized')}
          </Badge>
        </div>
      ),
      size: 240,
    },
  ]
}
