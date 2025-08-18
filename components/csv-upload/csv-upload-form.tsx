'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Upload,
  FileCheck,
  CheckCircle,
  Zap,
  Clock,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCSVUpload } from '@/hooks/use-csv-upload'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const itemsPerPage = 10

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
  } = useCSVUpload()

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
    if (files && files[0]) {
      await handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (file: File) => {
    console.log('🔍 [CSV-UPLOAD-FORM] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    })

    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.warn('❌ [CSV-UPLOAD-FORM] Invalid file type:', file.name)
      toast.error(t('errors.invalidFile'))
      return
    }

    console.log('✅ [CSV-UPLOAD-FORM] Valid CSV file detected, setting selected file')
    setSelectedFile(file)

    try {
      console.log('📄 [CSV-UPLOAD-FORM] Starting file preview analysis...')
      const startTime = performance.now()
      await previewCsvFile(file)
      const endTime = performance.now()
      console.log(
        `✅ [CSV-UPLOAD-FORM] File preview completed in ${Math.round(endTime - startTime)}ms`,
      )
    } catch (error) {
      console.error('💥 [CSV-UPLOAD-FORM] File analysis failed:', error)
      toast.error(t('errors.analysisFailure'))
    }
  }

  const handleUpload = () => {
    console.log('🚀 [CSV-UPLOAD-FORM] Upload initiated')

    if (!selectedFile) {
      console.warn('❌ [CSV-UPLOAD-FORM] No file selected')
      toast.error(t('errors.noFile'))
      return
    }

    if (!storeId) {
      console.error('❌ [CSV-UPLOAD-FORM] No store ID provided')
      toast.error(t('errors.noStore'))
      return
    }

    console.log('🎯 [CSV-UPLOAD-FORM] Starting upload process:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      storeId,
      expectedItems: csvPreview.length,
      timestamp: new Date().toISOString(),
    })

    console.log('⚡ [CSV-UPLOAD-FORM] Calling mutation with BULK OPTIMIZATION ENABLED')

    try {
      upload({
        file: selectedFile,
        storeId,
        csvData: csvPreview, // Send the modified CSV data with individual expiry dates
      })
    } catch (error) {
      console.error('💥 [CSV-UPLOAD-FORM] Upload initiation error:', error)
      toast.error(t('errors.startFailed'))
    }
  }

  const handleReset = () => {
    console.log('🔄 [CSV-UPLOAD-FORM] Resetting form state')
    setSelectedFile(null)
    setCurrentPage(0)
    resetPreview()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    console.log('✅ [CSV-UPLOAD-FORM] Form reset complete')
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

  return (
    <div className="flex flex-col gap-6">
      {/* Ultra-Fast Upload Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <Zap className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      {/* File Upload Area */}
      <Card className="p-6">
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
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
              <FileCheck className="h-12 w-12 text-green-500 mx-auto" />
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
      {isPreviewReady && csvPreview.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-500" />
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
                      {t('preview.table.expiryDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => {
                    const actualIndex = startIndex + index
                    return (
                      <tr key={actualIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-2 font-mono text-xs">{item.SKU}</td>
                        <td className="border border-gray-200 p-2">{item.Product_Name}</td>
                        <td className="border border-gray-200 p-2">
                          <Badge variant="outline" className="text-xs">
                            {item.Category}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 p-2 text-center">{item.Quantity}</td>
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
                                placeholder="Select date"
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
                  <div key={actualIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{item.SKU}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.Category}
                        </Badge>
                      </div>
                      <div className="font-medium">{item.Product_Name}</div>
                      <div className="text-sm text-gray-600">Qty: {item.Quantity}</div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Expiry Date</label>
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
                              placeholder="Select date"
                              className="text-sm h-8 border-yellow-300 focus:border-yellow-500"
                              min={new Date().toISOString().split('T')[0]}
                            />
                            <span className="text-xs text-yellow-600">Missing expiry date</span>
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
                disabled={isUploading || columnMapping.itemsWithoutExpiry > 0}
                className="flex-1"
                size="lg"
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
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-green-800 text-lg">{t('results.title')}</h3>
            </div>

            {/* Success Summary */}
            <div className="text-center p-3 bg-white rounded border border-green-300">
              <p className="text-green-800 font-medium">
                {uploadResult.processed || 0 > 0
                  ? t('results.successSummary', { processed: uploadResult.processed || 0 })
                  : t('results.uploadCompleted')}
                {(uploadResult.skipped || 0) > 0 &&
                  t('results.duplicatesSkipped', { skipped: uploadResult.skipped })}
              </p>
              {uploadResult.processing_time_ms && (
                <p className="text-sm text-green-600 mt-1">
                  {t('results.completedIn', { time: uploadResult.processing_time_ms })}
                </p>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.processed || 0}
                </div>
                <div className="text-sm text-gray-600">{t('results.metrics.processed')}</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {uploadResult.skipped || 0}
                </div>
                <div className="text-sm text-gray-600">{t('results.metrics.skipped')}</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.performance_metrics?.items_per_second || 0}
                </div>
                <div className="text-sm text-gray-600">{t('results.metrics.itemsPerSec')}</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {uploadResult.processing_time_ms || 0}ms
                </div>
                <div className="text-sm text-gray-600">{t('results.metrics.totalTime')}</div>
              </div>
            </div>

            {/* Detailed Performance Breakdown */}
            {uploadResult.performance_metrics && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  {t('results.performance.title')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {uploadResult.performance_metrics.duplicate_detection_ms > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-orange-600">
                        {uploadResult.performance_metrics.duplicate_detection_ms}ms
                      </div>
                      <div className="text-gray-600">{t('results.performance.duplicateCheck')}</div>
                    </div>
                  )}
                  {uploadResult.performance_metrics.product_resolution_ms > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-cyan-600">
                        {uploadResult.performance_metrics.product_resolution_ms}ms
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
                      <div className="text-gray-600">{t('results.performance.batchInsertion')}</div>
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
                  {uploadResult.performance_metrics.database_processing_time_ms &&
                    uploadResult.performance_metrics.database_processing_time_ms > 0 && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-purple-600">
                          {uploadResult.performance_metrics.database_processing_time_ms}ms
                        </div>
                        <div className="text-gray-600">{t('results.performance.dbProcessing')}</div>
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
                          100,
                      ),
                    ),
                  })}
                </div>
              </div>
            )}

            {/* Duplicate Details */}
            {uploadResult.duplicates_skipped?.length > 0 && (
              <details className="bg-white rounded p-4 border">
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
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-gray-50 rounded border-l-4 border-yellow-400"
                      >
                        <div className="font-semibold">
                          {dup.sku} - {dup.product_name}
                        </div>
                        <div className="text-gray-600">
                          {t('results.duplicates.expiry')}: {dup.expiry_date} • {dup.reason}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </details>
            )}

            {/* Action Button */}
            <Button onClick={handleReset} className="w-full">
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

      {/* Performance Info */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="text-center text-sm text-blue-800">
          <div className="font-semibold mb-2 flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            {t('performanceInfo.title')}
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>• {t('performanceInfo.features.bulkOps')}</div>
            <div>• {t('performanceInfo.features.autoDuplicate')}</div>
            <div>• {t('performanceInfo.features.realtime')}</div>
            <div>• {t('performanceInfo.features.target')}</div>
          </div>
          <div className="mt-2 text-xs text-purple-700 font-medium">
            {t('performanceInfo.footer')}
          </div>
        </div>
      </Card>
    </div>
  )
}
