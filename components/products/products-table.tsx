'use client'

import { createProductTableColumns } from '@/components/products/product-table-columns'
import { ProductDetailPanel } from '@/components/products/product-detail-panel'
import { Badge } from '@/components/ui/badge'
import { CardDescription, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Typography } from '@/components/ui/typography'
import { useCategoryTranslation } from '@/hooks/use-category-translation'
import { useQueryClient } from '@tanstack/react-query'
import { fetchProductWithBatches } from '@/lib/queries/products'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Package } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { formatProductName } from '@/lib/utils/product-name'

const VALID_COLUMN_IDS = [
  'name',
  'category',
  'brand',
  'active_batches_count',
  'store_quantity',
  'needs_expiry',
  'created_at',
]

interface ProductsTableProps {
  data: Product[]
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  isLoading: boolean
  isFetching?: boolean
  hasActiveStore?: boolean
}

export function ProductsTable({
  data,
  currentSort,
  updateSort,
  isLoading,
  isFetching = false,
  hasActiveStore = true,
}: ProductsTableProps) {
  const t = useTranslations('products')
  const tTable = useTranslations('productTable')

  const { getCategoryName } = useCategoryTranslation()
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleProductHover = (productId: string) => {
    if (!activeStoreId) return
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detailWithBatches(productId, activeStoreId),
      queryFn: () => fetchProductWithBatches(productId, activeStoreId),
      staleTime: 30 * 1000,
    })
  }

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (VALID_COLUMN_IDS.includes(currentSort.field)) {
      return [
        {
          id: currentSort.field,
          desc: currentSort.direction === 'desc',
        },
      ]
    }
    return []
  })

  useEffect(() => {
    if (VALID_COLUMN_IDS.includes(currentSort.field)) {
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

  const handleProductClick = (product: Product) => {
    setSelectedProductId(product.product_id)
    setIsModalOpen(true)
  }

  const columns = useMemo(
    () =>
      createProductTableColumns({
        currentSort,
        updateSort,
        t: tTable,
        getCategoryName,
      }),
    [currentSort, updateSort, tTable, getCategoryName],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: false,
  })

  const totalColumnsWidth = table
    .getVisibleLeafColumns()
    .reduce((sum, col) => sum + (col.columnDef.size ?? 0), 0)

  return (
    <>
      {/* Desktop table — hidden on mobile */}
      <div className="hidden sm:block">
        <Table
          style={{
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: `max(${totalColumnsWidth}px, 100%)`,
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 bg-background z-10 py-3 border-b border-muted"
                    style={
                      header.column.columnDef.size
                        ? { width: header.column.columnDef.size }
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                onClick={() => handleProductClick(row.original)}
                onMouseEnter={() => handleProductHover(row.original.product_id)}
                className="cursor-pointer transition-all duration-100 ease-in-out hover:bg-muted/30"
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    style={
                      cell.column.columnDef.size ? { width: cell.column.columnDef.size } : undefined
                    }
                    className="py-3"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list — hidden on sm+ */}
      <div className="sm:hidden divide-y divide-muted">
        {data.map(product => {
          const storeQty = product.store_quantity ?? 0
          const batchQty = product.batch_quantity ?? 0
          const missingExpiry = Math.max(0, storeQty - batchQty)
          const categoryName = product.category_code
            ? getCategoryName(product)
            : tTable('uncategorized')

          return (
            <button
              key={product.product_id}
              type="button"
              onClick={() => handleProductClick(product)}
              onMouseEnter={() => handleProductHover(product.product_id)}
              className="w-full text-left px-4 py-4 cursor-pointer transition-colors active:bg-muted/20"
            >
              {/* Primary row: product image + name + category badge */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {product.image_url && (
                    <div className="size-9 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <span className="font-semibold truncate">{formatProductName(product.name)}</span>
                </div>
                <Badge
                  variant="successRounded"
                  size="sm"
                  className="shrink-0 font-light rounded-lg! border border-lime-200"
                >
                  {categoryName}
                </Badge>
              </div>

              {/* Secondary rows: label → value */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {tTable('totalStock')}
                  </Typography>
                  <Typography variant="small">{storeQty}</Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {tTable('totalUnitsWithExpiryDates')}
                  </Typography>
                  <Typography variant="small">{batchQty}</Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {tTable('activeBatches')}
                  </Typography>
                  <Typography variant="small">{product.active_batches_count ?? 0}</Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {tTable('datesMissing')}
                  </Typography>
                  <Typography variant="small">{missingExpiry}</Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {tTable('brand')}
                  </Typography>
                  <Typography variant="small">{product.brand || '-'}</Typography>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedProductId && (
        <ProductDetailPanel
          key={selectedProductId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedProductId(null)
          }}
          productId={selectedProductId}
        />
      )}

      {!isLoading && !isFetching && hasActiveStore && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg bg-muted/10">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">{t('empty.title')}</CardTitle>
          <CardDescription className="text-center max-w-md">
            {t('empty.description')}
          </CardDescription>
        </div>
      )}
    </>
  )
}
