'use client'

import { BatchTableSkeleton } from '@/components/batches/batch-table-skeleton'
import { createBatchTableColumns } from '@/components/batches/batch-table-columns'
import { BatchModal } from '@/components/batches/batch-modal'
import { CardDescription, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrency } from '@/hooks/use-currency'
import { useStoreState } from '@/lib/stores/store-context'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
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
import { cn } from '@/lib/utils'

const VALID_COLUMN_IDS = [
  'product_name',
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
  highlightExpiring?: boolean
  expiryAlertDays?: number
}

export function BatchTable({
  data,
  currentSort,
  updateSort,
  isLoading,
  highlightExpiring = false,
  expiryAlertDays = 3,
}: BatchTableProps) {
  const t = useTranslations('batches.table')
  const tExpiry = useTranslations('batches.expiry')
  const currencySymbol = useCurrency()
  const { activeStore } = useStoreState()

  const [selectedBatch, setSelectedBatch] = useState<BatchWithProduct | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const handleBatchClick = (batch: BatchWithProduct) => {
    setSelectedBatch(batch)
    setIsBottomSheetOpen(true)
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
    storeName: activeStore?.store_name,
  })

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
    return <BatchTableSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-lg bg-muted/10">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-lg mb-2">{t('emptyState.title')}</CardTitle>
        <CardDescription className="text-center max-w-md">
          {t('emptyState.description')}
        </CardDescription>
      </div>
    )
  }

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
                  className="sticky top-0 bg-background z-10 py-3 px-4 border-b border-border"
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
                  className="py-3 px-4"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BatchModal
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
          setSelectedBatch(null)
        }}
        batch={selectedBatch}
        currencySymbol={currencySymbol}
      />
    </>
  )
}
