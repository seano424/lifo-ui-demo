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
  unit_price: number // Now available from database
  selling_price: number // Now available from database
  cost_price: number // Now available from database
  current_selling_price: number // Now available from database (price after discount)
  potential_loss_value: number // Fixed field name (was potential_loss)
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  days_to_expiry: number
  ai_recommendation: string
  ai_reasoning: string
  composite_score: number
  discount_percent: number
  todo_state: 'expired' | 'urgent_action' | 'needs_attention' | 'monitor' | 'ok'
  total_count: number
}

// Note: Transformer functions removed since we now use TodoItem directly everywhere

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

// Note: Memoized transformers removed since we now use TodoItem directly everywhere
