// lib/queries/todos-rpc-v2.ts - Updated with flexible filtering

import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'

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
  product_name?: string
  days_to_expiry_max?: number
  days_to_expiry_min?: number
}

// Todo item type returned from the RPC function
export type TodoItem = {
  batch_id: string
  store_id: string
  batch_number: string
  product_name: string
  product_brand: string | null
  current_quantity: number
  last_action_type:
    | 'discount'
    | 'donate'
    | 'dispose'
    | 'sold'
    | 'donate_prepared'
    | null
  last_action_time: string | null
  completion_status: 'pending' | 'in_progress' | 'completed'
  todo_state: string
  urgency_level: 'critical' | 'high' | 'medium' | 'low' | 'none'
  days_to_expiry: number
  priority_order: number
  expiry_date: string
  composite_score: number | null
  ai_recommendation: string | null
  last_discount_percent: number | null
  hours_since_last_action: number | null
  total_actions_ever: number
  view_refreshed_at: string
}

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
  { limit, offset }: { limit: number; offset: number }
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
  serverClient?: ServerClient
): Promise<{
  data: TodoItem[]
  count: number | null
  nextPage: number | undefined
  hasMore: boolean
}> {
  const supabase = serverClient || createClient()

  try {
    const { data, error, count } = await supabase.rpc('get_todos_by_section', {
      p_store_id: storeId,
      p_section_filter: section,
      p_limit: pageSize,
      p_offset: page * pageSize,
    })

    if (error) {
      console.error(
        `[fetchTodosBySection] Error for section ${section}:`,
        error
      )
      throw new Error(
        `Failed to fetch todos for section ${section}: ${error.message}`
      )
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
  } catch (err) {
    console.error(
      `[fetchTodosBySection] Unexpected error for section ${section}:`,
      err
    )
    throw err
  }
}

/**
 * Fetch dashboard summary - calls get_dashboard_summary
 */
export async function fetchDashboardSummary(
  storeId: string,
  serverClient?: ServerClient
): Promise<DashboardSummary> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_dashboard_summary', {
      p_store_id: storeId,
    })

    if (error) {
      console.error('[fetchDashboardSummary] Error:', error)
      throw new Error(`Failed to fetch dashboard summary: ${error.message}`)
    }

    return (
      data?.[0] || {
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
  } catch (err) {
    console.error('[fetchDashboardSummary] Unexpected error:', err)
    throw err
  }
}

/**
 * Fetch todos dashboard overview - calls get_todos_dashboard_overview
 */
export async function fetchTodosDashboardOverview(
  storeId: string,
  serverClient?: ServerClient
): Promise<TodosDashboardOverview[]> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_todos_dashboard_overview', {
      p_store_id: storeId,
    })

    if (error) {
      console.error('[fetchTodosDashboardOverview] Error:', error)
      throw new Error(`Failed to fetch dashboard overview: ${error.message}`)
    }

    return data || []
  } catch (err) {
    console.error('[fetchTodosDashboardOverview] Unexpected error:', err)
    throw err
  }
}

/**
 * NEW: Helper functions for common filter combinations
 */
export function createPendingFilter(
  additionalFilters?: Partial<TodoFilters>
): TodoFilters {
  return {
    completion_status: 'pending',
    ...additionalFilters,
  }
}

export function createInProgressFilter(
  additionalFilters?: Partial<TodoFilters>
): TodoFilters {
  return {
    completion_status: 'in_progress',
    ...additionalFilters,
  }
}

export function createCompletedFilter(
  additionalFilters?: Partial<TodoFilters>
): TodoFilters {
  return {
    completion_status: 'completed',
    ...additionalFilters,
  }
}

export function createUrgentFilter(
  urgencyLevels: TodoUrgencyLevel[] = ['critical', 'high']
): TodoFilters {
  return {
    urgency_level: urgencyLevels,
  }
}

export function createExpiringFilter(daysMax: number = 3): TodoFilters {
  return {
    days_to_expiry_max: daysMax,
    batch_status: ['active'],
  }
}
