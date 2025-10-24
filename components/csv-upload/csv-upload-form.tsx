'use client'

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  Minus,
  Plus,
  Upload,
  Zap,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCSVUpload } from '@/hooks/use-csv-upload'
import { cn } from '@/lib/utils'
import { validateUploadFile } from '@/lib/utils/file-validation'
import { Typography } from '../ui/typography'

interface CSVUploadFormProps {
  storeId: string
  onUploadComplete?: (result: unknown) => void
}

export function CSVUploadForm({ storeId }: CSVUploadFormProps) {
  const t = useTranslations('csvUpload')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasInvalidPricing, setHasInvalidPricing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const itemsPerPage = 10

  // Centralized error handler for consistent error messaging
  const handleError = (error: unknown, fallbackMessage: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CSV] Error:', error)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const lowerMessage = errorMessage.toLowerCase()

    const errorMappings = [
      {
        keywords: ['network', 'fetch', 'connection'],
        message: t('errors.analysisFailure'),
      },
      { keywords: ['timeout'], message: `${fallbackMessage}: Request timeout` },
      { keywords: ['invalid', 'malformed'], message: t('errors.invalidFile') },
      { keywords: ['too large', 'size'], message: t('errors.invalidFile') },
      {
        keywords: ['constraint', 'pricing'],
        message: t('csvUpload.errors.databaseValidation'),
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
    resetPreview,
    columnMapping,
    updateCsvItemExpiry,
    updateCsvItemQuantity,
    updateCsvItemSku,
    updateCsvItemProductName,
    updateCsvItemCostPrice,
    updateCsvItemSellingPrice,
  } = useCSVUpload()

  // Validate prices on initial render and when preview changes
  useEffect(() => {
    if (csvPreview.length > 0) {
      const invalidPricing = csvPreview.some(
        item => item.Cost_Price < 0.01 || item.Selling_Price < 0.01,
      )
      setHasInvalidPricing(invalidPricing)
    } else {
      setHasInvalidPricing(false)
    }
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
      // Validate pricing values before upload (must be >= 0.01)
      const invalidPricing = csvPreview.some(
        item => item.Cost_Price < 0.01 || item.Selling_Price < 0.01,
      )

      if (invalidPricing) {
        toast.error(t('csvUpload.errors.invalidPricing'), {
          description: t('csvUpload.errors.invalidPricingDescription'),
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
  const startIndex = currentPage * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, csvPreview.length)
  const currentItems = csvPreview.slice(startIndex, endIndex)

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Helper function to convert category codes to human-readable labels
  const getCategoryLabel = (categoryCode: string): string => {
    if (!categoryCode) return ''
    // Convert snake_case to Title Case
    // e.g., "fresh_meat" -> "Fresh Meat", "bakery_fresh" -> "Bakery Fresh"
    return categoryCode
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
              <FileCheck className="h-12 w-12 text-primary-500 mx-auto" />
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Typography variant="h3">{t('preview.title')}</Typography>

                <span className="text-sm text-gray-600">
                  ({startIndex + 1}-{endIndex} of {csvPreview.length} items)
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 min-w-[60px] text-center">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.sku')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.productName')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.category')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.quantity')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.costPrice')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.sellingPrice')}
                    </th>
                    <th className="border border-gray-200 p-2 text-left">
                      {t('preview.table.expiryDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => {
                    const actualIndex = startIndex + index
                    return (
                      <tr key={actualIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-2">
                          <Input
                            value={item.SKU}
                            onChange={e => updateCsvItemSku(actualIndex, e.target.value)}
                            className="font-mono text-xs h-7 min-w-[100px]"
                            maxLength={100}
                          />
                        </td>
                        <td className="border border-gray-200 p-2">
                          <Input
                            value={item.Product_Name}
                            onChange={e => updateCsvItemProductName(actualIndex, e.target.value)}
                            className="text-sm h-7 min-w-[150px]"
                            maxLength={255}
                          />
                        </td>
                        <td className="border border-gray-200 p-2">
                          <div className="text-xs font-medium text-gray-700">
                            {getCategoryLabel(item.Category)}
                          </div>
                        </td>
                        <td className="border border-gray-200 p-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCsvItemQuantity(actualIndex, item.Quantity - 1)}
                              disabled={item.Quantity <= 1}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[30px] text-center font-mono text-sm">
                              {item.Quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCsvItemQuantity(actualIndex, item.Quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="border border-gray-200 p-2">
                          <Input
                            type="number"
                            value={item.Cost_Price}
                            onChange={e =>
                              updateCsvItemCostPrice(
                                actualIndex,
                                parseFloat(e.target.value) || 0.01,
                              )
                            }
                            className={cn(
                              'font-mono text-xs h-7 min-w-[80px]',
                              item.Cost_Price < 0.01 && 'border-red-500 focus:border-red-500',
                            )}
                            min="0.01"
                            max="1000000"
                            step="0.01"
                          />
                        </td>
                        <td className="border border-gray-200 p-2">
                          <Input
                            type="number"
                            value={item.Selling_Price}
                            onChange={e =>
                              updateCsvItemSellingPrice(
                                actualIndex,
                                parseFloat(e.target.value) || 0.01,
                              )
                            }
                            className={cn(
                              'font-mono text-xs h-7 min-w-[80px]',
                              item.Selling_Price < 0.01 && 'border-red-500 focus:border-red-500',
                            )}
                            min="0.01"
                            max="1000000"
                            step="0.01"
                          />
                        </td>
                        <td className="border border-gray-200 p-2">
                          {item.Expiry_Date ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={item.Expiry_Date}
                                onChange={e => updateCsvItemExpiry(actualIndex, e.target.value)}
                                className="text-xs h-7 min-w-[120px]"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value=""
                                onChange={e => updateCsvItemExpiry(actualIndex, e.target.value)}
                                placeholder={t('preview.selectDate')}
                                className="text-xs h-7 min-w-[120px] border-red-300 focus:border-red-500"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {currentItems.map((item, index) => {
                const actualIndex = startIndex + index
                return (
                  <div
                    key={actualIndex}
                    className="border border-gray-200 rounded-2xl p-3 bg-white"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.SKU}
                          onChange={e => updateCsvItemSku(actualIndex, e.target.value)}
                          className="font-mono text-xs h-7 flex-1"
                          placeholder="SKU"
                          maxLength={100}
                        />
                      </div>
                      <Input
                        value={item.Product_Name}
                        onChange={e => updateCsvItemProductName(actualIndex, e.target.value)}
                        className="font-medium text-sm h-8"
                        placeholder="Product Name"
                        maxLength={255}
                      />
                      <div className="text-xs font-medium text-gray-700 bg-gray-50 p-2 rounded-lg">
                        Category: {getCategoryLabel(item.Category)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{t('preview.quantityLabel')}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCsvItemQuantity(actualIndex, item.Quantity - 1)}
                            disabled={item.Quantity <= 1}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-[30px] text-center font-mono text-sm">
                            {item.Quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCsvItemQuantity(actualIndex, item.Quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-700">
                            {t('preview.table.costPrice')}
                          </label>
                          <Input
                            type="number"
                            value={item.Cost_Price}
                            onChange={e =>
                              updateCsvItemCostPrice(
                                actualIndex,
                                parseFloat(e.target.value) || 0.01,
                              )
                            }
                            className={cn(
                              'text-sm h-8',
                              item.Cost_Price < 0.01 && 'border-red-500 focus:border-red-500',
                            )}
                            min="0.01"
                            max="1000000"
                            step="0.01"
                          />
                          {item.Cost_Price < 0.01 && (
                            <span className="text-xs text-red-600">
                              {t('csvUpload.errors.priceTooLow')}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-700">
                            {t('preview.table.sellingPrice')}
                          </label>
                          <Input
                            type="number"
                            value={item.Selling_Price}
                            onChange={e =>
                              updateCsvItemSellingPrice(
                                actualIndex,
                                parseFloat(e.target.value) || 0.01,
                              )
                            }
                            className={cn(
                              'text-sm h-8',
                              item.Selling_Price < 0.01 && 'border-red-500 focus:border-red-500',
                            )}
                            min="0.01"
                            max="1000000"
                            step="0.01"
                          />
                          {item.Selling_Price < 0.01 && (
                            <span className="text-xs text-red-600">
                              {t('csvUpload.errors.priceTooLow')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">
                          {t('preview.table.expiryDate')}
                        </label>
                        {item.Expiry_Date ? (
                          <Input
                            type="date"
                            value={item.Expiry_Date}
                            onChange={e => updateCsvItemExpiry(actualIndex, e.target.value)}
                            className="text-sm h-8"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        ) : (
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value=""
                              onChange={e => updateCsvItemExpiry(actualIndex, e.target.value)}
                              placeholder={t('preview.selectDate')}
                              className="text-sm h-8 border-yellow-300 focus:border-yellow-500"
                              min={new Date().toISOString().split('T')[0]}
                            />
                            <span className="text-xs text-yellow-600">
                              {t('preview.missingExpiryDate')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Upload Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={isUploading || columnMapping.itemsWithoutExpiry > 0 || hasInvalidPricing}
                className="flex-1"
                size="lg"
                title={
                  hasInvalidPricing ? t('csvUpload.errors.invalidPricingDescription') : undefined
                }
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
                {t('buttons.reset')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results Display */}
      {uploadResult && (
        <Card className="p-6 bg-primary-50 border-none">
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <div className="text-center flex items-center gap-2">
                <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                <Typography variant="h4">{uploadResult.processed || 0} items imported!</Typography>
              </div>
            </div>

            {/* Success Summary */}
            <div className="text-center p-3 bg-white rounded-2xl space-y-2">
              <Typography variant="p" color="primary">
                {(uploadResult.processed || 0) > 0
                  ? t('results.successSummary', {
                      processed: uploadResult.processed || 0,
                    })
                  : t('results.uploadCompleted')}
                {(uploadResult.skipped || 0) > 0 &&
                  t('results.duplicatesSkipped', {
                    skipped: uploadResult.skipped,
                  })}
              </Typography>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {uploadResult.processed || 0}
                </div>
                <Typography variant="p" color="muted">
                  {t('results.metrics.processed')}
                </Typography>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {uploadResult.skipped || 0}
                </div>
                <Typography variant="p" color="muted">
                  {t('results.metrics.skipped')}
                </Typography>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.performance_metrics?.items_per_second || 0}
                </div>
                <Typography variant="p" color="muted">
                  {t('results.metrics.itemsPerSec')}
                </Typography>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {uploadResult.processing_time_ms || 0}ms
                </div>
                <Typography variant="p" color="muted">
                  {t('results.metrics.totalTime')}
                </Typography>
              </div>
            </div>

            {/* Detailed Performance Breakdown */}
            {/* {uploadResult.performance_metrics && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-primary-200 space-y-2 flex flex-col">
                <Typography
                  variant="h4"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4 text-blue-500" />
                  {t('results.performance.title')}
                </Typography>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {uploadResult.performance_metrics.duplicate_detection_ms >
                    0 && (
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-orange-600">
                        {
                          uploadResult.performance_metrics
                            .duplicate_detection_ms
                        }
                        ms
                      </div>
                      <div className="text-gray-600">
                        {t('results.performance.duplicateCheck')}
                      </div>
                    </div>
                  )}
                  {uploadResult.performance_metrics.product_resolution_ms >
                    0 && (
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-cyan-600">
                        {uploadResult.performance_metrics.product_resolution_ms}
                        ms
                      </div>
                      <div className="text-gray-600">
                        {t('results.performance.productResolution')}
                      </div>
                    </div>
                  )}
                  {uploadResult.performance_metrics.batch_insertion_ms > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-indigo-600">
                        {uploadResult.performance_metrics.batch_insertion_ms}ms
                      </div>
                      <div className="text-gray-600">
                        {t('results.performance.batchInsertion')}
                      </div>
                    </div>
                  )}
                  {uploadResult.performance_metrics.products_created &&
                    uploadResult.performance_metrics.products_created > 0 && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-emerald-600">
                          {uploadResult.performance_metrics.products_created}
                        </div>
                        <div className="text-gray-600">
                          {t('results.performance.productsCreated')}
                        </div>
                      </div>
                    )}
                  {uploadResult.performance_metrics
                    .database_processing_time_ms &&
                    uploadResult.performance_metrics
                      .database_processing_time_ms > 0 && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-purple-600">
                          {
                            uploadResult.performance_metrics
                              .database_processing_time_ms
                          }
                          ms
                        </div>
                        <div className="text-gray-600">
                          {t('results.performance.dbProcessing')}
                        </div>
                      </div>
                    )}
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {t('results.performance.optimization', {
                    percentage: Math.max(
                      0,
                      Math.round(
                        (1 -
                          (uploadResult.processing_time_ms || 0) /
                            (uploadResult.total_items * 50)) *
                          100
                      )
                    ),
                  })}
                </div>
              </div>
            )} */}

            {/* Duplicate Details */}
            {/* {uploadResult.duplicates_skipped?.length > 0 && (
              <details className="bg-white rounded-2xl p-4 border">
                <summary className="cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
                  <SkipForward className="h-4 w-4" />
                  {t('results.duplicates.viewSkipped', {
                    count: uploadResult.duplicates_skipped.length,
                  })}
                </summary>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {uploadResult.duplicates_skipped.map(
                    (
                      dup: {
                        sku: string
                        product_name: string
                        expiry_date: string
                        reason: string
                      },
                      index: number
                    ) => (
                      <div
                        key={`duplicate-${dup.sku || index}`}
                        className="text-sm p-2 bg-gray-50 rounded-2xl border-l-4 border-yellow-400"
                      >
                        <div className="font-semibold">
                          {dup.sku} - {dup.product_name}
                        </div>
                        <div className="text-gray-600">
                          {t('results.duplicates.expiry')}: {dup.expiry_date} •{' '}
                          {dup.reason}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </details>
            )} */}

            {/* Action Button */}
            <Button size="lg" onClick={handleReset} className="w-full mt-4">
              {t('buttons.uploadAnother')}
            </Button>
          </div>
        </Card>
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
