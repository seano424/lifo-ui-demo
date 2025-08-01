'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Package, RefreshCw, XCircle, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

interface CSVSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: CSVUploadResponse
  storeId: string
}

export function CSVSuccessModal({ open, onOpenChange, result, storeId }: CSVSuccessModalProps) {
  const router = useRouter()

  const handleViewInventory = () => {
    onOpenChange(false)
    router.push(`/dashboard/stores/${storeId}/inventory`)
  }

  const breakdown = result.breakdown || {
    new_products: 0,
    updated_products: 0,
    new_batches: result.processed,
    unchanged: 0,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {result.processed} items imported!
          </DialogTitle>
          <DialogDescription className="text-base">
            Your CSV upload has been processed successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import Breakdown */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-900">Import Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {breakdown.new_products && breakdown.new_products > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span>{breakdown.new_products} new products</span>
                </div>
              )}
              {breakdown.updated_products && breakdown.updated_products > 0 && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                  <span>{breakdown.updated_products} updated products</span>
                </div>
              )}
              {breakdown.new_batches && breakdown.new_batches > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{breakdown.new_batches} inventory batches</span>
                </div>
              )}
              {breakdown.unchanged && breakdown.unchanged > 0 && (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-gray-400">•</span>
                  <span>{breakdown.unchanged} unchanged</span>
                </div>
              )}
            </div>
          </div>

          {/* Warnings and Errors */}
          {result.warnings.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {result.warnings.length} warnings
              </Badge>
              <span className="text-sm text-gray-600">Minor issues handled automatically</span>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">{result.errors.length} items with errors</span>
            </div>
          )}

          {/* Processing Info */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            Processed with{' '}
            {result.processor_used === 'unified_python' ? 'Advanced Python' : 'JavaScript'} engine
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Done
          </Button>
          <Button onClick={handleViewInventory} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
