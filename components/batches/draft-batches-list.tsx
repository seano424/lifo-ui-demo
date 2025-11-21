'use client'

import { useState } from 'react'
import { Calendar, Package, AlertCircle, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDraftBatches } from '@/hooks/use-batches'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { Batch } from '@/lib/queries/batches'

interface DraftBatchesListProps {
  className?: string
  onSelectBatch?: (batch: Batch) => void
}

export function DraftBatchesList({ className, onSelectBatch }: DraftBatchesListProps) {
  const t = useTranslations('inventory.batches.draftBatches')
  const tTable = useTranslations('inventory.batches.table.headers')
  const { data: draftBatches, count, isLoading, hasMore, fetchNextPage, isFetchingNextPage } = useDraftBatches()

  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading draft batches...</span>
        </div>
      </Card>
    )
  }

  if (!draftBatches || draftBatches.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <Typography variant="h4" className="mb-2">
            No Draft Batches
          </Typography>
          <Typography variant="p" color="muted">
            All batches have expiry dates. Upload a CSV without expiry dates to create draft batches.
          </Typography>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with count */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('needsExpiryDate', { count })}</AlertTitle>
        <AlertDescription>
          {t('draftBatchWarning')}
        </AlertDescription>
      </Alert>

      {/* Draft batches grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {draftBatches.map(batch => (
          <Card
            key={batch.batch_id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelectBatch?.(batch)}
          >
            <div className="space-y-3">
              {/* Batch number & status */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Typography variant="h5" className="truncate">
                    {batch.batch_number}
                  </Typography>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  </div>
                </div>
              </div>

              {/* Product info */}
              <div className="space-y-1">
                <Typography variant="small" className="text-muted-foreground">
                  {tTable('product')}
                </Typography>
                <Typography variant="p" className="font-medium truncate">
                  {batch.products?.name || 'Unknown Product'}
                </Typography>
                {batch.products?.sku && (
                  <Typography variant="small" className="text-muted-foreground">
                    SKU: {batch.products.sku}
                  </Typography>
                )}
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Typography variant="small">
                  {batch.current_quantity} / {batch.initial_quantity} units
                </Typography>
              </div>

              {/* Missing expiry date indicator */}
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <Typography variant="small" className="font-medium">
                  {t('incompleteBatch')}
                </Typography>
              </div>

              {/* Action button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectBatch?.(batch)
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {t('addExpiryDate')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
