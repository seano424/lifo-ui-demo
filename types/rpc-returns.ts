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
