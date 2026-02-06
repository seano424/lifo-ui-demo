'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Tag } from 'lucide-react'
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
    id: 'total_stock',
    headerKey: 'totalStock',
    width: 110,
    align: 'right',
    hasMultipleLines: false,
    sortable: true,
  },
  {
    id: 'active_batches_count',
    headerKey: 'activeBatches',
    width: 130,
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
        <div>
          <div className="truncate" title={row.original.name}>
            {row.original.name || t('unnamedProduct')}
          </div>
          <div
            className="text-sm text-muted-foreground truncate font-mono"
            title={row.original.sku}
          >
            SKU: {row.original.sku || t('notAvailable')}
          </div>
        </div>
      ),
      size: 130,
    },
    {
      id: 'total_stock',
      accessorKey: 'total_stock',
      header: () => (
        <SortableHeader
          field="total_stock"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('totalStock')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div>{row.original.total_stock || 0}</div>
          {/* <div className="text-xs text-muted-foreground">{row.original.unit_type || 'units'}</div> */}
        </div>
      ),
      size: 100,
    },
    {
      id: 'active_batches_count',
      accessorKey: 'active_batches_count',
      header: () => (
        <SortableHeader
          field="active_batches_count"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('activeBatches')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography variant="small" className="flex items-center gap-2 justify-end text-right">
          <span>{row.original.active_batches_count || 0}</span>
        </Typography>
      ),
      size: 150,
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
          {t('dateAdded')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography
          variant="small"
          className="text-muted-foreground text-right flex items-center justify-end"
        >
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString()
            : t('notAvailable')}
        </Typography>
      ),
      size: 150,
    },
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
          <Badge variant="elevated">
            <Tag className="h-3.5 w-3.5" />
            {row.original.category_code ? getCategoryName(row.original) : t('uncategorized')}
          </Badge>
        </div>
      ),
      size: 240,
    },
    {
      id: 'brand',
      accessorKey: 'brand',
      header: () => (
        <SortableHeader
          field="brand"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          {t('brand')}
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end text-right">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate" title={row.original.brand || t('notAvailable')}>
            {row.original.brand || t('notAvailable')}
          </span>
        </div>
      ),
      size: 240,
    },
  ]
}
