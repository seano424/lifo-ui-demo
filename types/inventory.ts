export interface Product {
  id: string
  barcode: string
  name: string
  category: string
  expirationDate: string
  quantity: number
  originalQuantity: number
  status: 'fresh' | 'expiring-soon' | 'expired' | 'discounted' | 'donated' | 'sold'
  batchId: string
  addedDate: string
  price: number
  discountedPrice?: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'employee'
  storeId: string
}

export interface ActionLog {
  id: string
  productId: string
  productName: string
  action: 'discounted' | 'donated' | 'sold' | 'expired'
  quantity: number
  timestamp: string
  userId: string
  userName: string
}

export interface BatchPerformance {
  batchId: string
  productName: string
  expirationDate: string
  totalQuantity: number
  soldQuantity: number
  discountedQuantity: number
  donatedQuantity: number
  expiredQuantity: number
  wasteReduction: number
}

/**
 * Database constants - batch sources that match database constraints
 */
export const BATCH_SOURCES = {
  MANUAL: 'manual',
  BARCODE: 'barcode', 
  CSV_IMPORT: 'csv_import',
  API: 'api',
  POS_INTEGRATION: 'pos_integration',
} as const

export type BatchSource = typeof BATCH_SOURCES[keyof typeof BATCH_SOURCES]

/**
 * Database constants - batch statuses
 */
export const BATCH_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  RECALLED: 'recalled',
  SOLD_OUT: 'sold_out',
} as const

export type BatchStatus = typeof BATCH_STATUSES[keyof typeof BATCH_STATUSES]

/**
 * Database constants - verification statuses
 */
export const VERIFICATION_STATUSES = {
  VERIFIED: 'verified',
  PENDING: 'pending', 
  FLAGGED: 'flagged',
  REJECTED: 'rejected',
} as const

export type VerificationStatus = typeof VERIFICATION_STATUSES[keyof typeof VERIFICATION_STATUSES]
