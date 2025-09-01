// lib/queries/store-settings.ts - RPC VERSION (FINAL FIX)
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'

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

// Fetch store settings using RPC function
export async function fetchStoreSettings(
  storeId: string,
  serverClient?: ServerClient,
): Promise<StoreSettingsData> {
  const supabase = serverClient || createClient()

  // Use the RPC function to get store data
  const { data: storeData, error: storeError } = await supabase.rpc('get_store_settings', {
    store_id_param: storeId,
  })

  if (storeError) {
    console.error('❌ Store fetch error:', storeError)
    throw new Error(`Failed to fetch store: ${storeError.message}`)
  }

  // Still fetch store settings from business.store_settings if needed
  const { data: settingsData, error: settingsError } = await supabase
    .schema('business')
    .from('store_settings')
    .select('*')
    .eq('store_id', storeId)
    .single()

  // Settings might not exist yet, that's OK
  if (settingsError && settingsError.code !== 'PGRST116') {
    console.warn('⚠️ Failed to fetch store settings:', settingsError.message)
  }

  return {
    ...storeData,
    settings: settingsData || undefined,
  }
}

// Update store basic information using RPC function
export async function updateStoreBasicInfo(
  storeId: string,
  updates: Partial<StoreBasicInfo>,
  serverClient?: ServerClient,
): Promise<StoreBasicInfo> {
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
    console.error('❌ Store update error via RPC:', error)
    throw new Error(`Failed to update store: ${error.message}`)
  }

  return data
}

// Fallback: Direct table access for advanced settings
export async function updateStoreAdvancedSettings(
  storeId: string,
  updates: Partial<StoreAdvancedSettings>,
  serverClient?: ServerClient,
): Promise<StoreAdvancedSettings> {
  const supabase = serverClient || createClient()

  // First check if settings record exists
  const { data: existingSettings } = await supabase
    .schema('business')
    .from('store_settings')
    .select('store_id')
    .eq('store_id', storeId)
    .single()

  let result: StoreAdvancedSettings
  if (existingSettings) {
    // Update existing settings
    const { data, error } = await supabase
      .schema('business')
      .from('store_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update settings: ${error.message}`)
    result = data
  } else {
    // Create new settings record
    const { data, error } = await supabase
      .schema('business')
      .from('store_settings')
      .insert({
        store_id: storeId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create settings: ${error.message}`)
    result = data
  }

  return result
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
    console.error('validateStoreCode error:', error)
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
    console.error('validateStoreEmail error:', error)
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
    console.error('testTableAccess error:', error)
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
    console.error('❌ Method 2 (business schema) exception:', error)
  }

  return {
    success: false,
    method: 'none',
    error: 'All table access methods failed',
  }
}
