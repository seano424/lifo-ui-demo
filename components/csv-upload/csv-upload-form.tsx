'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCSVUpload, useDownloadSampleCSV } from '@/hooks/use-csv-upload'
import { toast } from 'sonner'
import { CSVSuccessModal } from './csv-success-modal'

import {
  DuplicateWarning,
  DuplicateDetectionResult,
  ExistingBatch,
} from '@/types/duplicate-detection'

interface CSVUploadResponse {
  success: boolean
  processed: number
  total_items: number
  valid_items: number
  errors: string[]
  warnings: string[]
  store_id: string
  processor_used: 'unified_python' | 'fallback_javascript'
  message: string
  // Enhanced response data for better UX
  breakdown?: {
    new_products?: number
    updated_products?: number
    new_batches?: number
    unchanged?: number
  }
}

interface CSVUploadFormProps {
  storeId: string
  onUploadComplete?: (result: CSVUploadResponse) => void
}

interface CSVPreviewData {
  headers: string[]
  rows: string[][]
  totalRows: number
  compatibility: {
    compatible: boolean
    missingColumns: string[]
    extraColumns: string[]
    issues: string[]
  }
  duplicateDetection?: DuplicateDetectionResult
}

const REQUIRED_COLUMNS = ['Product_Name', 'Quantity']
const OPTIONAL_COLUMNS = ['SKU', 'Category', 'Price', 'Location_Code', 'Expiration_Date', 'Brand']
const ALL_SUPPORTED_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

export function CSVUploadForm({ storeId, onUploadComplete }: CSVUploadFormProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useFastCsvUpload()
  const uploadResult = uploadMutation.data

  const detectDuplicateBatches = async (
    rows: string[][],
    headers: string[],
  ): Promise<DuplicateDetectionResult> => {
    const duplicates: DuplicateWarning[] = []

    // Find column indices
    const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'))
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
    const quantityIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))
    const expiryIndex = headers.findIndex(
      h => h.toLowerCase().includes('expiry') || h.toLowerCase().includes('expiration'),
    )

    for (const [rowIndex, row] of rows.entries()) {
      const sku = row[skuIndex]?.trim()
      const productName = row[nameIndex]?.trim()
      const quantity = parseInt(row[quantityIndex]?.trim() || '0')
      const expiryDate = row[expiryIndex]?.trim()

      if (!sku || !productName || !quantity || !expiryDate) continue

      try {
        // Check for existing batches with same product and expiry date
        const response = await fetch(`/api/inventory/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            sku,
            expiryDate,
          }),
        })

        if (response.ok) {
          const existingBatches: ExistingBatch[] = await response.json()

          if (existingBatches.length > 0) {
            const totalExisting = existingBatches.reduce(
              (sum, batch) => sum + batch.current_quantity,
              0,
            )
            const batchNumbers = existingBatches.map(batch => batch.batch_number)
            const batchIds = existingBatches.map(batch => batch.batch_id)

            duplicates.push({
              sku,
              productName,
              expiryDate,
              newQuantity: quantity,
              existingQuantity: totalExisting,
              existingBatchNumbers: batchNumbers,
              existingBatchIds: batchIds,
              action: 'MERGE', // Default action
            })
          }
        } else {
          console.error(
            `Duplicate check API failed for ${sku}:`,
            response.status,
            await response.text(),
          )
        }
      } catch (error) {
        console.error(`Failed to check duplicates for ${sku}:`, error)
      }
    }

    return {
      duplicates,
      hasConflicts: duplicates.length > 0,
      totalConflicts: duplicates.length,
    }
  }

  const parseCSVFile = async (file: File): Promise<CSVPreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())

          if (lines.length === 0) {
            reject(new Error('Empty CSV file'))
            return
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          const previewRows = lines.slice(1, 21).map(
            (
              line, // Show first 20 rows for preview
            ) => line.split(',').map(cell => cell.trim().replace(/"/g, '')),
          )
          const allRows = lines
            .slice(1)
            .map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))

          // Check compatibility
          const missingColumns = REQUIRED_COLUMNS.filter(
            col =>
              !headers.some(
                h =>
                  h.toLowerCase().includes(col.toLowerCase()) ||
                  col.toLowerCase().includes(h.toLowerCase()),
              ),
          )

          const extraColumns = headers.filter(
            h =>
              !ALL_SUPPORTED_COLUMNS.some(
                col =>
                  h.toLowerCase().includes(col.toLowerCase()) ||
                  col.toLowerCase().includes(h.toLowerCase()),
              ),
          )

          const issues: string[] = []
          if (missingColumns.length > 0) {
            issues.push(`Missing required columns: ${missingColumns.join(', ')}`)
          }

          // Check for data quality issues (using preview rows)
          const dataIssues: string[] = []
          previewRows.forEach((row, rowIndex) => {
            // Check for incomplete rows
            if (row.length < headers.length) {
              dataIssues.push(
                `Row ${rowIndex + 2}: Missing data (${row.length}/${headers.length} columns)`,
              )
            }
            // Check for empty required fields
            const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
            const quantityIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))

            if (nameIndex >= 0 && (!row[nameIndex] || row[nameIndex].trim() === '')) {
              dataIssues.push(`Row ${rowIndex + 2}: Missing product name`)
            }
            if (quantityIndex >= 0 && (!row[quantityIndex] || isNaN(Number(row[quantityIndex])))) {
              dataIssues.push(`Row ${rowIndex + 2}: Invalid quantity value`)
            }
          })

          issues.push(...dataIssues.slice(0, 5)) // Show first 5 data issues

          // Check for duplicates (async operation) - check ALL rows, not just preview
          const duplicateDetection = await detectDuplicateBatches(allRows, headers)

          resolve({
            headers,
            rows: previewRows, // Use preview rows for display
            totalRows: lines.length - 1,
            compatibility: {
              compatible: missingColumns.length === 0,
              missingColumns,
              extraColumns,
              issues,
            },
            duplicateDetection,
          })
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleFileSelect = async (file: File) => {
    // Client-side validation
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast.error('File too large (max 10MB)')
      return
    }

    setSelectedFile(file)
    setIsProcessing(true)
    uploadMutation.reset() // Clear previous results

    try {
      const preview = await parseCSVFile(file)
      setCsvPreview(preview)
    } catch (error) {
      toast.error('Failed to parse CSV file')
      setCsvPreview(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadProgress(25)
      toast.info('Starting upload...', { duration: 2000 })

      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        storeId,
      })
      setUploadProgress(100)
      onUploadComplete?.(result)

      // Show appropriate feedback
      if (result.success) {
        if (result.processed > 0) {
          toast.success(`Successfully uploaded ${result.processed} items!`, { duration: 5000 })
          setShowSuccessModal(true)
        } else {
          toast.warning('Upload completed but no items were processed. Check for errors below.', {
            duration: 7000,
          })
        }
      } else {
        toast.error('Upload failed. Please check the errors below.', { duration: 7000 })
      }

      // Reset form after successful upload
      setTimeout(() => {
        if (result.success && result.processed > 0) {
          setSelectedFile(null)
          setCsvPreview(null)
        }
        setUploadProgress(0)
      }, 3000)
    } catch (error) {
      setUploadProgress(0)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Upload failed: ${errorMessage}`, { duration: 7000 })
      console.error('Upload error:', error)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setCsvPreview(null)
    uploadMutation.reset()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {!selectedFile ? (
          /* Upload Area */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Add data to inventory.products</h3>
              <p className="text-muted-foreground mt-1">
                Upload a CSV or TSV file. The first row should be the headers of the table.
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <Button variant="outline" className="flex-1">
                Upload CSV
              </Button>
              <Button variant="ghost" className="flex-1" disabled>
                Paste text
              </Button>
            </div>

            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                isProcessing ? 'pointer-events-none opacity-60' : '',
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <div className="space-y-3">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    Drag and drop, or <span className="text-green-600">browse</span> your files
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />

            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Headers should not include special characters other than hyphens
              (-) or underscores (_).
            </p>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                {showAdvanced ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Advanced mapping options
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Auto-mapping:</strong> SKU, Price, Location_Code will be auto-generated
                    if missing
                  </p>
                  <p>
                    <strong>Required fields:</strong> Product_Name, Quantity
                  </p>
                  <p>
                    <strong>Date format:</strong> YYYY-MM-DD HH:mm:ss
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          /* File Selected + Preview */
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRemoveFile}>
                <X className="w-4 h-4 mr-2" />
                Remove File
              </Button>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Parsing CSV file...</p>
              </div>
            )}

            {/* Upload Progress */}
            {(uploadMutation.isPending || uploadProgress > 0) && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>
                    {uploadMutation.isPending ? 'Uploading and processing...' : 'Upload complete'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Preview & Compatibility */}
            {csvPreview && (
              <div className="space-y-4">
                {/* Compatibility Status */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Preview data to be imported</span>
                      {!csvPreview.compatibility.compatible && (
                        <Badge variant="destructive">Data incompatible</Badge>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          A total of {csvPreview.totalRows} rows will be added to the table
                          "products"
                        </p>
                        <p>
                          Here is a preview of the data that will be added (up to the first 20
                          columns and first 20 rows).
                        </p>
                      </div>

                      {/* Data Preview Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                {csvPreview.headers.slice(0, 20).map((header, i) => (
                                  <th
                                    key={i}
                                    className="text-left p-3 font-medium whitespace-nowrap"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreview.rows.map((row, i) => (
                                <tr key={i} className="border-t">
                                  {row.slice(0, 20).map((cell, j) => (
                                    <td key={j} className="p-3 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Issues */}
                      {csvPreview.compatibility.issues.length > 0 && (
                        <Alert
                          variant={csvPreview.compatibility.compatible ? 'default' : 'destructive'}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>
                            {csvPreview.compatibility.compatible
                              ? 'Data Quality Warnings'
                              : 'Issues found in spreadsheet'}
                          </AlertTitle>
                          <AlertDescription>
                            {!csvPreview.compatibility.compatible && (
                              <p className="mb-2 font-medium">
                                This CSV cannot be imported into your table due to incompatible
                                headers:
                              </p>
                            )}
                            <ul className="mt-2 space-y-1">
                              {csvPreview.compatibility.issues.map((issue, i) => (
                                <li key={i} className="text-sm">
                                  • {issue}
                                </li>
                              ))}
                            </ul>
                            {csvPreview.compatibility.issues.length > 5 && (
                              <p className="text-sm mt-2 italic">
                                ...and {csvPreview.compatibility.issues.length - 5} more issues
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Duplicate Detection Warning */}
            {csvPreview?.duplicateDetection?.hasConflicts && (
              <Alert className="border-orange-500 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Duplicate Batches Detected</AlertTitle>
                <AlertDescription className="text-orange-700">
                  <div className="space-y-3">
                    <p className="font-medium">
                      Found {csvPreview.duplicateDetection.totalConflicts} items that already exist
                      with the same expiry date.
                    </p>
                    <div className="bg-orange-100 p-3 rounded border">
                      <p className="font-medium text-orange-800 text-sm">✅ What will happen:</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Duplicate batches will be skipped. New items will be added. You can update
                        existing inventory in your dashboard.
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleRemoveFile}>
                Cancel
              </Button>

              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className={cn(
                  csvPreview?.compatibility.compatible
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700',
                )}
              >
                {uploadMutation.isPending
                  ? 'Processing...'
                  : csvPreview?.duplicateDetection?.hasConflicts
                    ? `Import (${csvPreview.totalRows - csvPreview.duplicateDetection.totalConflicts} new, ${csvPreview.duplicateDetection.totalConflicts} duplicates skipped)`
                    : csvPreview?.compatibility.compatible
                      ? 'Import data'
                      : 'Import anyway'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Upload Results - Show for all completed uploads */}
      {uploadResult && <UploadResults result={uploadResult} />}

      {/* Success Modal */}
      {uploadResult && (
        <CSVSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          result={uploadResult}
          storeId={storeId}
        />
      )}
    </div>
  )
}

// Upload Results Component
interface UploadResultsProps {
  result: CSVUploadResponse
}

function UploadResults({ result }: UploadResultsProps) {
  const [showErrors, setShowErrors] = useState(false)
  const [showWarnings, setShowWarnings] = useState(false)

  // Transform technical errors into user-friendly messages
  const transformError = (
    error: string,
  ): {
    message: string
    solution: string
    type: 'duplicate' | 'permission' | 'data' | 'system'
  } => {
    if (error.includes('row-level security policy') && error.includes('store_products')) {
      return {
        message: 'Duplicate inventory detected - these products already exist in your store',
        solution:
          'Remove duplicate items from your CSV, or update existing inventory through the inventory management page',
        type: 'duplicate',
      }
    }
    if (error.includes('violates row-level security')) {
      return {
        message: 'Permission denied - you can only add inventory to stores you own',
        solution:
          "Make sure you're uploading to the correct store, or contact support if you believe this is an error",
        type: 'permission',
      }
    }
    if (error.includes('invalid input syntax') || error.includes('data type')) {
      return {
        message: 'Invalid data format detected in your CSV',
        solution: "Check that dates are in YYYY-MM-DD format and numbers don't contain letters",
        type: 'data',
      }
    }
    return {
      message: error,
      solution: 'Please try again or contact support if the problem persists',
      type: 'system',
    }
  }

  const transformedErrors = result.errors.map(transformError)
  const duplicateErrors = transformedErrors.filter(e => e.type === 'duplicate')
  const otherErrors = transformedErrors.filter(e => e.type !== 'duplicate')

  return (
    <div className="space-y-4">
      {/* Success Summary */}
      {result.success && result.processed > 0 && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Upload Successful!</AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="mt-2 space-y-1">
              <div className="font-medium">{result.message}</div>
              <div className="text-sm space-y-1">
                <div>
                  📊 Processed: {result.processed} of {result.total_items} items
                </div>
                <div>
                  🔧 Processor:{' '}
                  {result.processor_used === 'unified_python'
                    ? 'Advanced Python'
                    : 'JavaScript Fallback'}
                </div>
                <div>🏪 Store: {result.store_id}</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Duplicate Items Error */}
      {duplicateErrors.length > 0 && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Duplicate Items Detected</AlertTitle>
          <AlertDescription className="text-orange-700">
            <div className="space-y-3">
              <p className="font-medium">{duplicateErrors[0].message}</p>
              <div className="bg-orange-100 p-3 rounded border">
                <p className="font-medium text-orange-800 text-sm">💡 What you can do:</p>
                <p className="text-sm text-orange-700 mt-1">{duplicateErrors[0].solution}</p>
              </div>
              <p className="text-sm">
                <strong>{result.errors.length} items</strong> were rejected because they already
                exist in your inventory.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Other Errors Section */}
      {otherErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {otherErrors[0].type === 'permission'
              ? 'Permission Error'
              : otherErrors[0].type === 'data'
                ? 'Data Format Error'
                : `Processing Errors (${otherErrors.length})`}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium">{otherErrors[0].message}</p>
              <div className="bg-red-50 p-3 rounded border">
                <p className="font-medium text-red-800 text-sm">💡 Solution:</p>
                <p className="text-sm text-red-700 mt-1">{otherErrors[0].solution}</p>
              </div>

              {otherErrors.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowErrors(!showErrors)}
                  >
                    {showErrors ? 'Hide' : 'Show'} All Error Details ({otherErrors.length})
                  </Button>
                  {showErrors && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {otherErrors.map((error, index) => (
                        <div key={index} className="text-sm bg-red-50 p-2 rounded border">
                          <p className="font-medium">{error.message}</p>
                          <p className="text-xs text-red-600 mt-1">Solution: {error.solution}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings Section */}
      {result.warnings.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Business Rule Warnings ({result.warnings.length})
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowWarnings(!showWarnings)}
            >
              {showWarnings ? 'Hide' : 'Show'} Warning Details
            </Button>
            {showWarnings && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {result.warnings.map((warning, index) => (
                  <div key={index} className="text-sm bg-yellow-50 p-2 rounded border">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
