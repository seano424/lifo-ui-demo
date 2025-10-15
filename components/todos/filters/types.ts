import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'

export interface TodoFilterValues {
  urgency_level?: TodoUrgencyLevel[]
  action_type?: TodoActionType[]
  batch_status?: BatchStatus[]
  expiry_range?: string
}

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

export interface TodoFiltersState {
  // Filters
  urgency_level?: TodoUrgencyLevel[]
  action_type?: TodoActionType[]
  batch_status?: BatchStatus[]
  expiry_range?: string
  product_name?: string
  days_to_expiry_min?: number
  days_to_expiry_max?: number

  // Sorting
  sortConfig?: SortConfig
}
