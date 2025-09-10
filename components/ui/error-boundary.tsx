'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryFallbackProps {
  error: Error
  retry: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Typography variant="p" color="muted" className="text-center">
            An error occurred while loading this step. Please try again or contact support if the
            problem persists.
          </Typography>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-3 rounded-2xl text-sm">
              <Typography variant="p" className="font-mono text-xs">
                {error.message}
              </Typography>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={retry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </div>

          <Typography variant="p" className="text-center text-xs text-muted-foreground">
            Need help?{' '}
            <a
              href="mailto:support@lifo.ai?subject=Onboarding Error"
              className="text-primary hover:underline"
            >
              Contact Support
            </a>
          </Typography>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const [, setError] = React.useState()

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])
}
