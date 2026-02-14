'use client'

import React from 'react'

interface QueryErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class QueryErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  QueryErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log detailed error information
    console.error('🔴 QueryErrorBoundary caught an error:')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Component stack:', errorInfo.componentStack)

    // Check if it's the QueryClient error
    if (error.message?.includes('No QueryClient set')) {
      console.error('🔴 REACT QUERY ERROR: No QueryClient available!')
      console.error(
        'This usually means a component is using React Query hooks before the provider is ready',
      )
      console.error('Component stack trace:', errorInfo.componentStack)
    }

    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-8 border border-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            React Query Error
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-2">{this.state.error?.message}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
              Show error details
            </summary>
            <pre className="mt-2 text-xs overflow-auto p-4 bg-red-100 dark:bg-red-900 rounded">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}
