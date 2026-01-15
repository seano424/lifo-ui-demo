'use client'

import { Loader2, FileImage } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { OCR_CONFIG } from '@/lib/api/ocr-config'

interface OCRProcessingStateProps {
  fileName: string
  fileSize: number
}

export function OCRProcessingState({ fileName, fileSize }: OCRProcessingStateProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        {/* Animated spinner */}
        <div className="relative">
          <Loader2 className="h-16 w-16 text-primary-500 animate-spin" />
          <FileImage className="h-8 w-8 text-primary-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Processing message */}
        <div className="text-center space-y-2">
          <Typography variant="h3" className="text-gray-800">
            Processing delivery note...
          </Typography>
          <Typography variant="p" className="text-gray-600 text-sm">
            {OCR_CONFIG.isMock
              ? 'Extracting items from mock delivery note'
              : 'Using AI to read and extract items from your image'}
          </Typography>
        </div>

        {/* File info */}
        <div className="bg-gray-50 rounded-lg p-4 w-full max-w-md">
          <div className="flex items-center gap-3">
            <FileImage className="h-10 w-10 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm  text-gray-800 truncate">{fileName}</p>
              <p className="text-xs text-gray-500">{(fileSize / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full max-w-md">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            This usually takes 2-3 seconds...
          </p>
        </div>
      </div>
    </Card>
  )
}
