import type { TodoItem } from '@/lib/queries/todos-rpc'
import type { Database } from '@/types/supabase'

export type BatchAction = Database['inventory']['Tables']['batch_actions']['Row']
export type ActionType = Database['public']['Enums']['action_type']

// Enhanced batch action type with related data for UI display
export interface BatchActionWithDetails extends BatchAction {
  // From the batches table join
  product_name?: string
  batch_number?: string
  sku?: string
  expiry_date?: string
  location_code?: string

  // From the donation recipient join (if applicable)
  recipient_name?: string
  recipient_type?: string

  // For computing effectiveness
  original_price?: number
  new_price?: number

  // Backward compatibility aliases for old column names
  action_id: string // Maps to entry_id
  action_date: string | null // Maps to performed_at
  actual_action: Database['public']['Enums']['action_type'] // Maps to action_type
  original_value: number // Maps to total_original_value
  recovered_value: number // Maps to total_recovered_value
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

// Transform ActionableBatch to TodoItem
export function transformActionableBatchToTodo(batch: ActionableBatch): TodoItem {
  return {
    batch_id: batch.batch_id,
    store_id: '', // Not available in ActionableBatch, using empty string
    batch_number: '', // Not available in ActionableBatch, using empty string
    product_name: batch.product_name,
    product_brand: batch.product_brand || null,
    current_quantity: batch.current_quantity,
    last_action_type: null,
    last_action_time: null,
    completion_status: 'pending',
    todo_state: batch.todo_state || 'needs_attention',
    urgency_level: batch.urgency_level,
    days_to_expiry: batch.days_to_expiry || 0,
    priority_order: 0,
    expiry_date: batch.expiry_date,
    composite_score: batch.composite_score,
    ai_recommendation: batch.ai_recommendation,
    last_discount_percent: batch.discount_percent,
    hours_since_last_action: null,
    total_actions_ever: 0,
    view_refreshed_at: new Date().toISOString(),
  }
}

// Transform new RPC ActionableBatch to TodoItem
export function transformRpcActionableBatchToTodo(batch: ActionableBatch): TodoItem {
  return {
    batch_id: batch.batch_id,
    store_id: '', // Not available in ActionableBatch, using empty string
    batch_number: '', // Not available in ActionableBatch, using empty string
    product_name: batch.product_name,
    product_brand: batch.product_brand || null,
    current_quantity: batch.current_quantity,
    last_action_type: null,
    last_action_time: null,
    completion_status: 'pending',
    todo_state: batch.todo_state || 'needs_attention',
    urgency_level: batch.urgency_level,
    days_to_expiry: batch.days_to_expiry || 0,
    priority_order: 0,
    expiry_date: batch.expiry_date,
    composite_score: batch.composite_score,
    ai_recommendation: batch.ai_recommendation,
    last_discount_percent: batch.discount_percent,
    hours_since_last_action: null,
    total_actions_ever: 0,
    view_refreshed_at: new Date().toISOString(),
  }
}

export function transformBatchActionToTodo(action: BatchActionWithDetails): TodoItem {
  return {
    batch_id: action.batch_id,
    store_id: '', // Not available in BatchActionWithDetails, using empty string
    batch_number: '', // Not available in BatchActionWithDetails, using empty string
    product_name: action.product_name || 'Unknown Product',
    product_brand: null,
    current_quantity: action.quantity_affected || 0,
    last_action_type: action.actual_action as
      | 'discount'
      | 'donate'
      | 'dispose'
      | 'sold'
      | 'donate_prepared'
      | null,
    last_action_time: action.action_date || null,
    completion_status: 'completed',
    todo_state: 'completed',
    urgency_level: 'low', // Actions are historical, so default to low
    days_to_expiry: 0,
    priority_order: 0,
    expiry_date: action.action_date || new Date().toISOString(),
    composite_score: action.ai_score || null,
    ai_recommendation: action.recommended_action || null,
    last_discount_percent: null,
    hours_since_last_action: null,
    total_actions_ever: 1,
    view_refreshed_at: new Date().toISOString(),
  }
}

// Memoization utility for expensive transformations
export function createMemoizedTransformer<T, R>(
  transformer: (item: T) => R,
  keyExtractor: (item: T) => string,
) {
  const cache = new Map<string, R>()

  return (items: T[]): R[] => {
    return items.map(item => {
      const key = keyExtractor(item)
      if (cache.has(key)) {
        return cache.get(key)!
      }

      const transformed = transformer(item)
      cache.set(key, transformed)
      return transformed
    })
  }
}

// String formatting utilities
export function formatRecommendation(recommendation: string): string {
  return recommendation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Pre-configured memoized transformers
export const memoizedBatchToTodo = createMemoizedTransformer(
  transformActionableBatchToTodo,
  batch => `${batch.batch_id}-${batch.current_quantity}-${batch.urgency_level}`,
)

export const memoizedRpcBatchToTodo = createMemoizedTransformer(
  transformRpcActionableBatchToTodo,
  batch => `${batch.batch_id}-${batch.current_quantity}-${batch.urgency_level}`,
)

export const memoizedActionToTodo = createMemoizedTransformer(
  transformBatchActionToTodo,
  action => `${action.action_id}-${action.action_date}`,
)
