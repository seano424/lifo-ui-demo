'use client'

import { BatchListSkeleton } from '@/components/batches/batch-list-skeleton'
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

const VALID_COLUMN_IDS = [
  'batch_number',
  'product_name',
  'supplier',
  'expiry_date',
  'current_quantity',
  'cost_price',
  'selling_price',
  'status',
  'created_at',
]

interface BatchTableProps {
  data: BatchWithProduct[]
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  isLoading: boolean
}

export function BatchTable({ data, currentSort, updateSort, isLoading }: BatchTableProps) {
  const t = useTranslations('batches.table')
  const tStatus = useTranslations('batches.status')
  const tExpiry = useTranslations('batches.expiry')
  const currencySymbol = useCurrency()
  const { activeStore } = useStoreState()

  const [selectedBatch, setSelectedBatch] = useState<BatchWithProduct | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const handleBatchClick = (batch: BatchWithProduct) => {
    setSelectedBatch(batch)
    setIsBottomSheetOpen(true)
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
    tStatus,
    tExpiry,
    currencySymbol,
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
    return <BatchListSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg bg-muted/10">
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
            <TableRow key={headerGroup.id} className="border-b-2 border-border">
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="py-3 px-4 border-b border-brand-dark/40"
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
              className="cursor-pointer hover:bg-muted/30 transition-colors"
            >
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.id}
                  style={
                    cell.column.columnDef.size ? { width: cell.column.columnDef.size } : undefined
                  }
                  className="py-4 px-4 border-b border-border"
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
