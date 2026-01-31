'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Tag } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import { SortableHeader } from '@/components/products/sortable-header'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    fresh_produce: 'bg-primary-100 text-primary-800 border-primary-200',
    fresh_meat_fish: 'bg-destructive text-destructive border-destructive',
    bakery_fresh: 'bg-orange-100 text-orange-800 border-orange-200',
    dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    deli_prepared: 'bg-pink-100 text-pink-800 border-pink-200',
    frozen: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dry_goods: 'bg-amber-100 text-amber-800 border-amber-200',
    beverages: 'bg-blue-100 text-blue-800 border-blue-200',
    spices_condiments: 'bg-purple-100 text-purple-800 border-purple-200',
    canned_jarred: 'bg-stone-100 text-stone-800 border-stone-200',
    chilled_packaged: 'bg-teal-100 text-teal-800 border-teal-200',
    pantry_staples: 'bg-slate-100 text-slate-800 border-slate-200',
    other: 'bg-gray-100 text-foreground border-gray-200',
  }
  return colors[category?.toLowerCase() as keyof typeof colors] || colors.other
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
      size: 200,
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
          <div className="">{row.original.total_stock || 0}</div>
          {/* <div className="text-xs text-muted-foreground">{row.original.unit_type || 'units'}</div> */}
        </div>
      ),
      size: 200,
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
      size: 200,
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
      size: 200,
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
        <div className="flex items-center gap-2 justify-end text-right">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          {row.original.category_code ? (
            <Badge
              variant="outline"
              className={`${getCategoryBadgeColor(row.original.category_code)}`}
            >
              {getCategoryName(row.original)}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">{t('uncategorized')}</span>
          )}
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
