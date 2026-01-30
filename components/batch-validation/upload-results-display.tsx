'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export interface UploadResult {
  processed: number
  skipped: number
  processing_time_ms: number
  performance_metrics?: {
    items_per_second: number
    duplicate_detection_ms?: number
    product_resolution_ms?: number
    batch_insertion_ms?: number
    database_processing_time_ms?: number
    products_created?: number
    store_products_linked?: number
  }
  errors?: string[] | Array<{ row: number; message: string }>
}

export interface UploadResultsDisplayProps {
  result: UploadResult
  onUploadAnother: () => void
  uploadType?: 'csv' | 'delivery-note'
}

export function UploadResultsDisplay({ result, onUploadAnother }: UploadResultsDisplayProps) {
  const t = useTranslations('csvUpload')

  return (
    <Card className="p-6 bg-primary-50 border-none">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 justify-center">
          <div className="text-center flex items-center gap-2">
            <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
            <Typography variant="h4">{result.processed || 0} items imported!</Typography>
          </div>
        </div>

        {/* Success Summary */}
        <div className="text-center p-3 bg-white rounded-2xl space-y-2">
          <Typography variant="p" color="primary">
            {(result.processed || 0) > 0
              ? t('results.successSummary', {
                  processed: result.processed || 0,
                })
              : t('results.uploadCompleted')}
            {(result.skipped || 0) > 0 &&
              t('results.duplicatesSkipped', {
                skipped: result.skipped,
              })}
          </Typography>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-800">{result.processed || 0}</div>
            <Typography variant="p" color="muted">
              {t('results.metrics.processed')}
            </Typography>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{result.skipped || 0}</div>
            <Typography variant="p" color="muted">
              {t('results.metrics.skipped')}
            </Typography>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {result.performance_metrics?.items_per_second || 0}
            </div>
            <Typography variant="p" color="muted">
              {t('results.metrics.itemsPerSec')}
            </Typography>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {result.processing_time_ms || 0}ms
            </div>
            <Typography variant="p" color="muted">
              {t('results.metrics.totalTime')}
            </Typography>
          </div>
        </div>

        {/* Error Display */}
        {result.errors && result.errors.length > 0 && (
          <div className="bg-red-50 border border-destructive rounded-2xl p-4">
            <Typography variant="h4" className="text-destructive mb-2">
              Errors Encountered
            </Typography>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.errors.map((error, index) => {
                const errorKey =
                  typeof error === 'string' ? `error-${index}` : `error-row-${error.row}`
                return (
                  <div
                    key={errorKey}
                    className="text-sm p-2 bg-white rounded border-l-4 border-destructive"
                  >
                    {typeof error === 'string' ? (
                      <div className="text-gray-700">{error}</div>
                    ) : (
                      <>
                        <div className="font-semibold text-destructive">Row {error.row}</div>
                        <div className="text-gray-700">{error.message}</div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button size="lg" onClick={onUploadAnother} className="w-full mt-4">
          {t('buttons.uploadAnother')}
        </Button>
      </div>
    </Card>
  )
}
