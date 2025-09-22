'use client'

import { TodoCard } from '@/components/todos/todo-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { useImmediateActionTodos } from '@/hooks/use-todos-sections'
import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

export default function ImmediateActions() {
  const {
    data: todos,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useImmediateActionTodos()

  // Intersection observer for auto-loading more items
  const { targetRef, isIntersecting } = useIntersectionObserver({
    enabled: hasNextPage && !isFetchingNextPage,
    rootMargin: '100px',
  })

  // Auto-fetch next page when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Loading state for initial load
  if (isLoading) {
    return <div>Loading</div>
  }

  // Error state
  if (isError) {
    return <div>Error</div>
  }

  // Flatten the infinite query data
  const todosList = todos?.pages.flatMap(page => page.data) || []

  // Empty state
  if (todosList.length === 0) {
    return <div>Empty</div>
  }

  console.log('🃏 todosList', todosList)

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 text-red-500" />
          Immediate Actions
        </div>
        <span className="text-sm font-normal bg-red-100 text-red-700 px-2 py-1 rounded-full">
          {todosList.length} {todosList.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="flex flex-col gap-8">
        {todosList.map(todo => (
          <TodoCard key={todo.batch_id} todo={todo} />
        ))}

        {/* Infinite Loading Sentinel */}
        {hasNextPage && (
          <div ref={targetRef} className="flex justify-center items-center pt-4 pb-2 min-h-[60px]">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading more items...</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground opacity-60">
                Scroll to load more ({todosList.length} loaded)
              </div>
            )}
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
      </div>
    </section>
  )
}
