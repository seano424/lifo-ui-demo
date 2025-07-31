export interface DuplicateWarning {
  sku: string
  productName: string
  expiryDate: string
  newQuantity: number
  existingQuantity: number
  existingBatchNumbers: string[]
  existingBatchIds: string[]
  action: DuplicateAction
}

export type DuplicateAction = 'MERGE' | 'ADD_ANYWAY' | 'SKIP'

export interface DuplicateResolution {
  sku: string
  expiryDate: string
  action: DuplicateAction
}

export interface ExistingBatch {
  batch_id: string
  batch_number: string
  current_quantity: number
  expiry_date: string
  product: {
    sku: string
    name: string
  }
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateWarning[]
  hasConflicts: boolean
  totalConflicts: number
}
