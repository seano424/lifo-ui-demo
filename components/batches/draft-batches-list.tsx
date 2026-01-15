'use client'

import { useState } from 'react'
import { Calendar, Package, AlertCircle, Clock, FileEdit } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDraftBatches } from '@/hooks/use-batches'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TodoSearchBar } from '@/components/todos/filters/todo-search-bar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BatchWithProduct } from '@/lib/queries/batches'
import { format } from 'date-fns'

interface DraftBatchesListProps {
  className?: string
  onSelectBatch?: (batch: BatchWithProduct) => void
}

export function DraftBatchesList({ className, onSelectBatch }: DraftBatchesListProps) {
  const t = useTranslations('inventory.batches.draftBatches')
  const tTable = useTranslations('batches.table.headers')
  const {
    data: draftBatches,
    count,
    isLoading,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
  } = useDraftBatches()

  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined)

  // Filter batches based on search term
  const filteredBatches = searchTerm
    ? draftBatches?.filter(
        batch =>
          batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : draftBatches

  if (isLoading) {
    return (
      <Card className={cn('border-0 shadow-none', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-8 w-8 animate-spin text-primary-600 mb-4" />
          <CardDescription>Loading draft batches...</CardDescription>
        </CardContent>
      </Card>
    )
  }

  if (!draftBatches || draftBatches.length === 0) {
    return (
      <Card className={cn('border-0 shadow-none', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">No Draft Batches</CardTitle>
          <CardDescription className="text-center max-w-md">
            All batches have expiry dates. Upload a CSV without expiry dates to create draft
            batches.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Alert with count */}
      <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
          {t('needsExpiryDate', { count })}
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200 mt-2">
          {t('draftBatchWarning')}
        </AlertDescription>
      </Alert>

      {/* Main card with search and table */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex justify-center">
              <TodoSearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                isLoading={false}
                placeholder="Search by batch number, product name, or SKU..."
                size="large"
              />
            </div>

            {/* Count badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredBatches?.length === draftBatches.length
                    ? `${count} draft ${count === 1 ? 'batch' : 'batches'}`
                    : `${filteredBatches?.length} of ${count} draft ${count === 1 ? 'batch' : 'batches'}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">{tTable('batchNumber')}</TableHead>
                <TableHead>{tTable('product')}</TableHead>
                <TableHead className="w-[140px]">{tTable('quantity')}</TableHead>
                <TableHead className="w-[120px]">{tTable('createdAt')}</TableHead>
                <TableHead className="w-[100px]">{tTable('status')}</TableHead>
                <TableHead className="w-[140px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches && filteredBatches.length > 0 ? (
                filteredBatches.map(batch => (
                  <TableRow
                    key={batch.batch_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectBatch?.(batch)}
                  >
                    <TableCell className="font-mono font-semibold text-sm">
                      {batch.batch_number}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="">{batch.products?.name || 'Unknown Product'}</div>
                        {batch.products?.sku && (
                          <div className="text-xs text-muted-foreground font-mono">
                            SKU: {batch.products.sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="">{batch.current_quantity}</span>
                        <span className="text-muted-foreground">/ {batch.initial_quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {batch.created_at ? format(new Date(batch.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700"
                      >
                        Draft
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={e => {
                          e.stopPropagation()
                          onSelectBatch?.(batch)
                        }}
                        size="sm"
                        className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        Add Date
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No batches found matching "{searchTerm}"
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              `Load More (${count - draftBatches.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
