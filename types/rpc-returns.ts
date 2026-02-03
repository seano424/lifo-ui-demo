/**
 * RPC Function Return Type Definitions
 *
 * Supabase generates `Json` return types for all RPC functions.
 * This file defines the actual return types so we can use type assertions.
 */

// ====================
// Authentication RPCs
// ====================

export interface ValidatePinLoginResult {
  success: boolean
  user: {
    id: string
    email: string
    username: string
    full_name: string
    store_id: string
  }
  error?: string
  is_locked?: boolean
  attempts_remaining?: number
}

export interface CheckPinLockStatusResult {
  is_locked: boolean
}

// ====================
// Store Settings RPCs
// ====================

export interface StoreSettingsCompleteResult {
  store: {
    store_id: string
    store_name: string
    business_name?: string
    store_code: string
    store_type?: 'supermarket' | 'convenience' | 'restaurant' | 'bakery' | 'butcher' | 'organic'
    size_category?: 'small' | 'medium' | 'large' | 'hypermarket'
    address?: string
    city?: string
    postal_code?: string
    country?: string
    timezone?: string
    phone?: string
    email?: string
    website_url?: string
    description?: string
    latitude?: number
    longitude?: number
    logo_url?: string
    cover_image_url?: string
    default_markup_percent?: number
    waste_reduction_target_percent?: number
    owner_id?: string
    is_active: boolean
    onboarding_completed: boolean
    created_at: string
    updated_at: string
  }
  settings?: {
    store_id: string
    scoring_weights?: {
      expiry: number
      margin: number
      velocity: number
    }
    critical_threshold?: number
    warning_threshold?: number
    opening_hours?: Record<string, { open: string; close: string }>
    peak_hours?: Record<string, string>
    weather_location_lat?: number
    weather_location_lon?: number
    currency?: string
    notification_preferences?: {
      email_alerts: boolean
      sms_alerts: boolean
      push_notifications: boolean
      alert_types: string[]
    }
    backup_preferences?: {
      auto_backup: boolean
      backup_frequency: string
      retention_days: number
    }
    display_preferences?: {
      theme: string
      language: string
      date_format: string
      time_format: string
    }
    updated_at: string
  }
}

export interface UpdateStoreSettingsResult {
  store_id: string
  store_name: string
  business_name?: string
  store_code: string
  store_type?: string
  size_category?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website_url?: string
  description?: string
  default_markup_percent?: number
  waste_reduction_target_percent?: number
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface UpdateStoreAdvancedSettingsResult {
  store_id: string
  critical_threshold?: number
  warning_threshold?: number
  scoring_weights?: {
    expiry: number
    margin: number
    velocity: number
  }
  notification_preferences?: {
    email_alerts: boolean
    sms_alerts: boolean
    push_notifications: boolean
    alert_types: string[]
  }
  display_preferences?: {
    theme: string
    language: string
    date_format: string
    time_format: string
  }
  backup_preferences?: {
    auto_backup: boolean
    backup_frequency: string
    retention_days: number
  }
  opening_hours?: Record<string, { open: string; close: string }>
  peak_hours?: Record<string, string>
  weather_location_lat?: number
  weather_location_lon?: number
  currency?: string
  updated_at: string
}

export interface UpdateStoreThresholdsResult {
  store_id: string
  critical_threshold: number
  warning_threshold: number
  updated_at: string
}

export interface GetStoreSettingsResult {
  store_id: string
  store_name: string
  business_name?: string
  store_code: string
  store_type?: string
  size_category?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website_url?: string
  description?: string
  default_markup_percent?: number
  waste_reduction_target_percent?: number
  owner_id?: string
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// ====================
// Store Users RPCs
// ====================

export interface StoreUserRow {
  store_id: string
  user_id: string
  role_in_store: 'owner' | 'manager' | 'employee' | 'staff'
  permissions?: Record<string, boolean>
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
  can_use_pin_auth: boolean
  pin_access_level: 'basic' | 'elevated' | 'admin'
  pin_permissions?: Record<string, unknown>
  email?: string
  created_at?: string
  updated_at?: string
  raw_user_meta_data?: Record<string, unknown>
  total_count?: number
}

export interface RemoveUserFromStoreResult {
  success: boolean
  error?: string
  removed_user_role?: string
  removed_by?: string
}

export interface CheckUserExistsResult {
  exists: boolean
  full_name?: string
  username?: string
  email?: string
  avatar_url?: string
}

export interface AddEmployeeResult {
  success: boolean
  error?: string
  existing_role?: string
  user_id?: string
}

// ====================
// Todos/Batches RPCs
// ====================

export interface BatchRPCResult {
  batch_id: string
  batch_number: string
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number | null
  initial_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  verification_status: string | null
  lifecycle_status: string
  barcode: string
  created_at?: string
  product_name?: string
  brand_name?: string
  category_name?: string
}

export interface AvailableBatchesResult {
  batch_id: string
  batch_number: string
  brand_name: string
  category_name: string
  product_name: string
  barcode: string
  expiry_date: string
  current_quantity: number
  available_quantity: number
  cost_price: number
  selling_price: number
  store_id: string
  created_at: string
}

// ====================
// Analytics RPCs
// ====================

export interface UrgentAlertsResult {
  alert_type: string
  batch_id: string
  product_name: string
  brand_name: string
  category_name: string
  expiry_date: string
  current_quantity: number
  cost_price: number
  selling_price: number
  urgency_score: number
  days_to_expiry: number
  potential_loss: number
}

// ====================
// Permissions RPCs
// ====================

export interface UserCanManageStoreUsersResult {
  can_manage: boolean
}

// ====================
// Draft Batches RPCs
// ====================

/**
 * Summary statistics for draft batches in a store
 * Returned by: inventory.get_draft_batches_summary
 */
export interface DraftBatchesSummary {
  total_draft_batches: number
  total_units: number
  products_with_drafts: number
  by_category: Array<{
    category_code: string
    category_name: string
    draft_count: number
    total_quantity: number
  }>
}

/**
 * Individual draft batch item
 */
export interface DraftBatchItem {
  batch_id: string
  batch_number: string
  quantity: number
  received_date: string | null
  created_at: string
}

/**
 * Product with its associated draft batches
 * Returned by: inventory.get_draft_batches_by_product
 */
export interface ProductWithDraftBatches {
  product_id: string
  product_name: string
  product_brand: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  draft_batch_count: number
  total_draft_quantity: number
  draft_batches: DraftBatchItem[]
  last_expiry_days: number | null
  last_batch_expiry_date: string | null
  total_count: number // Total matching products (for pagination)
}

/**
 * Result from activating a draft batch
 * Returned by: inventory.activate_draft_batch
 */
export interface ActivateDraftBatchResult {
  success: boolean
  activated_batch_id: string
  activated_quantity: number
  expiry_date: string
  was_split: boolean
  remaining_draft_batch_id: string | null
  remaining_draft_quantity: number | null
  message: string
}

/**
 * Result from ignoring a draft batch
 * Returned by: inventory.ignore_draft_batch
 */
export interface IgnoreDraftBatchResult {
  success: boolean
  ignored_batch_id: string
  ignored_quantity: number
  product_name: string
  was_split: boolean
  remaining_draft_batch_id: string | null
  remaining_draft_quantity: number | null
  message: string
}

/**
 * Individual item result from delivery logging
 */
export interface DeliveryItemResult {
  product_id: string
  product_name: string
  quantity: number
  draft_batch_id: string
  suggested_expiry_days: number | null
  suggested_expiry_date: string | null
}

/**
 * Result from logging a delivery
 * Returned by: inventory.log_delivery_create_drafts
 */
export interface LogDeliveryResult {
  success: boolean
  total_items: number
  drafts_created: number
  items: DeliveryItemResult[]
}

/**
 * Recent delivery product information
 * Returned by: inventory.get_recent_delivery_products
 */
export interface RecentDeliveryProduct {
  product_id: string
  product_name: string
  last_delivery_quantity: number
  last_expiry_days: number | null
  total_delivery_count: number
}

// ====================
// Ignored Batches RPCs
// ====================

/**
 * Summary statistics for ignored batches in a store
 * Returned by: inventory.get_ignored_batches_summary
 */
export interface IgnoredBatchesSummary {
  total_ignored_batches: number
  total_units: number
  products_with_ignored: number
  by_category: Array<{
    category_code: string
    category_name: string
    ignored_count: number
    total_quantity: number
  }>
}

/**
 * Individual ignored batch item
 */
export interface IgnoredBatchItem {
  batch_id: string
  batch_number: string
  quantity: number
  received_date: string | null
  ignored_at: string
  created_at: string
}

/**
 * Product with its associated ignored batches
 * Returned by: inventory.get_ignored_batches_by_product
 */
export interface ProductWithIgnoredBatches {
  product_id: string
  product_name: string
  product_brand: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  ignored_batch_count: number
  total_ignored_quantity: number
  ignored_batches: IgnoredBatchItem[]
  total_count: number // Total matching products (for pagination)
}

/**
 * Result from restoring an ignored batch
 * Returned by: inventory.restore_ignored_batch
 */
export interface RestoreIgnoredBatchResult {
  success: boolean
  restored_batch_id: string
  restored_quantity: number
  product_name: string
  message: string
}

// ====================
// Batch Actions RPCs
// ====================

/**
 * Result from executing batch actions (donate, discount, sold, dispose, dismiss)
 * Returned by: execute_donate_action, execute_discount_action, execute_sold_action,
 *              execute_dispose_action, execute_dismiss_action
 */
export interface BatchActionResult {
  success: boolean
  action_id?: string
  error?: string
  remaining_quantity?: number
  total_value_donated?: number
  original_price?: number
  new_price?: number
  savings_total?: number
  revenue_recovered?: number
  total_loss_value?: number
  message?: string
}

/**
 * Result from bulk batch action execution
 * Returned by: execute_bulk_action
 */
export interface BulkBatchActionResult {
  success: boolean
  success_count: number
  error_count: number
  results: BatchActionResult[]
  message?: string
}
