// lib/utils/scoring-thresholds.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export type ThresholdType = 'critical' | 'warning'

/**
 * Get store-specific threshold for scoring alerts
 * Falls back to sensible defaults if store settings don't exist
 * 
 * @param supabase - Supabase client
 * @param storeId - Store ID
 * @param type - Type of threshold ('critical' | 'warning')
 * @returns Promise<number> - Threshold value between 0 and 1
 */
export async function getStoreThreshold(
  supabase: SupabaseClient<Database>,
  storeId: string,
  type: ThresholdType = 'warning'
): Promise<number> {
  try {
    // Get store settings from business.store_settings
    const { data: settings, error } = await supabase
      .schema('business')
      .from('store_settings')
      .select('critical_threshold, warning_threshold')
      .eq('store_id', storeId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.warn('[getStoreThreshold] Error fetching store settings:', error)
    }

    // Use store-specific threshold or fall back to defaults
    const threshold = type === 'critical' 
      ? settings?.critical_threshold || 0.8
      : settings?.warning_threshold || 0.7

    // Ensure threshold is a valid number between 0 and 1
    const numericThreshold = parseFloat(threshold.toString())
    
    if (isNaN(numericThreshold) || numericThreshold < 0 || numericThreshold > 1) {
      console.warn(`[getStoreThreshold] Invalid threshold value: ${threshold}, using default`)
      return type === 'critical' ? 0.8 : 0.7
    }

    console.log(`[getStoreThreshold] Store ${storeId} ${type} threshold: ${numericThreshold}`)
    return numericThreshold
    
  } catch (error) {
    console.error('[getStoreThreshold] Unexpected error:', error)
    // Fall back to defaults on any error
    return type === 'critical' ? 0.8 : 0.7
  }
}

/**
 * Get both critical and warning thresholds for a store
 * 
 * @param supabase - Supabase client
 * @param storeId - Store ID
 * @returns Promise<{critical: number, warning: number}> - Both threshold values
 */
export async function getStoreThresholds(
  supabase: SupabaseClient<Database>,
  storeId: string
): Promise<{ critical: number; warning: number }> {
  try {
    const { data: settings, error } = await supabase
      .schema('business')
      .from('store_settings')
      .select('critical_threshold, warning_threshold')
      .eq('store_id', storeId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('[getStoreThresholds] Error fetching store settings:', error)
    }

    const critical = parseFloat((settings?.critical_threshold || 0.8).toString())
    const warning = parseFloat((settings?.warning_threshold || 0.7).toString())

    return {
      critical: isNaN(critical) || critical < 0 || critical > 1 ? 0.8 : critical,
      warning: isNaN(warning) || warning < 0 || warning > 1 ? 0.7 : warning,
    }
  } catch (error) {
    console.error('[getStoreThresholds] Unexpected error:', error)
    return { critical: 0.8, warning: 0.7 }
  }
}

/**
 * Default threshold values used as fallbacks
 */
export const DEFAULT_THRESHOLDS = {
  critical: 0.8,
  warning: 0.7,
} as const