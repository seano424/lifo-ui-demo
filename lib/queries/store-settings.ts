// lib/queries/store-settings.ts - RPC VERSION (FINAL FIX)
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import { safeParseJsonb } from '@/lib/validation/jsonb-validators'
import type {
  StoreSettingsCompleteResult,
  UpdateStoreSettingsResult,
  UpdateStoreAdvancedSettingsResult,
  UpdateStoreThresholdsResult,
  GetStoreSettingsResult,
} from '@/types/rpc-returns'

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

      const result = data as StoreSettingsCompleteResult | null
      if (!result) {
        throw new Error('No data returned from get_store_settings_complete')
      }

      // Data comes as { store: {...}, settings: {...} }
      return {
        ...result.store,
        settings: result.settings || undefined,
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
        store_name_param: updates.store_name ?? undefined,
        business_name_param: updates.business_name ?? undefined,
        store_code_param: updates.store_code ?? undefined,
        store_type_param: updates.store_type ?? undefined,
        size_category_param: updates.size_category ?? undefined,
        address_param: updates.address ?? undefined,
        city_param: updates.city ?? undefined,
        postal_code_param: updates.postal_code ?? undefined,
        country_param: updates.country ?? undefined,
        phone_param: updates.phone ?? undefined,
        email_param: updates.email ?? undefined,
        website_url_param: updates.website_url ?? undefined,
        description_param: updates.description ?? undefined,
        default_markup_percent_param: updates.default_markup_percent ?? undefined,
        waste_reduction_target_percent_param: updates.waste_reduction_target_percent ?? undefined,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Store update error via RPC', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to update store: ${error.message}`)
      }

      const result = data as UpdateStoreSettingsResult | null
      if (!result) {
        throw new Error('No data returned from update_store_settings')
      }

      return result as unknown as StoreBasicInfo
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
        p_critical_threshold: updates.critical_threshold ?? undefined,
        p_warning_threshold: updates.warning_threshold ?? undefined,
        p_scoring_weights: updates.scoring_weights ?? undefined,
        p_notification_preferences: updates.notification_preferences ?? undefined,
        p_display_preferences: updates.display_preferences ?? undefined,
        p_backup_preferences: updates.backup_preferences ?? undefined,
        p_opening_hours: updates.opening_hours ?? undefined,
        p_peak_hours: updates.peak_hours ?? undefined,
        p_weather_location_lat: updates.weather_location_lat ?? undefined,
        p_weather_location_lon: updates.weather_location_lon ?? undefined,
        p_currency: updates.currency ?? undefined,
      })

      if (error) {
        logger.queryWarn('lib/queries/store-settings', 'Failed to update store advanced settings', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to update settings: ${error.message}`)
      }

      const result = data as UpdateStoreAdvancedSettingsResult[] | null
      if (!result || result.length === 0) {
        logger.queryWarn('lib/queries/store-settings', 'No data returned from update operation', {
          storeId,
        })
        throw new Error('No data returned from update operation')
      }

      const firstResult = result[0]

      // Validate JSONB fields with runtime validation
      const validatedSettings: StoreAdvancedSettings = {
        store_id: firstResult.store_id,
        critical_threshold: firstResult.critical_threshold,
        warning_threshold: firstResult.warning_threshold,
        weather_location_lat: firstResult.weather_location_lat,
        weather_location_lon: firstResult.weather_location_lon,
        currency: firstResult.currency,
        updated_at: firstResult.updated_at,
      }

      // Validate and parse scoring_weights if present
      if (firstResult.scoring_weights) {
        const scoringResult = safeParseJsonb.scoringWeights(firstResult.scoring_weights)
        if (!scoringResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid scoring_weights from RPC', {
            error: scoringResult.error,
            storeId,
          })
          throw new Error('Invalid scoring_weights data returned from database')
        }
        validatedSettings.scoring_weights = scoringResult.data
      }

      // Validate and parse notification_preferences if present
      if (firstResult.notification_preferences) {
        const notificationResult = safeParseJsonb.notificationPreferences(
          firstResult.notification_preferences,
        )
        if (!notificationResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid notification_preferences from RPC', {
            error: notificationResult.error,
            storeId,
          })
          throw new Error('Invalid notification_preferences data returned from database')
        }
        validatedSettings.notification_preferences = notificationResult.data
      }

      // Validate and parse display_preferences if present
      if (firstResult.display_preferences) {
        const displayResult = safeParseJsonb.displayPreferences(firstResult.display_preferences)
        if (!displayResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid display_preferences from RPC', {
            error: displayResult.error,
            storeId,
          })
          throw new Error('Invalid display_preferences data returned from database')
        }
        validatedSettings.display_preferences = displayResult.data
      }

      // Validate and parse backup_preferences if present
      if (firstResult.backup_preferences) {
        const backupResult = safeParseJsonb.backupPreferences(firstResult.backup_preferences)
        if (!backupResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid backup_preferences from RPC', {
            error: backupResult.error,
            storeId,
          })
          throw new Error('Invalid backup_preferences data returned from database')
        }
        validatedSettings.backup_preferences = backupResult.data
      }

      // Validate and parse opening_hours if present
      if (firstResult.opening_hours) {
        const openingResult = safeParseJsonb.openingHours(firstResult.opening_hours)
        if (!openingResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid opening_hours from RPC', {
            error: openingResult.error,
            storeId,
          })
          throw new Error('Invalid opening_hours data returned from database')
        }
        validatedSettings.opening_hours = openingResult.data
      }

      // Validate and parse peak_hours if present
      if (firstResult.peak_hours) {
        const peakResult = safeParseJsonb.peakHours(firstResult.peak_hours)
        if (!peakResult.success) {
          logger.error('lib/queries/store-settings', 'Invalid peak_hours from RPC', {
            error: peakResult.error,
            storeId,
          })
          throw new Error('Invalid peak_hours data returned from database')
        }
        validatedSettings.peak_hours = peakResult.data
      }

      return validatedSettings
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

      const result = data as UpdateStoreThresholdsResult[] | null
      if (!result || result.length === 0) {
        logger.queryWarn('lib/queries/store-settings', 'No data returned from threshold update', {
          storeId,
        })
        throw new Error('No data returned from threshold update operation')
      }

      return result[0] // RPC returns an array, get the first result
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
    const rpcResult = await supabase.rpc('get_store_settings', {
      store_id_param: storeId,
    })
    const rpcData = rpcResult.data as GetStoreSettingsResult | null
    const rpcError = rpcResult.error

    // Test 2: Check user's role in the store via business schema
    const { data: roleData, error: roleError } = await supabase
      .schema('business')
      .from('store_users')
      .select('role_in_store, permissions, is_active')
      .eq('store_id', storeId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
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
  } catch (err) {
    logger.queryWarn('lib/queries/store-settings', 'testTableAccess error', {
      error: err instanceof Error ? err.message : String(err),
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
