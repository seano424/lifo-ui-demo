// Ultra-Fast CSV Upload Component Example
// Shows how simple the new system is to use

import React from 'react'
import { useFastCsvUpload } from '@/hooks/use-fast-csv-upload'

export function UltraFastCsvUpload({ storeId }: { storeId: string }) {
  const {
    csvPreview,
    isPreviewReady,
    analyzeFile,
    upload,
    reset,
    isAnalyzing,
    isUploading,
    uploadResult
  } = useFastCsvUpload()

  const handleFileSelect = async (file: File) => {
    if (!file) return
    
    try {
      await analyzeFile(file)
    } catch (error) {
      console.error('File analysis failed:', error)
    }
  }

  const handleUpload = (file: File) => {
    upload({ file, storeId })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">⚡ Ultra-Fast CSV Upload</h2>
      
      {/* File Input */}
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
        }}
        className="border p-2 rounded"
      />

      {/* Simple Preview */}
      {isPreviewReady && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">📋 Preview (First 10 rows)</h3>
          <div className="text-sm text-gray-600 mb-2">
            Duplicates will be automatically skipped during upload
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2">SKU</th>
                  <th className="border p-2">Product Name</th>
                  <th className="border p-2">Category</th>
                  <th className="border p-2">Quantity</th>
                  <th className="border p-2">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.slice(0, 10).map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">{item.SKU}</td>
                    <td className="border p-2">{item.Product_Name}</td>
                    <td className="border p-2">{item.Category}</td>
                    <td className="border p-2">{item.Quantity}</td>
                    <td className="border p-2">{item.Expiry_Date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upload Button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                const file = fileInput?.files?.[0]
                if (file) handleUpload(file)
              }}
              disabled={isUploading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploading ? '🚀 Uploading...' : '⚡ Upload (Auto-skip duplicates)'}
            </button>
            
            <button
              onClick={reset}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResult && (
        <div className="border rounded p-4 bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">🎉 Upload Complete!</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold">Processed</div>
              <div className="text-lg text-green-600">{uploadResult.processed}</div>
            </div>
            
            <div>
              <div className="font-semibold">Skipped</div>
              <div className="text-lg text-yellow-600">{uploadResult.skipped}</div>
            </div>
            
            <div>
              <div className="font-semibold">Speed</div>
              <div className="text-lg text-blue-600">
                {uploadResult.performance_metrics.items_per_second} items/sec
              </div>
            </div>
            
            <div>
              <div className="font-semibold">Time</div>
              <div className="text-lg text-purple-600">
                {uploadResult.processing_time_ms}ms
              </div>
            </div>
          </div>

          {/* Duplicate Details */}
          {uploadResult.duplicates_skipped.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-gray-700">
                View Skipped Duplicates ({uploadResult.duplicates_skipped.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {uploadResult.duplicates_skipped.map((dup, index) => (
                  <div key={index} className="text-sm text-gray-600 border-b py-1">
                    <strong>{dup.sku}</strong> - {dup.product_name} (Expiry: {dup.expiry_date})
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/* 
Usage in your component:

import { UltraFastCsvUpload } from '@/examples/ultra-fast-csv-usage'

function MyPage() {
  return (
    <div>
      <UltraFastCsvUpload storeId="your-store-id" />
    </div>
  )
}

Expected Performance:
- 10 items: < 2 seconds
- 100 items: < 10 seconds  
- 1000 items: < 60 seconds
- Automatic duplicate skipping
- Real-time performance metrics
- Zero complex UI decisions needed!
*/