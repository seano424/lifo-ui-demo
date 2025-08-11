'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from '@tanstack/react-table'
import { Package } from 'lucide-react'
import { useState, useEffect } from 'react'

import { useProductActions } from '@/hooks/use-products'
import { useColumnSizing } from '@/hooks/use-column-sizing'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  createProductTableColumns,
  ColumnResizer,
} from '@/components/products/product-table-columns'
import { ProductListSkeleton } from '@/components/products/product-list-skeleton'
import { Card, CardDescription, CardContent, CardTitle } from '@/components/ui/card'

const VALID_COLUMN_IDS = [
  'name',
  'category',
  'brand',
  'total_stock',
  'base_selling_price',
  'active_batches_count',
  'created_at',
]

interface ProductTableProps {
  data: Product[]
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  isLoading: boolean
}

export function ProductTable({ data, currentSort, updateSort, isLoading }: ProductTableProps) {
  const { updateProductPrice, deleteProduct, isUpdating } = useProductActions()

  const { columnSizing, setColumnSizing, DEFAULT_COLUMN_WIDTHS } = useColumnSizing()

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
      maxSize: 400,
    },
  })

  if (isLoading && data.length === 0) {
    return <ProductListSkeleton />
  }

  if (!isLoading && data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">No products found</CardTitle>
          <CardDescription className="text-center max-w-md">
            Get started by adding your first product to this store
          </CardDescription>
          <Button className="mt-4">Add Product</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table
        style={{
          width: table.getCenterTotalSize(),
          tableLayout: 'fixed',
        }}
      >
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="relative border-r border-border/50 last:border-r-0 overflow-hidden"
                  style={{
                    width: header.getSize(),
                    minWidth: header.getSize(),
                    maxWidth: header.getSize(),
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
                    minWidth: cell.column.getSize(),
                    maxWidth: cell.column.getSize(),
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
    </div>
  )
}
