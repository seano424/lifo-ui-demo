/**
 * Shared types for scanning workflows (scan-in, scan-out)
 * Centralized to avoid duplication and maintain consistency
 */

import type { Database } from './supabase'

// Batch row type from database
export type BatchRow = Database['inventory']['Tables']['batches']['Row']

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
}

/**
 * Checkout item for inventory removal
 */
export interface CheckoutItem {
  batchId: string
  quantityRemoved: number
  reason: 'scan-out' | 'sale' | 'waste' | 'transfer' | 'expired'
  storeId: string
  notes?: string
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
