import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  metadata: {
    store_id: string
    processed_at: string
    processed_by: string
  }
}

interface ProcessedItem {
  row_number: number
  sku: string
  product_name: string
  status: 'success' | 'error' | 'warning'
  batch_id?: string
  product_id?: string
  error_message?: string
}

export function useCSVUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      storeId,
    }: {
      file: File
      storeId: string
    }): Promise<CSVUploadResponse> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', storeId)

      // Use Next.js API route with dual processor fallback
      const response = await fetch('/api/inventory/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Upload failed: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (data, { storeId }) => {
      // Invalidate inventory queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['store-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['expiring-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['batches', storeId] })

      // Cache upload results for error review
      queryClient.setQueryData(['csv-upload-results'], data)

      // Success notification
      const processorUsed =
        data.processor_used === 'unified_python' ? 'Advanced Python' : 'JavaScript Fallback'
      toast.success(`Successfully imported ${data.processed} of ${data.total_items} products`, {
        description: `Processed with ${processorUsed} processor`,
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`, {
        description: 'Please check your CSV format and try again',
        duration: 5000,
      })
    },
  })
}

// Sample CSV download hook
export function useDownloadSampleCSV() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/csv/sample')
      if (!response.ok) {
        throw new Error('Failed to download sample CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lifo-inventory-sample.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Sample CSV downloaded successfully')
    },
    onError: () => {
      toast.error('Failed to download sample CSV')
    },
  })
}
