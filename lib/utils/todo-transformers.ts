import type { TodoItem } from '@/components/todos/todos-filtered-list'
import type { ActionableBatch, BatchActionWithDetails } from '@/hooks/use-scoring-analytics'

export function transformActionableBatchToTodo(batch: ActionableBatch): TodoItem {
  return {
    batch_id: batch.batch_id,
    product_name: batch.product_name,
    current_quantity: batch.current_quantity,
    expiry_date: batch.expiry_date,
    location_code: batch.location_code,
    urgency: batch.urgency,
    recommendation: batch.recommendation || 'No recommendation',
    reason: batch.reason || 'No reason provided',
    potential_loss: batch.potential_loss,
    discount_percent: batch.discount_percent,
    composite_score: batch.composite_score,
  }
}

export function transformBatchActionToTodo(action: BatchActionWithDetails): TodoItem {
  return {
    batch_id: action.batch_id,
    product_name: action.product_name || 'Unknown Product',
    current_quantity: action.quantity_affected || 0,
    expiry_date: action.action_date || new Date().toISOString(),
    location_code: action.location_code || 'Unknown Location',
    urgency: 'maintain', // Actions are historical, so default to maintain
    recommendation: action.recommended_action || 'No recommendation',
    reason: action.notes || `Action taken: ${action.actual_action}`,
    potential_loss: action.original_value ?? undefined,
    discount_percent: undefined,
    composite_score: action.ai_score ?? undefined,
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
  batch => `${batch.batch_id}-${batch.current_quantity}-${batch.urgency}`,
)

export const memoizedActionToTodo = createMemoizedTransformer(
  transformBatchActionToTodo,
  action => `${action.action_id}-${action.action_date}`,
)
