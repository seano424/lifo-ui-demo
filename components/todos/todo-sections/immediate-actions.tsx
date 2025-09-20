'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useImmediateActionTodos } from '@/hooks/use-todos-sections'
import { AlertTriangle } from 'lucide-react'

export default function ImmediateActions() {
  const {
    data: todos,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useImmediateActionTodos()

  // Loading state for initial load
  if (isLoading) {
    return <Card>Loading</Card>
  }

  // Error state
  if (isError) {
    return <Card>Error</Card>
  }

  // Flatten the infinite query data
  const todosList = todos?.pages.flatMap((page) => page.data) || []

  // Empty state
  if (todosList.length === 0) {
    return <Card>Empty</Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {'title'}
          </div>
          <span className="text-sm font-normal bg-red-100 text-red-700 px-2 py-1 rounded-full">
            {todosList.length} {todosList.length === 1 ? 'item' : 'items'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {todosList.map((todo) => (
          <div
            key={todo.batch_id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {todo.product_name}
          </div>
        ))}

        {/* Infinite Loading */}
        {hasNextPage && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full"
            >
              {isFetchingNextPage ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  loading
                </>
              ) : (
                'loadMore'
              )}
            </Button>
          </div>
        )}

        {/* Loading indicator for next page */}
        {isFetchingNextPage && (
          <div className="space-y-3">
            <div
              key="loading-skeleton-1"
              className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
            >
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div
              key="loading-skeleton-2"
              className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
            >
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
