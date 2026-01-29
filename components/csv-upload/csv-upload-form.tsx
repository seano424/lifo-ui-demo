'use client'

import { AlertCircle, Clock, FileCheck, Upload, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCSVUpload } from '@/hooks/use-csv-upload'
import { PRICE_CONSTRAINTS } from '@/lib/constants/file-upload'
import { cn } from '@/lib/utils'
import { validateUploadFile } from '@/lib/utils/file-validation'
import { logger } from '@/lib/utils/logger'
import { Typography } from '../ui/typography'
import { BatchValidationTable } from '../batch-validation/batch-validation-table'
import { UploadResultsDisplay } from '../batch-validation/upload-results-display'
import type { CsvPreviewItem } from '../batch-validation'

interface AffectedItem {
  product_name: string
  sku?: string
  error?: string
}

interface ValidationWarning {
  message: string
  suggestion?: string
  affected_items?: AffectedItem[]
  total_affected?: number
}

interface CSVUploadFormProps {
  storeId: string
  onUploadComplete?: (result: unknown) => void
}

export function CSVUploadForm({ storeId }: CSVUploadFormProps) {
  const t = useTranslations('csvUpload')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const itemsPerPage = 10

  // Centralized error handler for consistent error messaging
  const handleError = (error: unknown, fallbackMessage: string) => {
    if (process.env.NODE_ENV === 'development') {
      logger.error('csv-upload', 'Error occurred', { error })
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const lowerMessage = errorMessage.toLowerCase()

    const errorMappings = [
      {
        keywords: ['empty', 'no data rows'],
        message: t('errors.emptyFile'),
      },
      {
        keywords: ['network', 'fetch', 'connection'],
        message: t('errors.analysisFailure'),
      },
      { keywords: ['timeout'], message: `${fallbackMessage}: Request timeout` },
      { keywords: ['invalid', 'malformed'], message: t('errors.invalidFile') },
      { keywords: ['too large', 'size'], message: t('errors.invalidFile') },
      {
        keywords: ['constraint', 'pricing'],
        message: t('errors.databaseValidation'),
      },
      {
        keywords: ['no cached data', 'preview the file first'],
        message: t('errors.noCachedData'),
      },
      {
        keywords: ['all items have expired', 'update expiry dates'],
        message: t('errors.allItemsExpired'),
      },
    ]

    const matchedError = errorMappings.find(mapping =>
      mapping.keywords.some(keyword => lowerMessage.includes(keyword)),
    )

    const userMessage =
      matchedError?.message ||
      (process.env.NODE_ENV === 'development'
        ? `${fallbackMessage}: ${errorMessage}`
        : fallbackMessage)

    const description =
      process.env.NODE_ENV === 'development' && !matchedError ? errorMessage : undefined

    toast.error(userMessage, description ? { description } : undefined)
  }

  const {
    csvPreview,
    isPreviewReady,
    previewCsvFile,
    mutate: upload,
    isPending: isUploading,
    data: uploadResult,
    error,
    validate,
    isValidating,
    validationResult,
    resetPreview,
    updateCsvItemExpiry,
    updateCsvItemQuantity,
    updateCsvItemSku,
    updateCsvItemProductName,
    updateCsvItemCostPrice,
    updateCsvItemSellingPrice,
  } = useCSVUpload()

  // Memoize pricing validation to prevent unnecessary re-calculations
  const hasInvalidPricing = useMemo(() => {
    if (csvPreview.length === 0) return false

    return csvPreview.some(
      item =>
        item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE ||
        item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE,
    )
  }, [csvPreview])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      await handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (file: File) => {
    try {
      // Comprehensive file validation
      const validation = validateUploadFile(file)
      if (!validation.isValid) {
        toast.error(validation.error || t('errors.invalidFile'))
        return
      }

      setSelectedFile(file)

      await previewCsvFile(file)
    } catch (error) {
      handleError(error, t('errors.analysisFailure'))
      setSelectedFile(null)
    }
  }

  const handleValidate = () => {
    if (!selectedFile) {
      toast.error(t('errors.noFile'))
      return
    }

    if (!storeId) {
      toast.error(t('errors.noStore'))
      return
    }

    try {
      validate({
        file: selectedFile,
        storeId,
        csvData: csvPreview,
      })
    } catch (error) {
      handleError(error, 'Validation failed')
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error(t('errors.noFile'))
      return
    }

    if (!storeId) {
      toast.error(t('errors.noStore'))
      return
    }

    try {
      // Validate pricing values before upload
      const invalidPricing = csvPreview.some(
        item =>
          item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE ||
          item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE,
      )

      if (invalidPricing) {
        toast.error(t('errors.invalidPricing'), {
          description: t('errors.invalidPricingDescription'),
        })
        return
      }

      upload({
        file: selectedFile,
        storeId,
        csvData: csvPreview,
      })
    } catch (error) {
      handleError(error, t('errors.startFailed'))
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setCurrentPage(0)
    resetPreview()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(csvPreview.length / itemsPerPage)

  // Generic update handler for BatchValidationTable
  const handleUpdateItem = (index: number, field: keyof CsvPreviewItem, value: string | number) => {
    switch (field) {
      case 'SKU':
        updateCsvItemSku(index, value as string)
        break
      case 'Product_Name':
        updateCsvItemProductName(index, value as string)
        break
      case 'Quantity':
        updateCsvItemQuantity(index, value as number)
        break
      case 'Cost_Price':
        updateCsvItemCostPrice(index, value as number)
        break
      case 'Selling_Price':
        updateCsvItemSellingPrice(index, value as number)
        break
      case 'Expiry_Date':
        updateCsvItemExpiry(index, value as string)
        break
      default:
        break
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:min-w-xl lg:w-3xl mx-auto">
      {/* Ultra-Fast Upload Header */}

      <div className="flex items-center gap-2 flex-col justify-center">
        <div className="flex items-center gap-1">
          <Zap className="w-6 h-6 text-secondary-900 fill-primary-100" />
          <Typography variant="h3" className="text-primary-800 font-black">
            {t('title')}
          </Typography>
          <Zap className="w-6 h-6 text-secondary-900 fill-primary-100" />
        </div>
        <Typography variant="p">{t('subtitle')}</Typography>
      </div>

      {/* File Upload Area */}
      <Card className="p-6">
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-colors',
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
            !selectedFile && 'hover:border-gray-400',
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-4">
              <FileCheck className="h-12 w-12 text-primary-800 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">{selectedFile.name}</h3>
                <p className="text-gray-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">{t('dropZone.dropHere')}</h3>
                <p className="text-gray-600">{t('dropZone.orBrowse')}</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                {t('dropZone.chooseFile')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Simple Preview */}
      {!uploadResult && isPreviewReady && csvPreview.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <BatchValidationTable
              items={csvPreview}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onUpdateItem={handleUpdateItem}
              disabled={isUploading}
              itemsPerPage={itemsPerPage}
            />

            {/* Validation Results */}
            {validationResult && (
              <Alert
                variant={validationResult.has_validation_errors ? 'destructive' : 'default'}
                className={
                  validationResult.has_validation_errors
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle
                  className={
                    validationResult.has_validation_errors
                      ? 'text-red-800 font-semibold'
                      : 'text-green-800 font-semibold'
                  }
                >
                  {validationResult.has_validation_errors
                    ? 'Validation Errors Found'
                    : 'Validation Successful'}
                </AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  <p
                    className={
                      validationResult.has_validation_errors ? 'text-red-700' : 'text-green-700'
                    }
                  >
                    {validationResult.message}
                  </p>

                  {validationResult.has_validation_errors &&
                    validationResult.warnings &&
                    validationResult.warnings.length > 0 && (
                      <div className="space-y-3">
                        {validationResult.warnings.map(
                          (warning: ValidationWarning, idx: number) => (
                            <div
                              key={`validation-warning-${idx}-${warning.message.slice(0, 20)}`}
                              className="space-y-2 border-t border-red-200 pt-2"
                            >
                              <p className="text-red-700 ">{warning.message}</p>
                              {warning.suggestion && (
                                <p className="text-red-600 text-sm italic">{warning.suggestion}</p>
                              )}
                              {warning.affected_items && warning.affected_items.length > 0 && (
                                <details className="text-sm">
                                  <summary className="cursor-pointer text-red-600 hover:text-red-800">
                                    View affected items ({warning.total_affected} total, showing
                                    first {Math.min(5, warning.affected_items.length)})
                                  </summary>
                                  <ul className="mt-2 space-y-1 list-disc list-inside text-red-700">
                                    {warning.affected_items
                                      .slice(0, 5)
                                      .map((item: AffectedItem, i: number) => (
                                        <li
                                          key={`affected-item-${idx}-${item.sku || item.product_name}-${i}`}
                                        >
                                          {item.product_name}
                                          {item.sku && ` (SKU: ${item.sku})`}
                                          {item.error && (
                                            <span className="block ml-6 text-xs text-red-600">
                                              {item.error}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  {!validationResult.has_validation_errors && (
                    <p className="text-green-600 text-sm">
                      All {validationResult.validation_results.valid_items} items passed validation.
                      Ready to upload!
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleValidate}
                disabled={isValidating || isUploading}
                variant="secondary"
                className="flex-1"
                size="lg"
              >
                {isValidating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Validate
                  </>
                )}
              </Button>

              <Button
                onClick={handleUpload}
                disabled={isUploading || hasInvalidPricing}
                className="flex-1"
                size="lg"
                title={hasInvalidPricing ? t('errors.invalidPricingDescription') : undefined}
              >
                {isUploading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {t('buttons.processing')}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {t('buttons.upload')}
                  </>
                )}
              </Button>

              <Button onClick={handleReset} variant="outline" disabled={isUploading}>
                {t('buttons.cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results Display */}
      {uploadResult && (
        <UploadResultsDisplay
          result={uploadResult}
          onUploadAnother={handleReset}
          uploadType="csv"
        />
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('errors.uploadFailed')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
