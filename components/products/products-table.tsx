'use client'

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { ProductListSkeleton } from '@/components/products/product-list-skeleton'
import {
  ColumnResizer,
  createProductTableColumns,
} from '@/components/products/product-table-columns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProductColumnSizing } from '@/hooks/use-product-column-sizing'
import { useProductActions } from '@/hooks/use-products'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'

const VALID_COLUMN_IDS = [
  'name',
  'category',
  'brand',
  'total_stock',
  'active_batches_count',
  'created_at',
]

interface ProductsTableProps {
  data: Product[]
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  isLoading: boolean
}

export function ProductsTable({ data, currentSort, updateSort, isLoading }: ProductsTableProps) {
  const t = useTranslations('products')
  const tButtons = useTranslations('buttons')
  const tTable = useTranslations('productTable')

  const { updateProductPrice, deleteProduct, isUpdating } = useProductActions()

  const { columnSizing, setColumnSizing, DEFAULT_COLUMN_WIDTHS } = useProductColumnSizing()

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

  const columns = createProductTableColumns({
    data,
    currentSort,
    updateSort,
    updateProductPrice,
    deleteProduct,
    isUpdating,
    DEFAULT_COLUMN_WIDTHS,
    t: tTable,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      columnSizing,
      sorting,
    },
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: false,
    defaultColumn: {
      minSize: 50,
      maxSize: 500,
    },
  })

  if (isLoading) {
    return <ProductListSkeleton />
  }

  if (data.length === 0) {
    return (
      <Card className="border-0 border-t rounded-t-none shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">{t('empty.title')}</CardTitle>
          <CardDescription className="text-center max-w-md">
            {t('empty.storeDescription')}
          </CardDescription>
          <Button asLink href="/dashboard/inbound" className="mt-4">
            {tButtons('addProduct')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Table className="w-full table-fixed border-0 border-t rounded-t-none shadow-none">
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                className="relative border-r border-border/50 last:border-r-0 overflow-hidden"
                style={{
                  width: header.getSize(),
                  position: 'relative',
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getCanResize() && <ColumnResizer header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell
                key={cell.id}
                style={{
                  width: cell.column.getSize(),
                }}
                className="border-r border-border/50 last:border-r-0 overflow-hidden"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
