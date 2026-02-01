/**
 * Sync Error Alert Component
 * Displays user-friendly error messages for Square sync failures
 */

'use client'

import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { formatErrorForDisplay } from '@/lib/utils/error-parser'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useState } from 'react'

interface SyncErrorAlertProps {
  error: Error | null
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
}

export function SyncErrorAlert({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
}: SyncErrorAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (!error || isDismissed) return null

  const { title, message, suggestion, technical, canRetry } = formatErrorForDisplay(error)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <Alert variant="destructive" className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between pr-8">
        {title}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {suggestion && <p className="text-sm  mt-2">{suggestion}</p>}
        {technical && process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary className="text-xs cursor-pointer hover:underline">Technical Details</summary>
            <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
              {technical}
            </pre>
          </details>
        )}
        {canRetry && onRetry && (
          <div className="mt-3">
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
              className="bg-background hover:bg-background/80"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
