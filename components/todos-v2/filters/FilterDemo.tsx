'use client'

import { useState } from 'react'
import { TodoFiltersPanel, type TodoFiltersState } from './TodoFiltersPanel'
import {
  useTodosWithFilters,
  usePendingTodos,
  useInProgressTodos,
  useCompletedTodos
} from '@/hooks/use-todos-with-filters'
import type { TodoFilters } from '@/lib/queries/todos-rpc-v2'

export function FilterDemo() {
  const [filters, setFilters] = useState<TodoFiltersState>({
    sortConfig: { field: 'urgency', direction: 'desc' }
  })

  // Convert our UI filters to the backend TodoFilters format
  const backendFilters: TodoFilters = {
    urgency_level: filters.urgency_level,
    action_type: filters.action_type,
    batch_status: filters.batch_status,
    product_name: filters.product_name,
  }

  // Example: Use the flexible hook
  const { data: allTodos, isLoading } = useTodosWithFilters(backendFilters)

  // Example: Use status-specific hooks with additional filters
  const { data: urgentPending } = usePendingTodos({
    urgency_level: ['critical', 'high'],
    batch_status: ['active']
  })

  const { data: discountInProgress } = useInProgressTodos({
    action_type: ['discount']
  })

  const { data: recentCompleted } = useCompletedTodos()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Filter Components Demo</h2>

      {/* Filter Panel */}
      <TodoFiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">All Filtered Todos</h3>
          <p className="text-2xl font-bold">{allTodos?.length || 0}</p>
          <p className="text-sm text-muted-foreground">
            With current filters
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Urgent Pending</h3>
          <p className="text-2xl font-bold text-red-600">{urgentPending?.length || 0}</p>
          <p className="text-sm text-muted-foreground">
            Critical + High priority
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Discount In Progress</h3>
          <p className="text-2xl font-bold text-orange-600">{discountInProgress?.length || 0}</p>
          <p className="text-sm text-muted-foreground">
            Currently being discounted
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Recently Completed</h3>
          <p className="text-2xl font-bold text-green-600">{recentCompleted?.length || 0}</p>
          <p className="text-sm text-muted-foreground">
            All completed todos
          </p>
        </div>
      </div>

      {/* Debug Info */}
      <details className="border rounded p-4">
        <summary className="cursor-pointer font-semibold">
          Debug: Filter State
        </summary>
        <pre className="mt-2 text-sm bg-muted p-2 rounded">
          {JSON.stringify({ filters, backendFilters }, null, 2)}
        </pre>
      </details>
    </div>
  )
}