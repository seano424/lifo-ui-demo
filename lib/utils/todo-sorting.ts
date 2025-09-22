import type { TodoItem } from '@/lib/queries/todos-rpc-v2'
import type { BatchActionWithDetails } from '@/lib/utils/todo-transformers'

export type SortField =
  | 'urgency'
  | 'expiry_date'
  | 'current_quantity'
  | 'potential_loss'
  | 'alphabetical'
  | 'action_date'
  | 'effectiveness'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

const URGENCY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  maintain: 0,
  none: 0,
} as const

const ACTION_TYPE_ORDER = {
  discount: 4,
  donate: 3,
  maintain: 2,
  dispose: 1,
  ignored: 0,
} as const

export function createTodoSorter(sort: SortConfig) {
  return (a: TodoItem, b: TodoItem): number => {
    let aVal: number | string | Date
    let bVal: number | string | Date

    switch (sort.field) {
      case 'urgency': {
        aVal = URGENCY_ORDER[a.urgency_level] || 0
        bVal = URGENCY_ORDER[b.urgency_level] || 0
        break
      }
      case 'expiry_date': {
        aVal = new Date(a.expiry_date).getTime()
        bVal = new Date(b.expiry_date).getTime()
        break
      }
      case 'current_quantity': {
        aVal = a.current_quantity
        bVal = b.current_quantity
        break
      }
      case 'potential_loss': {
        aVal = a.composite_score || 0
        bVal = b.composite_score || 0
        break
      }
      case 'alphabetical': {
        aVal = a.product_name.toLowerCase()
        bVal = b.product_name.toLowerCase()
        break
      }
      default: {
        aVal = 0
        bVal = 0
      }
    }

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const result = aVal.localeCompare(bVal)
      return sort.direction === 'desc' ? -result : result
    }

    // Handle numeric comparison
    const numA = typeof aVal === 'number' ? aVal : 0
    const numB = typeof bVal === 'number' ? bVal : 0
    const result = numA - numB
    return sort.direction === 'desc' ? -result : result
  }
}

export function createBatchActionSorter(sort: SortConfig) {
  return (a: BatchActionWithDetails, b: BatchActionWithDetails): number => {
    let aVal: number | string | Date
    let bVal: number | string | Date

    switch (sort.field) {
      case 'urgency': {
        // For batch actions, use AI score as urgency proxy
        aVal = a.ai_score || 0
        bVal = b.ai_score || 0
        break
      }
      case 'action_date': {
        aVal = new Date(a.action_date || 0).getTime()
        bVal = new Date(b.action_date || 0).getTime()
        break
      }
      case 'effectiveness': {
        // Calculate effectiveness percentage
        const aEffectiveness =
          a.original_value && a.recovered_value ? (a.recovered_value / a.original_value) * 100 : 0
        const bEffectiveness =
          b.original_value && b.recovered_value ? (b.recovered_value / b.original_value) * 100 : 0
        aVal = aEffectiveness
        bVal = bEffectiveness
        break
      }
      case 'alphabetical': {
        aVal = (a.product_name || 'Unknown Product').toLowerCase()
        bVal = (b.product_name || 'Unknown Product').toLowerCase()
        break
      }
      default: {
        // Default to action type order
        aVal = ACTION_TYPE_ORDER[a.actual_action as keyof typeof ACTION_TYPE_ORDER] || 0
        bVal = ACTION_TYPE_ORDER[b.actual_action as keyof typeof ACTION_TYPE_ORDER] || 0
      }
    }

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const result = aVal.localeCompare(bVal)
      return sort.direction === 'desc' ? -result : result
    }

    // Handle numeric comparison
    const numA = typeof aVal === 'number' ? aVal : 0
    const numB = typeof bVal === 'number' ? bVal : 0
    const result = numA - numB
    return sort.direction === 'desc' ? -result : result
  }
}

// Utility to validate sort configuration
export function validateSortConfig(
  sort: Partial<{ field?: string; direction?: string }>,
): SortConfig {
  const validFields: SortField[] = [
    'urgency',
    'expiry_date',
    'current_quantity',
    'potential_loss',
    'alphabetical',
    'action_date',
    'effectiveness',
  ]
  const validDirections: SortDirection[] = ['asc', 'desc']

  return {
    field: validFields.includes(sort.field as SortField) ? (sort.field as SortField) : 'urgency',
    direction: validDirections.includes(sort.direction as SortDirection)
      ? (sort.direction as SortDirection)
      : 'desc',
  }
}

// Type guard to check if a value is a valid SortField
export function isSortField(value: unknown): value is SortField {
  const validFields: SortField[] = [
    'urgency',
    'expiry_date',
    'current_quantity',
    'potential_loss',
    'alphabetical',
    'action_date',
    'effectiveness',
  ]
  return typeof value === 'string' && validFields.includes(value as SortField)
}

// Type guard to check if a value is a valid SortDirection
export function isSortDirection(value: unknown): value is SortDirection {
  const validDirections: SortDirection[] = ['asc', 'desc']
  return typeof value === 'string' && validDirections.includes(value as SortDirection)
}
