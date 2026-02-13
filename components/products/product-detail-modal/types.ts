// Shared types for product detail modal sub-components

import type { BatchWithProduct } from '@/lib/queries/batches'

export interface BatchListProps {
  batches: BatchWithProduct[]
  totalStock: number
  editingBatchId: string | null
  onStartEdit: (batchId: string) => void
  onCancelEdit: () => void
  isLoading: boolean
}

export interface BatchRowProps {
  batch: BatchWithProduct
  isEditing: boolean
  onStartEdit: () => void
  onSave: (updates: { expiry_date?: string; current_quantity?: number }) => void
  onCancel: () => void
  currencySymbol: string
}

export interface UntrackedAlertProps {
  count: number
  productId: string
  autoExpand?: boolean
}

export interface TrackingSettingsProps {
  productId: string
  categoryId: string
  shelfLifeDays: number
  shelfLifeSource?:
    | 'product_override'
    | 'store_category_override'
    | 'product_base'
    | 'category_base'
    | 'default'
  categoryName: string
  initialTrackingMode?: 'auto' | 'manual'
}
