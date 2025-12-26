'use client'

import { BatchListSkeleton } from '@/components/batches/batch-list-skeleton'
import { ColumnResizer, createBatchTableColumns } from '@/components/batches/batch-table-columns'
import { TodoActionBottomSheet } from '@/components/todos/todo-action-bottom-sheet'
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
import { useBatchTodo } from '@/hooks/use-batch-todo'
import { useColumnSizing } from '@/hooks/use-column-sizing'
import { useCurrency } from '@/hooks/use-currency'
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

  const { columnSizing, setColumnSizing, DEFAULT_COLUMN_WIDTHS } = useColumnSizing()

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  // Fetch the todo data for the selected batch
  const { data: selectedBatchTodo } = useBatchTodo(selectedBatchId)

  const handleBatchClick = (batch: BatchWithProduct) => {
    setSelectedBatchId(batch.batch_id)
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
    data,
    currentSort,
    updateSort,
    t,
    tStatus,
    tExpiry,
    DEFAULT_COLUMN_WIDTHS,
    currencySymbol,
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

  if (isLoading) {
    return <BatchListSkeleton />
  }

  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">{t('emptyState.title')}</CardTitle>
          <CardDescription className="text-center max-w-md">
            {t('emptyState.description')}
          </CardDescription>
          <Button asLink href="/dashboard/deliveries" className="mt-4">
            {t('emptyState.addFirstBatch')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table
          style={{
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
              <TableRow
                key={row.id}
                onClick={() => handleBatchClick(row.original)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
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

      <TodoActionBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
          setSelectedBatchId(null)
        }}
        selectedBatch={selectedBatchTodo || null}
        currencySymbol={currencySymbol}
      />
    </>
  )
}
