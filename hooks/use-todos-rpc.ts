// hooks/use-todos-rpc.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Types for the new RPC functions
interface TodosSummary {
  pending_actions_count: number
  recently_discounted_count: number
  recently_donated_count: number
  recently_expired_count: number
  needs_reeval_count: number
  total_active_count: number
  last_refreshed: string
}

interface PendingAction {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  current_quantity: number
  ai_recommendation: string
  composite_score: number
  urgency_level: string
  days_to_expiry: number
  priority_order: number
  total_count: number
}

interface RecentlyDiscounted {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  current_quantity: number
  last_discount_percent: number
  last_action_time: string
  hours_since_last_action: number
  total_discounted_quantity: number
  total_count: number
}

interface DonatedItem {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  quantity_donated: number
  donation_recipient_name: string
  donated_at: string
  notes: string
  total_count: number
}

interface RecentlyExpired {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  current_quantity: number
  days_since_expiry: number
  ai_recommendation: string
  has_recent_actions: boolean
  total_count: number
}

interface ActionHistory {
  entry_id: string
  batch_id: string
  batch_number: string
  product_name: string
  action_type: string
  quantity_affected: number
  discount_percentage: number
  performed_at: string
  performed_by_email: string
  recipient_name: string
  notes: string
  original_value: number
  recovered_value: number
  total_count: number
}

interface AllActive {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  current_quantity: number
  todo_state: string
  ai_recommendation: string
  composite_score: number
  days_to_expiry: number
  hours_since_last_action: number
  total_actions_ever: number
  total_count: number
}

interface NeedsReeval {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  expiry_date: string
  current_quantity: number
  ai_recommendation: string
  composite_score: number
  last_action_type: string
  last_action_time: string
  ai_calculated_at: string
  total_count: number
}

export function useTodosSummary(storeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['todos', 'summary', storeId],
    queryFn: async (): Promise<TodosSummary> => {
      const { data, error } = await supabase.rpc('get_todos_summary', {
        p_store_id: storeId,
      })

      if (error) throw error
      return data[0] // RPC returns array with single object
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time counters
  })
}

export function usePendingActions(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'pending', storeId, limit],
    queryFn: async ({ pageParam = 0 }): Promise<PendingAction[]> => {
      const { data, error } = await supabase.rpc('get_pending_actions', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useRecentlyDiscounted(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'discounted', storeId, limit],
    queryFn: async ({ pageParam = 0 }): Promise<RecentlyDiscounted[]> => {
      const { data, error } = await supabase.rpc('get_recently_discounted', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useDonatedItems(
  storeId: string,
  {
    limit = 20,
    daysBack = 7,
    enabled = true,
  }: { limit?: number; daysBack?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'donated', storeId, limit, daysBack],
    queryFn: async ({ pageParam = 0 }): Promise<DonatedItem[]> => {
      const { data, error } = await supabase.rpc('get_donated_items', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
        p_days_back: daysBack,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useRecentlyExpired(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'expired', storeId, limit],
    queryFn: async ({ pageParam = 0 }): Promise<RecentlyExpired[]> => {
      const { data, error } = await supabase.rpc('get_recently_expired_enhanced', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useActionHistory(
  storeId: string,
  {
    limit = 20,
    actionType,
    enabled = true,
  }: { limit?: number; actionType?: string; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'history', storeId, limit, actionType],
    queryFn: async ({ pageParam = 0 }): Promise<ActionHistory[]> => {
      const { data, error } = await supabase.rpc('get_action_history_enhanced', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
        p_action_type: actionType || null,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useAllActiveWithStates(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'active', storeId, limit],
    queryFn: async ({ pageParam = 0 }): Promise<AllActive[]> => {
      const { data, error } = await supabase.rpc('get_all_active_with_states', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

export function useItemsNeedingReeval(
  storeId: string,
  { limit = 20, enabled = true }: { limit?: number; enabled?: boolean } = {},
) {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: ['todos', 'reeval', storeId, limit],
    queryFn: async ({ pageParam = 0 }): Promise<NeedsReeval[]> => {
      const { data, error } = await supabase.rpc('get_items_needing_reeval', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: pageParam * limit,
      })

      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < limit) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled,
  })
}

// Utility hook to get flattened data from infinite queries
export function useFlattenedTodosData<T>(query: { data?: { pages?: T[][] } }): T[] {
  return query?.data?.pages?.flatMap((page: T[]) => page) ?? []
}

// Export types for use in components
export type {
  TodosSummary,
  PendingAction,
  RecentlyDiscounted,
  DonatedItem,
  RecentlyExpired,
  ActionHistory,
  AllActive,
  NeedsReeval,
}
