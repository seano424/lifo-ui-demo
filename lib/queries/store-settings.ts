// lib/queries/store-settings.ts - RPC VERSION (FINAL FIX)
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export interface StoreBasicInfo {
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

export interface StoreAdvancedSettings {
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

export interface StoreSettingsData extends StoreBasicInfo {
  settings?: StoreAdvancedSettings
}

// Fetch store settings using optimized combined RPC function
export async function fetchStoreSettings(
  storeId: string,
  serverClient?: ServerClient,
): Promise<StoreSettingsData> {
  return withPerformanceTracking(
    'lib/queries/store-settings',
    'fetchStoreSettings',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      // Use the optimized RPC that returns BOTH store and settings in one call
      const { data, error } = await supabase.rpc('get_store_settings_complete', {
        store_id_param: storeId,
      })

      if (error) {
        // Only suppress auth errors during logout - let other errors through normally
        if (
          error.message?.includes('JWT') ||
          error.message?.includes('invalid') ||
          error.code === 'PGRST301' ||
          error.message?.includes('Auth session missing')
        ) {
          logger.log('lib/queries/store-settings', 'Store fetch skipped - user not authenticated', {
            storeId,
          })
          throw new Error('User not authenticated')
        }

        // Log query errors with queryWarn to respect NEXT_PUBLIC_LOG_QUERIES setting
        logger.queryWarn('lib/queries/store-settings', 'Store fetch error', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch store: ${error.message}`)
      }

      // Data comes as { store: {...}, settings: {...} }
      return {
        ...data.store,
        settings: data.settings || undefined,
      }
    },
  )
}

// Update store basic information using RPC function
export async function updateStoreBasicInfo(
  storeId: string,
  updates: Partial<StoreBasicInfo>,
  serverClient?: ServerClient,
): Promise<StoreBasicInfo> {
  return withPerformanceTracking(
    'lib/queries/store-settings',
    'updateStoreBasicInfo',
    { storeId, updateFields: Object.keys(updates) },
    async () => {
      const supabase = serverClient || createClient()

      // Use the RPC function to update store data
      const { data, error } = await supabase.rpc('update_store_settings', {
        store_id_param: storeId,
        store_name_param: updates.store_name || null,
        business_name_param: updates.business_name || null,
        store_code_param: updates.store_code || null,
        store_type_param: updates.store_type || null,
        size_category_param: updates.size_category || null,
        address_param: updates.address || null,
        city_param: updates.city || null,
        postal_code_param: updates.postal_code || null,
        country_param: updates.country || null,
        phone_param: updates.phone || null,
        email_param: updates.email || null,
        website_url_param: updates.website_url || null,
        description_param: updates.description || null,
        default_markup_percent_param: updates.default_markup_percent || null,
        waste_reduction_target_percent_param: updates.waste_reduction_target_percent || null,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Store update error via RPC', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to update store: ${error.message}`)
      }

      return data
    },
  )
}

// Use RPC function for advanced settings updates with proper security
export async function updateStoreAdvancedSettings(
  storeId: string,
  updates: Partial<StoreAdvancedSettings>,
  serverClient?: ServerClient,
): Promise<StoreAdvancedSettings> {
  return withPerformanceTracking(
    'lib/queries/store-settings',
    'updateStoreAdvancedSettings',
    { storeId, updateFields: Object.keys(updates) },
    async () => {
      const supabase = serverClient || createClient()

      // Use the new RPC function for updating advanced settings (public schema)
      const { data, error } = await supabase.rpc('update_store_advanced_settings', {
        p_store_id: storeId,
        p_critical_threshold: updates.critical_threshold || null,
        p_warning_threshold: updates.warning_threshold || null,
        p_scoring_weights: updates.scoring_weights || null,
        p_notification_preferences: updates.notification_preferences || null,
        p_display_preferences: updates.display_preferences || null,
        p_backup_preferences: updates.backup_preferences || null,
        p_opening_hours: updates.opening_hours || null,
        p_peak_hours: updates.peak_hours || null,
        p_weather_location_lat: updates.weather_location_lat || null,
        p_weather_location_lon: updates.weather_location_lon || null,
        p_currency: updates.currency || null,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Failed to update store advanced settings', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to update settings: ${error.message}`)
      }

      if (!data || data.length === 0) {
        logger.queryWarn('lib/queries/store-settings', 'No data returned from update operation', {
          storeId,
        })
        throw new Error('No data returned from update operation')
      }

      return data[0] // RPC returns an array, get the first result
    },
  )
}

// Specialized function for threshold updates only
export async function updateStoreThresholds(
  storeId: string,
  thresholds: {
    critical_threshold: number
    warning_threshold: number
  },
  serverClient?: ServerClient,
): Promise<StoreAdvancedSettings> {
  return withPerformanceTracking(
    'lib/queries/store-settings',
    'updateStoreThresholds',
    { storeId, thresholds },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('update_store_thresholds', {
        p_store_id: storeId,
        p_critical_threshold: thresholds.critical_threshold,
        p_warning_threshold: thresholds.warning_threshold,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Failed to update store thresholds', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to update thresholds: ${error.message}`)
      }

      if (!data || data.length === 0) {
        logger.queryWarn('lib/queries/store-settings', 'No data returned from threshold update', {
          storeId,
        })
        throw new Error('No data returned from threshold update operation')
      }

      return data[0] // RPC returns an array, get the first result
    },
  )
}

// Debug function to test store access
export async function debugStoreAccess(
  storeId: string,
  serverClient?: ServerClient,
): Promise<
  | {
      rpcTest: { data: unknown; error: unknown }
      roleTest: { data: unknown; error: unknown }
      updateTest: { data: unknown; error: unknown }
    }
  | {
      error: string
    }
> {
  const supabase = serverClient || createClient()

  try {
    // Test 1: Check RPC function access
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_store_settings', {
      store_id_param: storeId,
    })

    // Test 2: Check user's role in the store via business schema
    const { data: roleData, error: roleError } = await supabase
      .schema('business')
      .from('store_users')
      .select('role_in_store, permissions, is_active')
      .eq('store_id', storeId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    // Test 3: Try a minimal RPC update
    const { data: updateData, error: updateError } = await supabase.rpc('update_store_settings', {
      store_id_param: storeId,
      // Only update the timestamp to test permissions
    })

    return {
      rpcTest: { data: rpcData, error: rpcError },
      roleTest: { data: roleData, error: roleError },
      updateTest: { data: updateData, error: updateError },
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Validate store code uniqueness using RPC
export async function validateStoreCode(
  storeCode: string,
  excludeStoreId?: string,
  serverClient?: ServerClient,
): Promise<boolean> {
  const supabase = serverClient || createClient()

  try {
    // Use a simple RPC call or direct query to business schema
    let query = supabase
      .schema('business')
      .from('stores')
      .select('store_id')
      .eq('store_code', storeCode)

    if (excludeStoreId) {
      query = query.neq('store_id', excludeStoreId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Validation error: ${error.message}`)
    }

    return data.length === 0 // Returns true if code is available
  } catch (error) {
    logger.queryWarn('lib/queries/store-settings', 'validateStoreCode error', {
      error: error instanceof Error ? error.message : String(error),
      storeCode,
    })
    throw error
  }
}

// Validate email uniqueness using business schema access
export async function validateStoreEmail(
  email: string,
  excludeStoreId?: string,
  serverClient?: ServerClient,
): Promise<boolean> {
  const supabase = serverClient || createClient()

  try {
    let query = supabase.schema('business').from('stores').select('store_id').eq('email', email)

    if (excludeStoreId) {
      query = query.neq('store_id', excludeStoreId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Validation error: ${error.message}`)
    }

    return data.length === 0 // Returns true if email is available
  } catch (error) {
    logger.queryWarn('lib/queries/store-settings', 'validateStoreEmail error', {
      error: error instanceof Error ? error.message : String(error),
      email,
    })
    throw error
  }
}

// Test function to check different access methods
export async function testTableAccess(
  storeId: string,
  serverClient?: ServerClient,
): Promise<{ success: boolean; method: string; error?: string }> {
  const supabase = serverClient || createClient()

  // Method 1: Try RPC function
  try {
    const { error } = await supabase.rpc('get_store_settings', {
      store_id_param: storeId,
    })

    if (!error) {
      return { success: true, method: 'RPC function' }
    }
  } catch (error) {
    logger.queryWarn('lib/queries/store-settings', 'testTableAccess error', {
      error: error instanceof Error ? error.message : String(error),
      storeId,
    })
  }

  // Method 2: Try business schema access
  try {
    const { error } = await supabase
      .schema('business')
      .from('stores')
      .select('store_id, store_name')
      .eq('store_id', storeId)
      .single()

    if (!error) {
      return { success: true, method: 'business schema' }
    }
  } catch (error) {
    logger.queryWarn('lib/queries/store-settings', 'Method 2 (business schema) exception', {
      error: error instanceof Error ? error.message : String(error),
      storeId,
    })
  }

  return {
    success: false,
    method: 'none',
    error: 'All table access methods failed',
  }
}

// TypeScript interface for deactivate store RPC response
export interface DeactivateStoreResponse {
  success: boolean
  store_id: string
  store_name: string
  deactivated_at: string
  employees_anonymized: number
  message: string
}

// Runtime validation for deactivate store response
function validateDeactivateStoreResponse(data: unknown): DeactivateStoreResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid deactivate store response: not an object')
  }

  const response = data as Record<string, unknown>

  if (
    typeof response.success !== 'boolean' ||
    typeof response.store_id !== 'string' ||
    typeof response.store_name !== 'string' ||
    typeof response.deactivated_at !== 'string' ||
    typeof response.employees_anonymized !== 'number' ||
    typeof response.message !== 'string'
  ) {
    throw new Error('Invalid deactivate store response: missing or invalid fields')
  }

  return {
    success: response.success,
    store_id: response.store_id,
    store_name: response.store_name,
    deactivated_at: response.deactivated_at,
    employees_anonymized: response.employees_anonymized,
    message: response.message,
  }
}

// Deactivate store (soft delete with GDPR compliance)
export async function deactivateStore(
  storeId: string,
  serverClient?: ServerClient,
): Promise<DeactivateStoreResponse> {
  return withPerformanceTracking(
    'lib/queries/store-settings',
    'deactivateStore',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      // Server-side permission check before calling RPC
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        logger.error('lib/queries/store-settings', 'Deactivation failed - user not authenticated', {
          storeId,
        })
        throw new Error('User not authenticated')
      }

      // Verify user is store owner
      const { data: storeUser, error: permissionError } = await supabase
        .schema('business')
        .from('store_users')
        .select('role_in_store, is_active')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .single()

      if (permissionError || !storeUser) {
        logger.error('lib/queries/store-settings', 'Deactivation failed - permission check error', {
          error: permissionError?.message,
          storeId,
          userId: user.id,
        })
        throw new Error('Permission check failed')
      }

      if (storeUser.role_in_store !== 'owner' || !storeUser.is_active) {
        logger.error(
          'lib/queries/store-settings',
          'Deactivation failed - insufficient permissions',
          {
            role: storeUser.role_in_store,
            isActive: storeUser.is_active,
            storeId,
            userId: user.id,
          },
        )
        throw new Error('Only active store owners can deactivate stores')
      }

      // Proceed with RPC call after permission verification
      const { data, error } = await supabase.schema('business').rpc('deactivate_store_safe', {
        p_store_id: storeId,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Store deactivation error', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to deactivate store: ${error.message}`)
      }

      // Validate the response structure
      const validatedData = validateDeactivateStoreResponse(data)

      logger.log('lib/queries/store-settings', 'Store deactivated successfully', {
        storeId,
        employeesAnonymized: validatedData.employees_anonymized,
      })

      return validatedData
    },
  )
}
