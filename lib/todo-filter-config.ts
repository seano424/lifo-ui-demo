import type { BatchStatus, TodoActionType, TodoUrgencyLevel } from '@/lib/queries/todos-rpc'

export interface FilterCategory {
  id: 'urgency_level' | 'action_type' | 'batch_status' | 'expiry_range'
  label: string
  icon: string
  multiSelect: boolean
}

export interface FilterOption {
  value: string
  label: string
  emoji: string
  color?: string
}

export const filterCategories: FilterCategory[] = [
  {
    id: 'urgency_level',
    label: 'Urgency Level',
    icon: 'Zap',
    multiSelect: true,
  },
  {
    id: 'action_type',
    label: 'Action Type',
    icon: 'Target',
    multiSelect: true,
  },
  {
    id: 'batch_status',
    label: 'Batch Status',
    icon: 'Package',
    multiSelect: true,
  },
  {
    id: 'expiry_range',
    label: 'Expiry Period',
    icon: 'Calendar',
    multiSelect: false,
  },
]

export const filterOptions: Record<string, FilterOption[]> = {
  urgency_level: [
    { value: 'critical', label: 'Critical', emoji: '🚨', color: '#ef4444' },
    { value: 'high', label: 'High', emoji: '⚠️', color: '#f59e0b' },
    { value: 'medium', label: 'Medium', emoji: '⚡', color: '#8b5cf6' },
    { value: 'low', label: 'Low', emoji: '📋', color: '#6b7280' },
    { value: 'none', label: 'None', emoji: '✅', color: '#22c55e' },
  ],
  action_type: [
    { value: 'discount', label: 'Discount', emoji: '🏷️' },
    { value: 'donate', label: 'Donate', emoji: '❤️' },
    { value: 'donate_prepared', label: 'Donate Prepared', emoji: '📦' },
    { value: 'maintain', label: 'Maintain', emoji: '🔧' },
    { value: 'dispose', label: 'Dispose', emoji: '🗑️' },
    { value: 'sold', label: 'Sold', emoji: '💰' },
    { value: 'ignored', label: 'Ignored', emoji: '👁️' },
  ],
  batch_status: [
    { value: 'active', label: 'Active', emoji: '✅' },
    { value: 'expired', label: 'Expired', emoji: '❌' },
  ],
  expiry_range: [
    { value: 'expiring_soon', label: 'Expiring Soon', emoji: '⚠️' },
    { value: 'recently_expired', label: 'Recently Expired', emoji: '📅' },
  ],
}

// Helper to check if category uses multi-select
export const isMultiSelectCategory = (categoryId: string): boolean => {
  return ['urgency_level', 'action_type', 'batch_status'].includes(categoryId)
}

// Type guards for filter values
export const isUrgencyLevel = (value: string): value is TodoUrgencyLevel => {
  return ['critical', 'high', 'medium', 'low', 'none'].includes(value)
}

export const isActionType = (value: string): value is TodoActionType => {
  return [
    'discount',
    'donate',
    'donate_prepared',
    'maintain',
    'dispose',
    'sold',
    'ignored',
  ].includes(value)
}

export const isBatchStatus = (value: string): value is BatchStatus => {
  return ['active', 'expired'].includes(value)
}

// Sort Configuration
export interface SortFieldOption {
  value: string
  label: string
  description: string
  emoji: string
  icon: string
}

export const sortFieldOptions: SortFieldOption[] = [
  {
    value: 'urgency',
    label: 'Urgency',
    description: 'Priority level',
    emoji: '⚡',
    icon: 'Zap',
  },
  {
    value: 'expiry_date',
    label: 'Expiry Date',
    description: 'When items expire',
    emoji: '📅',
    icon: 'Calendar',
  },
  {
    value: 'current_quantity',
    label: 'Current Quantity',
    description: 'Amount in stock',
    emoji: '📦',
    icon: 'Package',
  },
  {
    value: 'potential_loss',
    label: 'Potential Loss',
    description: 'Financial impact',
    emoji: '💰',
    icon: 'DollarSign',
  },
  {
    value: 'alphabetical',
    label: 'Alphabetical',
    description: 'Product name A-Z',
    emoji: '🔤',
    icon: 'ArrowDownAZ',
  },
  {
    value: 'action_date',
    label: 'Action Date',
    description: 'When action taken',
    emoji: '📝',
    icon: 'ClipboardList',
  },
  {
    value: 'effectiveness',
    label: 'Effectiveness',
    description: 'Action success rate',
    emoji: '📊',
    icon: 'TrendingUp',
  },
]
