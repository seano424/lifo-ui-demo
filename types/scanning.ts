/**
 * Shared types for scanning workflows (scan-in, scan-out)
 * Centralized to avoid duplication and maintain consistency
 */

import type { Database } from './supabase'

// Batch row type from database
export type BatchRow = Database['inventory']['Tables']['batches']['Row']

/**
 * Action types for batch removal in scan-out workflow
 */
export type ActionType = 'sold' | 'donate' | 'dispose'

/**
 * Available batch with nested structure for scan-out workflow
 * Includes full batch data and associated product information
 */
export interface AvailableBatch {
  batch: BatchRow
  products: {
    product_name: string
    brand_name: string
    barcode: string
    category_name?: string
  }
}

/**
 * Scanned item for pending checkout/removal
 */
export interface ScanOutItem {
  batchId: string
  barcode: string
  productName: string
  brand: string
  quantity: number
  maxQuantity: number
  expiryDate: string
  price: number
  timestamp: Date
  actionType: ActionType // Action to perform when removing this batch
  donationRecipientId?: string // Donation recipient UUID (if actionType === 'donate')
  donationRecipientName?: string // Donation recipient name (for ad-hoc or display)
  disposalReason?: string // Disposal reason (if actionType === 'dispose')
}

/**
 * Checkout item for inventory removal
 */
export interface CheckoutItem {
  batchId: string
  quantityRemoved: number
  actionType: ActionType // Type of action being performed
  reason?: string // Optional additional reason/context
  storeId: string
  notes?: string
  donationRecipientId?: string // Donation recipient UUID (required when actionType === 'donate')
  donationRecipientName?: string // Donation recipient name (for ad-hoc recipients or display)
  disposalReason?: string // Disposal reason (required when actionType === 'dispose')
}

/**
 * Result of a checkout operation
 */
export interface CheckoutResult {
  success: boolean
  successCount?: number
  failureCount?: number
  message: string
  results: Array<{
    batchId: string
    success: boolean
    error?: string
  }>
}
