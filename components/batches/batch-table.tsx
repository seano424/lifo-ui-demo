'use client'

import { createBatchTableColumns } from '@/components/batches/batch-table-columns'
import { ProductDetailModal } from '@/components/products/product-detail-modal'
import { CardDescription, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStoreState } from '@/lib/stores/store-context'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { fetchProductWithBatches } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const VALID_COLUMN_IDS = [
  'product_name',
  'status',
  'expiry_date',
  'days_left',
  'current_quantity',
  'location',
]

interface BatchTableProps {
  data: BatchWithProduct[]
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  isLoading: boolean
  isFetching?: boolean
  hasActiveStore?: boolean
  highlightExpiring?: boolean
  expiryAlertDays?: number
  clientSideSort?: boolean
}

export function BatchTable({
  data,
  currentSort,
  updateSort,
  isLoading,
  isFetching = false,
  hasActiveStore = true,
  highlightExpiring = false,
  expiryAlertDays = 3,
  clientSideSort = false,
}: BatchTableProps) {
  const t = useTranslations('batches.table')
  const tExpiry = useTranslations('batches.expiry')
  const tStatus = useTranslations('batches.status')
  const { activeStore } = useStoreState()
  const queryClient = useQueryClient()

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const handleBatchClick = (batch: BatchWithProduct) => {
    setSelectedProductId(batch.product_id)
    setIsBottomSheetOpen(true)
  }

  const handleBatchHover = (productId: string) => {
    const storeId = activeStore?.store_id
    if (!storeId) return
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detailWithBatches(productId),
      queryFn: () => fetchProductWithBatches(productId, storeId),
      staleTime: 30 * 1000,
    })
  }

  // Helper function to check if batch is expiring soon (matches expiryTodosCount logic)
  const isExpiringSoon = (batch: BatchWithProduct): boolean => {
    if (!batch.expiry_date || !highlightExpiring) return false

    const expiryDate = new Date(batch.expiry_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiryDate.setHours(0, 0, 0, 0)

    const daysToExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )

    // Match expiryTodosCount logic: days_to_expiry >= 0 AND days_to_expiry <= expiryAlertDays
    return daysToExpiry >= 0 && daysToExpiry <= expiryAlertDays
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

  const columns = createBatchTableColumns({
    currentSort,
    updateSort,
    t,
    tExpiry,
    tStatus,
    storeName: activeStore?.store_name,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: clientSideSort ? setSorting : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: clientSideSort,
    manualSorting: !clientSideSort, // Server-side sorting when not client-side
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
                  className="sticky top-0 z-10 py-3 px-2 sm:px-4 border-b border-muted"
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
              onClick={() => handleBatchClick(row.original)}
              onMouseEnter={() => handleBatchHover(row.original.product_id)}
              className={cn(
                'cursor-pointer transition-all duration-100 ease-in-out',
                isExpiringSoon(row.original) ? 'hover:bg-muted/30' : 'hover:bg-muted/30',
              )}
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

      {selectedProductId && (
        <ProductDetailModal
          isOpen={isBottomSheetOpen}
          onClose={() => {
            setIsBottomSheetOpen(false)
            setSelectedProductId(null)
          }}
          productId={selectedProductId}
        />
      )}

      {!isLoading && !isFetching && hasActiveStore && data.length === 0 && (
        <div className="flex select-none flex-col items-center justify-center py-16 rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">{t('emptyState.title')}</CardTitle>
          <CardDescription className="text-center max-w-md">
            {t('emptyState.description')}
          </CardDescription>
        </div>
      )}
    </>
  )
}
