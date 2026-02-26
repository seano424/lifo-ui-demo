'use client'

import {
  createBatchTableColumns,
  getDaysLeft,
  getDaysLeftStyling,
} from '@/components/batches/batch-table-columns'
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
import { useStoreState } from '@/lib/stores/store-context'
import type { BatchSort, BatchSortField, BatchWithProduct } from '@/lib/queries/batches'
import { fetchProductWithBatches } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import Image from 'next/image'
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
      queryKey: queryKeys.products.detailWithBatches(productId, storeId),
      queryFn: () => fetchProductWithBatches(productId, storeId),
      staleTime: 30 * 1000,
    })
  }

  // Helper function to check if batch is expiring soon (matches expiryTodosCount logic)
  const isExpiringSoon = (batch: BatchWithProduct): boolean => {
    if (!batch.expiry_date || !highlightExpiring) return false

    const expiryDate = parseISODateAsLocal(batch.expiry_date)
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
      {/* Desktop table — hidden on mobile */}
      <div className="hidden sm:block">
        <Table
          style={{
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: 'max-content',
            minWidth: '100%',
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
      </div>

      {/* Mobile card list — hidden on sm+ */}
      <div className="sm:hidden flex flex-col gap-2">
        {data.map(batch => {
          const expiryDate = batch.expiry_date ? parseISODateAsLocal(batch.expiry_date) : null
          const daysLeft = expiryDate ? getDaysLeft(expiryDate) : null
          const { label: daysLabel } =
            daysLeft !== null ? getDaysLeftStyling(daysLeft) : { label: '-' }
          const badgeVariant = daysLeft !== null && daysLeft <= 3 ? 'danger' : 'success'

          return (
            <div
              key={batch.batch_id}
              onClick={() => handleBatchClick(batch)}
              className={cn(
                'px-4 py-4 cursor-pointer transition-colors active:bg-muted/20 border border-b-muted-foreground/10 border-t-transparent border-x-transparent',
                isExpiringSoon(batch) && 'border border-red-100/90',
              )}
            >
              {/* Primary row: product image + name + days badge */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {batch.products?.image_url && (
                    <div className="size-9 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={batch.products.image_url}
                        alt={batch.products?.name ?? ''}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <span className="font-semibold truncate">{batch.products?.name}</span>
                </div>
                {expiryDate && (
                  <Badge size="sm" variant={badgeVariant} className="shrink-0">
                    {daysLabel}
                  </Badge>
                )}
              </div>

              {/* Secondary rows: label → value */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {t('headers.expiryDate')}
                  </Typography>
                  <Typography variant="small">
                    {expiryDate ? expiryDate.toLocaleDateString() : tExpiry('noExpiryDate')}
                  </Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {t('headers.quantity')}
                  </Typography>
                  <Typography variant="small">
                    {Math.round(Number(batch.current_quantity)).toLocaleString()}
                  </Typography>
                </div>
                <div className="flex justify-between text-sm">
                  <Typography variant="small" color="muted">
                    {t('headers.status')}
                  </Typography>
                  <Typography variant="small">{tStatus(batch.status || 'active')}</Typography>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedProductId && (
        <ProductDetailPanel
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
