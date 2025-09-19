// lib/queries/todos-rpc.ts
import { createClient } from '@/lib/supabase/client'

// Types for the RPC functions
export interface TodosSummary {
  pending_actions_count: number
  recently_discounted_count: number
  recently_donated_count: number
  recently_expired_count: number
  needs_reeval_count: number
  total_active_count: number
  last_refreshed: string
}

export interface PendingAction {
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

export interface RecentlyDiscounted {
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

export interface DonatedItem {
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

export interface RecentlyExpired {
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

export interface ActionHistory {
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

export interface AllActive {
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

export interface NeedsReeval {
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

export interface ActionableBatch {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  sku: string
  expiry_date: string
  current_quantity: number
  location_code: string
  unit_price: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  days_to_expiry: number
  ai_recommendation: string
  ai_reasoning: string
  composite_score: number
  potential_loss: number
  discount_percent: number
  todo_state: 'expired' | 'urgent_action' | 'needs_attention' | 'monitor' | 'ok'
  total_count: number
}

export interface DashboardSummary {
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

// Pagination interface for infinite queries
export interface PaginationParams {
  limit: number
  offset: number
}

// Query functions - each creates its own client instance
export async function fetchTodosSummary(storeId: string): Promise<TodosSummary> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_todos_summary', {
    p_store_id: storeId,
  })

  if (error) throw error
  return data[0] // RPC returns array with single object
}

export async function fetchDashboardSummary(storeId: string): Promise<DashboardSummary> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_store_id: storeId,
  })

  if (error) throw error
  return data[0] // RPC returns array with single object
}

export async function fetchPendingActions(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<PendingAction[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_pending_actions', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

export async function fetchRecentlyDiscounted(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<RecentlyDiscounted[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_recently_discounted', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

export async function fetchDonatedItems(
  storeId: string,
  { limit, offset }: PaginationParams,
  daysBack: number = 7,
): Promise<DonatedItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_donated_items', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
    p_days_back: daysBack,
  })

  if (error) throw error
  return data || []
}

export async function fetchRecentlyExpired(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<RecentlyExpired[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_recently_expired_enhanced', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

export async function fetchActionHistory(
  storeId: string,
  { limit, offset }: PaginationParams,
  actionType?: string,
): Promise<ActionHistory[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_action_history_enhanced', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
    p_action_type: actionType || null,
  })

  if (error) throw error
  return data || []
}

export async function fetchAllActiveWithStates(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<AllActive[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_all_active_with_states', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

export async function fetchItemsNeedingReeval(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<NeedsReeval[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_items_needing_reeval', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}

export async function fetchActionableBatches(
  storeId: string,
  { limit, offset }: PaginationParams,
): Promise<ActionableBatch[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_actionable_batches', {
    p_store_id: storeId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return data || []
}
