'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, FileCheck, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCSVUpload, useDownloadSampleCSV } from '@/hooks/use-csv-upload'
import { toast } from 'sonner'

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
}

interface CSVUploadFormProps {
  storeId: string
  onUploadComplete?: (result: CSVUploadResponse) => void
}

export function CSVUploadForm({ storeId, onUploadComplete }: CSVUploadFormProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const uploadMutation = useCSVUpload()
  const downloadSampleMutation = useDownloadSampleCSV()
  
  const isUploading = uploadMutation.isPending
  const uploadResult = uploadMutation.data
  
  const handleFileSelect = (file: File) => {
    // Client-side validation
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File too large (max 10MB)')
      return
    }
    
    setSelectedFile(file)
    uploadMutation.reset() // Clear previous results
  }
  
  const handleUpload = async () => {
    if (!selectedFile) return
    
    try {
      setUploadProgress(25)
      const result = await uploadMutation.mutateAsync({ 
        file: selectedFile, 
        storeId 
      })
      setUploadProgress(100)
      onUploadComplete?.(result)
      
      // Reset form after successful upload
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress(0)
      }, 2000)
    } catch (error) {
      setUploadProgress(0)
    }
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
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Upload Inventory CSV</h3>
            <p className="text-muted-foreground mt-1">
              Bulk import products and create inventory batches
            </p>
          </div>
          
          {/* Drag & Drop Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              selectedFile ? "border-green-500 bg-green-50" : "",
              isUploading ? "pointer-events-none opacity-60" : ""
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileCheck className="w-12 h-12 mx-auto text-green-600" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="font-medium">Drop CSV file here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          
          {/* Progress Bar */}
          {(isUploading || uploadProgress > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {isUploading ? 'Uploading and processing...' : 'Upload complete'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1"
            >
              {isUploading ? 'Processing...' : 'Upload & Process'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadSampleMutation.mutate()}
              disabled={downloadSampleMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              Sample CSV
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Upload Results */}
      {uploadResult && (
        <UploadResults result={uploadResult} />
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
  
  return (
    <div className="space-y-4">
      {/* Success Summary */}
      {result.success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Upload Successful!</AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="mt-2 space-y-1">
              <div className="font-medium">
                {result.message}
              </div>
              <div className="text-sm space-y-1">
                <div>📊 Processed: {result.processed} of {result.total_items} items</div>
                <div>🔧 Processor: {result.processor_used === 'unified_python' ? 'Advanced Python' : 'JavaScript Fallback'}</div>
                <div>🏪 Store: {result.store_id}</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Errors Section */}
      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Processing Errors ({result.errors.length})</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowErrors(!showErrors)}
            >
              {showErrors ? 'Hide' : 'Show'} Error Details
            </Button>
            {showErrors && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <div key={index} className="text-sm bg-red-50 p-2 rounded border">
                    {error}
                  </div>
                ))}
              </div>
            )}
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