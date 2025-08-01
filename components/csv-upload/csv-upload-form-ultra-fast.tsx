'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileCheck, CheckCircle, Zap, Clock, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFastCsvUpload } from '@/hooks/use-fast-csv-upload'
import { toast } from 'sonner'

interface CSVUploadFormProps {
  storeId: string
  onUploadComplete?: (result: unknown) => void
}

export function UltraFastCSVUploadForm({ storeId }: CSVUploadFormProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    csvPreview,
    isPreviewReady,
    analyzeFile,
    upload,
    reset,
    isUploading,
    uploadResult,
    error,
  } = useFastCsvUpload()

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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return
    }

    setSelectedFile(file)

    try {
      await analyzeFile(file)
    } catch (error) {
      console.error('File analysis failed:', error)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (!storeId) {
      toast.error('Store information is missing. Please refresh and try again.')
      return
    }

    try {
      upload({ file: selectedFile, storeId })
    } catch (error) {
      console.error('Upload initiation error:', error)
      toast.error('Failed to start upload. Please try again.')
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Ultra-Fast Upload Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Ultra-Fast CSV Upload</h2>
          <Zap className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-gray-600">Lightning-fast processing with automatic duplicate skipping</p>
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
                <h3 className="font-semibold text-lg">Drop your CSV file here</h3>
                <p className="text-gray-600">or click to browse</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                Choose File
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Simple Preview */}
      {isPreviewReady && csvPreview.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Preview (First 10 rows)</h3>
              <Badge variant="secondary">Duplicates auto-skipped during upload</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">SKU</th>
                    <th className="border border-gray-200 p-2 text-left">Product Name</th>
                    <th className="border border-gray-200 p-2 text-left">Category</th>
                    <th className="border border-gray-200 p-2 text-left">Qty</th>
                    <th className="border border-gray-200 p-2 text-left">Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.slice(0, 10).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-2 font-mono text-xs">{item.SKU}</td>
                      <td className="border border-gray-200 p-2">{item.Product_Name}</td>
                      <td className="border border-gray-200 p-2">
                        <Badge variant="outline" className="text-xs">
                          {item.Category}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 p-2 text-center">{item.Quantity}</td>
                      <td className="border border-gray-200 p-2 font-mono text-xs">
                        {item.Expiry_Date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upload Actions */}
            <div className="flex gap-3">
              <Button onClick={handleUpload} disabled={isUploading} className="flex-1" size="lg">
                {isUploading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upload (Auto-skip duplicates)
                  </>
                )}
              </Button>

              <Button onClick={handleReset} variant="outline" disabled={isUploading}>
                Reset
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
              <h3 className="font-semibold text-green-800 text-lg">Upload Complete! 🎉</h3>
            </div>

            {/* Success Summary */}
            <div className="text-center p-3 bg-white rounded border border-green-300">
              <p className="text-green-800 font-medium">
                {uploadResult.processed || 0 > 0
                  ? `Successfully processed ${uploadResult.processed || 0} items`
                  : 'Upload completed'}
                {(uploadResult.skipped || 0) > 0 && ` • ${uploadResult.skipped} duplicates skipped`}
              </p>
              {uploadResult.processing_time_ms && (
                <p className="text-sm text-green-600 mt-1">
                  ⚡ Completed in {uploadResult.processing_time_ms}ms
                </p>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.processed || 0}
                </div>
                <div className="text-sm text-gray-600">Processed</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {uploadResult.skipped || 0}
                </div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.performance_metrics?.items_per_second || 0}
                </div>
                <div className="text-sm text-gray-600">Items/sec</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {uploadResult.processing_time_ms || 0}ms
                </div>
                <div className="text-sm text-gray-600">Total time</div>
              </div>
            </div>

            {/* Duplicate Details */}
            {uploadResult.duplicates_skipped?.length > 0 && (
              <details className="bg-white rounded p-4 border">
                <summary className="cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
                  <SkipForward className="h-4 w-4" />
                  View Skipped Duplicates ({uploadResult.duplicates_skipped.length})
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
                          Expiry: {dup.expiry_date} • {dup.reason}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </details>
            )}

            {/* Action Button */}
            <Button onClick={handleReset} className="w-full">
              Upload Another File
            </Button>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Performance Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-center text-sm text-blue-800">
          <div className="font-semibold mb-1">⚡ Ultra-Fast Performance</div>
          <div>
            • 100 items in &lt;10 seconds • Automatic duplicate skipping • Real-time metrics • Zero
            complex decisions needed
          </div>
        </div>
      </Card>
    </div>
  )
}
