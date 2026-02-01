'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="m-4 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              An error occurred while loading this component. Please try refreshing the page or
              contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Error details (development only)
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <Button onClick={this.handleRetry} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  if (error) {
    throw error
  }

  return { captureError, resetError }
}

// Simple error fallback component
export function SimpleErrorFallback({
  error: _error,
  resetError,
}: {
  error: Error
  resetError: () => void
}) {
  const t = useTranslations('errors.common')

  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <Typography variant="h3">{t('somethingWrong')}</Typography>
      <Typography variant="p" color="muted">
        {t('unableToLoadContent')}
      </Typography>
      <Button onClick={resetError} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        {t('retry')}
      </Button>
    </div>
  )
}

// Specific error boundary for infinite scroll components
export function InfiniteScrollErrorBoundary({ children }: { children: ReactNode }) {
  const t = useTranslations('errors.common')

  return (
    <ErrorBoundary
      fallback={
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('unableToLoadMoreItems')}</p>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log infinite scroll specific errors
        console.error('Infinite scroll error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
