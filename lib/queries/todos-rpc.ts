import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import type { Database } from '@/types/supabase-extended'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Json } from '@/types/supabase'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Todo section types - these map to the RPC function section filters
export type TodoSection =
  | 'immediate_action'
  | 'recently_expired'
  | 'in_progress'
  | 'discounted'
  | 'ready_for_donation'
  | 'completed_today'
  | 'action_history'
  | 'needs_reeval'
  | 'all_active'

// NEW: Types for flexible filtering
export type TodoCompletionStatus = 'pending' | 'in_progress' | 'completed'
export type TodoUrgencyLevel = 'low' | 'medium' | 'high' | 'critical' | 'none'
export type TodoActionType =
  | 'discount'
  | 'donate'
  | 'dispose'
  | 'maintain'
  | 'ignored'
  | 'donate_prepared'
  | 'sold'
export type BatchStatus = 'active' | 'expired'

// NEW: Flexible filter interface
export interface TodoFilters {
  completion_status?: TodoCompletionStatus
  urgency_level?: TodoUrgencyLevel[]
  action_type?: TodoActionType[]
  batch_status?: BatchStatus[]
  lifecycle_status?: ('active' | 'expired')[]
  product_name?: string
  days_to_expiry_max?: number
  days_to_expiry_min?: number
}

// Todo item type returned from the RPC function - uses generated database type
export type TodoItem = Database['inventory']['Views']['batch_todo_states']['Row']

// Dashboard summary type
export type DashboardSummary = {
  total_active_batches: number
  needs_attention_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  ok_count: number
  needs_attention_percentage: number
  expired_items_count: number
  expired_items_value: number
}

// Dashboard overview type
export type TodosDashboardOverview = {
  todo_state: string
  item_count: number
  total_value: number
  avg_score: number
  urgency_distribution: Record<string, number>
}

// Page parameters for infinite queries
export type TodosPageParam = {
  page: number
  pageSize: number
}

/**
 * NEW: Fetch todos with flexible filtering - The main function you'll use!
 */
export async function fetchTodosWithFilters(
  storeId: string,
  filters: TodoFilters,
  { limit, offset }: { limit: number; offset: number },
): Promise<TodoItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_todos_with_filters', {
    p_store_id: storeId,
    p_filters: filters,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

/**
 * EXISTING: Fetch todos for a specific section with pagination (keep for backward compatibility)
 */
export async function fetchTodosBySection(
  storeId: string,
  section: TodoSection,
  { page, pageSize }: TodosPageParam,
  serverClient?: ServerClient,
): Promise<{
  data: TodoItem[]
  count: number | null
  nextPage: number | undefined
  hasMore: boolean
}> {
  return withPerformanceTracking(
    'lib/queries/todos-rpc',
    'fetchTodosBySection',
    { storeId, section, page, pageSize },
    async () => {
      const supabase = serverClient || createClient()

      // Type assertion needed as this RPC function may not be in generated types
      const { data, error, count } = await (
        supabase.rpc as unknown as (
          name: 'get_todos_by_section',
          params: {
            p_store_id: string
            p_section_filter: TodoSection
            p_limit: number
            p_offset: number
          },
        ) => Promise<{
          data: TodoItem[] | null
          error: PostgrestError | null
          count: number | null
        }>
      )('get_todos_by_section', {
        p_store_id: storeId,
        p_section_filter: section,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })

      if (error) {
        logger.queryWarn('lib/queries/todos-rpc', 'Error in fetchTodosBySection', {
          error: error.message,
          code: error.code,
          storeId,
          section,
        })
        throw new Error(`Failed to fetch todos for section ${section}: ${error.message}`)
      }

      const todos = (data || []) as TodoItem[]
      const hasMore = todos.length === pageSize
      const nextPage = hasMore ? page + 1 : undefined

      return {
        data: todos,
        count: count || null,
        nextPage,
        hasMore,
      }
    },
  )
}

/**
 * Fetch dashboard summary - calls get_dashboard_summary_json (optimized JSON version)
 */
export async function fetchDashboardSummary(
  storeId: string,
  serverClient?: ServerClient,
): Promise<DashboardSummary> {
  return withPerformanceTracking(
    'lib/queries/todos-rpc',
    'fetchDashboardSummary',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('get_dashboard_summary_json', {
        p_store_id: storeId,
      })

      if (error) {
        logger.queryWarn('lib/queries/todos-rpc', 'Error in fetchDashboardSummary', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch dashboard summary: ${error.message}`)
      }

      return (
        (data as DashboardSummary) || {
          total_active_batches: 0,
          needs_attention_count: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          ok_count: 0,
          needs_attention_percentage: 0,
          expired_items_count: 0,
          expired_items_value: 0,
        }
      )
    },
  )
}

/**
 * Fetch todos dashboard overview - calls get_todos_dashboard_overview
 */
export async function fetchTodosDashboardOverview(
  storeId: string,
  serverClient?: ServerClient,
): Promise<TodosDashboardOverview[]> {
  return withPerformanceTracking(
    'lib/queries/todos-rpc',
    'fetchTodosDashboardOverview',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('get_todos_dashboard_overview', {
        p_store_id: storeId,
      })

      if (error) {
        logger.queryWarn('lib/queries/todos-rpc', 'Error in fetchTodosDashboardOverview', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch dashboard overview: ${error.message}`)
      }

      return (data as TodosDashboardOverview[]) || []
    },
  )
}

/**
 * NEW: Helper functions for common filter combinations
 */
export function createPendingFilter(additionalFilters?: Partial<TodoFilters>): TodoFilters {
  return {
    completion_status: 'pending',
    ...additionalFilters,
  }
}

export function createInProgressFilter(additionalFilters?: Partial<TodoFilters>): TodoFilters {
  return {
    completion_status: 'in_progress',
    ...additionalFilters,
  }
}

export function createCompletedFilter(additionalFilters?: Partial<TodoFilters>): TodoFilters {
  return {
    completion_status: 'completed',
    ...additionalFilters,
  }
}

export function createUrgentFilter(
  urgencyLevels: TodoUrgencyLevel[] = ['critical', 'high'],
): TodoFilters {
  return {
    urgency_level: urgencyLevels,
  }
}

export function createExpiringFilter(daysMax: number = 3): TodoFilters {
  return {
    days_to_expiry_max: daysMax,
    lifecycle_status: ['active'],
  }
}

/**
 * Counts for all todo tabs
 */
export type TodoCounts = {
  total: number
  pending: number
  in_progress: number
  completed: number
  expiring: number
  expired: number
}

/**
 * Todo item with count metadata columns
 */
export interface TodoItemWithCounts extends TodoItem {
  total_count: number
  pending_count: number
  in_progress_count: number
  completed_count: number
  expiring_count: number
  expired_count: number
}

/**
 * Response type for fetchTodosWithCounts
 */
export type TodosWithCountsResponse = {
  data: TodoItem[]
  counts: TodoCounts
}

/**
 * NEW CONSOLIDATED FUNCTION: Fetch todos with counts in a single query
 * This replaces the separate fetchTodosWithFilters and fetchTodosCounts calls
 */
export async function fetchTodosWithCounts(
  storeId: string,
  filters: TodoFilters,
  { limit, offset }: { limit: number; offset: number },
): Promise<TodosWithCountsResponse> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_todos_with_counts', {
    p_store_id: storeId,
    p_filters: filters as unknown as Json,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error

  const typedData = data as TodoItemWithCounts[] | null

  if (!typedData || typedData.length === 0) {
    return {
      data: [],
      counts: {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        expiring: 0,
        expired: 0,
      },
    }
  }

  // Extract counts from first row (same on all rows due to window functions)
  const firstRow = typedData[0]
  const counts: TodoCounts = {
    total: firstRow.total_count,
    pending: firstRow.pending_count,
    in_progress: firstRow.in_progress_count,
    completed: firstRow.completed_count,
    expiring: firstRow.expiring_count,
    expired: firstRow.expired_count,
  }

  return { data: typedData as TodoItem[], counts }
}

/**
 * @deprecated Use fetchTodosWithCounts instead - this function will be removed in a future version
 * Fetch counts for all todo tabs with filters
 * Note: The old RPC doesn't return 'total', so we calculate it from the other counts
 */
export async function fetchTodosCounts(storeId: string, filters: TodoFilters): Promise<TodoCounts> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_todos_counts_with_filters', {
    p_store_id: storeId,
    p_filters: filters as unknown as Json,
  })

  if (error) throw error

  // Old RPC returns: {pending, in_progress, completed, expiring, expired}
  // But NOT 'total', so we calculate it
  const typedData = data as {
    pending: number
    in_progress: number
    completed: number
    expiring: number
    expired: number
  } | null
  const counts = typedData || { pending: 0, in_progress: 0, completed: 0, expiring: 0, expired: 0 }

  return {
    // Calculate total from completion statuses (not including expiring/expired since those overlap)
    total: (counts.pending || 0) + (counts.in_progress || 0) + (counts.completed || 0),
    pending: counts.pending || 0,
    in_progress: counts.in_progress || 0,
    completed: counts.completed || 0,
    expiring: counts.expiring || 0,
    expired: counts.expired || 0,
  }
}
