'use client'

import { createProductTableColumns } from '@/components/products/product-table-columns'
import { ProductModal } from '@/components/products/product-modal'
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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    setSelectedProduct(product)
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

  return (
    <>
      <Table
        style={{
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="sticky top-0 bg-background z-10 py-3 px-2 sm:px-4 border-b border-muted"
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
              className="cursor-pointer transition-all duration-100 ease-in-out hover:bg-muted/30"
            >
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.id}
                  style={
                    cell.column.columnDef.size ? { width: cell.column.columnDef.size } : undefined
                  }
                  className="py-3 px-2 sm:px-4"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
      />

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
