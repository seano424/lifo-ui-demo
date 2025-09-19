// lib/queries/todos-rpc.ts

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
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
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

// Page parameters for infinite queries
export type TodosPageParam = {
  page: number
  pageSize: number
}

// Section-specific configuration for optimization
export const sectionConfigs: Record<
  TodoSection,
  {
    defaultPageSize: number
    cacheTimeMs: number
    staleTimeMs: number
    description: string
  }
> = {
  immediate_action: {
    defaultPageSize: 10, // Small pages for urgent items
    cacheTimeMs: 1 * 60 * 1000, // 1 minute cache
    staleTimeMs: 30 * 1000, // 30 seconds stale time
    description: 'Items requiring immediate action',
  },
  recently_expired: {
    defaultPageSize: 20, // Medium pages for browsing
    cacheTimeMs: 5 * 60 * 1000, // 5 minutes cache
    staleTimeMs: 2 * 60 * 1000, // 2 minutes stale time
    description: 'Items that expired in the last 7 days',
  },
  in_progress: {
    defaultPageSize: 30, // Larger pages for work items
    cacheTimeMs: 2 * 60 * 1000, // 2 minutes cache
    staleTimeMs: 1 * 60 * 1000, // 1 minute stale time
    description: 'Items with partial actions taken',
  },
  discounted: {
    defaultPageSize: 20, // Medium pages
    cacheTimeMs: 3 * 60 * 1000, // 3 minutes cache
    staleTimeMs: 1 * 60 * 1000, // 1 minute stale time
    description: 'Items currently on discount',
  },
  ready_for_donation: {
    defaultPageSize: 15, // Small-medium pages
    cacheTimeMs: 3 * 60 * 1000, // 3 minutes cache
    staleTimeMs: 1 * 60 * 1000, // 1 minute stale time
    description: 'Items prepared for donation',
  },
  completed_today: {
    defaultPageSize: 10, // Small pages, bounded dataset
    cacheTimeMs: 5 * 60 * 1000, // 5 minutes cache
    staleTimeMs: 2 * 60 * 1000, // 2 minutes stale time
    description: 'Items completed today',
  },
  action_history: {
    defaultPageSize: 50, // Large pages for efficient browsing
    cacheTimeMs: 10 * 60 * 1000, // 10 minutes cache
    staleTimeMs: 5 * 60 * 1000, // 5 minutes stale time
    description: 'All completed actions (historical data)',
  },
  needs_reeval: {
    defaultPageSize: 20, // Medium pages
    cacheTimeMs: 2 * 60 * 1000, // 2 minutes cache
    staleTimeMs: 1 * 60 * 1000, // 1 minute stale time
    description: 'Items needing fresh AI analysis',
  },
  all_active: {
    defaultPageSize: 30, // Large pages for overview
    cacheTimeMs: 3 * 60 * 1000, // 3 minutes cache
    staleTimeMs: 1 * 60 * 1000, // 1 minute stale time
    description: 'All active items needing attention',
  },
}

/**
 * Fetch todos for a specific section with pagination
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
    // Call the section-specific RPC function
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

    // Calculate if there are more pages
    // Since we don't get total count from RPC, we estimate based on returned data
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
 * Fetch summary data for the todos dashboard
 * Uses existing get_todos_dashboard_overview RPC
 */
export async function fetchTodosDashboardSummary(
  storeId: string,
  serverClient?: ServerClient
): Promise<
  {
    todo_state: string
    item_count: number
    total_value: number
    avg_score: number
    urgency_distribution: Record<string, number>
  }[]
> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_todos_dashboard_overview', {
      p_store_id: storeId,
    })

    if (error) {
      console.error('[fetchTodosDashboardSummary] Error:', error)
      throw new Error(`Failed to fetch dashboard summary: ${error.message}`)
    }

    return data || []
  } catch (err) {
    console.error('[fetchTodosDashboardSummary] Unexpected error:', err)
    throw err
  }
}

/**
 * Convenience function to get section configuration
 */
export function getSectionConfig(section: TodoSection) {
  return sectionConfigs[section]
}

/**
 * Get all available sections with their configurations
 */
export function getAllSections(): {
  section: TodoSection
  config: (typeof sectionConfigs)[TodoSection]
}[] {
  return Object.entries(sectionConfigs).map(([section, config]) => ({
    section: section as TodoSection,
    config,
  }))
}

/**
 * Helper to determine which sections should be invalidated after a batch action
 */
export function getSectionsToInvalidateAfterAction(
  actionType: 'discount' | 'donate' | 'dispose' | 'sold' | 'donate_prepared'
): TodoSection[] {
  const baseInvalidations: TodoSection[] = [
    'immediate_action',
    'in_progress',
    'action_history',
    'completed_today',
    'all_active',
  ]

  // Add section-specific invalidations based on action type
  switch (actionType) {
    case 'discount':
      return [...baseInvalidations, 'discounted']

    case 'donate_prepared':
      return [...baseInvalidations, 'ready_for_donation']

    case 'donate':
    case 'dispose':
    case 'sold':
      // These complete the action, so they might clear items from various sections
      return [...baseInvalidations, 'discounted', 'ready_for_donation']

    default:
      return baseInvalidations
  }
}

/**
 * Type guard to check if a section is valid
 */
export function isValidTodoSection(section: string): section is TodoSection {
  return section in sectionConfigs
}

/**
 * Get human-readable display name for a section
 */
export function getSectionDisplayName(section: TodoSection): string {
  const displayNames: Record<TodoSection, string> = {
    immediate_action: 'Immediate Action Required',
    recently_expired: 'Recently Expired',
    in_progress: 'In Progress',
    discounted: 'Discounted',
    ready_for_donation: 'Ready for Donation',
    completed_today: 'Completed Today',
    action_history: 'Action History',
    needs_reeval: 'Needs Re-evaluation',
    all_active: 'All Active Items',
  }

  return displayNames[section]
}

/**
 * Get section from todo_state for reverse mapping
 */
export function getSectionFromTodoState(todoState: string): TodoSection | null {
  const stateToSectionMap: Record<string, TodoSection> = {
    immediate_action: 'immediate_action',
    recently_expired: 'recently_expired',
    recently_discounted: 'discounted',
    ready_for_donation: 'ready_for_donation',
    needs_reeval: 'needs_reeval',
  }

  return stateToSectionMap[todoState] || null
}
