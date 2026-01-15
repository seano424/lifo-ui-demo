'use client'

import { ProductListSkeleton } from '@/components/products/product-list-skeleton'
import { createProductTableColumns } from '@/components/products/product-table-columns'
import { CardDescription, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCategoryTranslation } from '@/hooks/use-category-translation'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

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
  const tTable = useTranslations('productTable')

  const { getCategoryName } = useCategoryTranslation()

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

  if (isLoading) {
    return <ProductListSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg bg-muted/10">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-lg mb-2">{t('empty.title')}</CardTitle>
        <CardDescription className="text-center max-w-md">{t('empty.description')}</CardDescription>
      </div>
    )
  }

  return (
    <Table
      style={{
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: 0,
      }}
    >
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className="border-b-2 border-border">
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                className="py-3 px-4"
                style={
                  header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined
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
            className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border"
          >
            {row.getVisibleCells().map(cell => (
              <TableCell
                key={cell.id}
                style={
                  cell.column.columnDef.size ? { width: cell.column.columnDef.size } : undefined
                }
                className="py-4 px-4"
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
