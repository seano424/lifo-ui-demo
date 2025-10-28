/**
 * Recommendation Migration Utilities for Frontend
 * Handles migration from legacy recommendation formats to standardized FastAPI formats
 */

interface DiscountRange {
  min: number
  max: number
}

// Mapping from legacy recommendations to FastAPI standard
const LEGACY_TO_FASTAPI_MAP: Record<string, string> = {
  // Legacy format -> FastAPI standard
  immediate_action: 'discount_aggressive',
  high_priority: 'discount_aggressive',
  medium_priority: 'discount_moderate',
  discount_heavily: 'discount_aggressive',
  normal: 'maintain',

  // Keep existing FastAPI standards as-is
  dispose: 'dispose',
  donate: 'donate',  // NEW: AI scoring donation recommendation
  discount_aggressive: 'discount_aggressive',
  discount_moderate: 'discount_moderate',
  discount_light: 'discount_light',  // NEW: AI scoring light discount
  alert: 'alert',
  monitor: 'monitor',
  maintain: 'maintain',
}

// Display text mapping
const FASTAPI_TO_DISPLAY_MAP: Record<string, string> = {
  dispose: 'Dispose Immediately',
  donate: 'Donate to Charity',  // NEW: AI scoring donation recommendation
  discount_aggressive: 'Apply Heavy Discount',
  discount_moderate: 'Apply Moderate Discount',
  discount_light: 'Apply Light Discount',  // NEW: AI scoring light discount
  alert: 'Monitor Closely',
  monitor: 'Routine Monitoring',
  maintain: 'No Action Needed',
}

// Priority mapping for sorting (lower = higher priority)
const PRIORITY_ORDER: Record<string, number> = {
  dispose: 1,
  donate: 2,  // NEW: High priority for donation
  discount_aggressive: 3,
  discount_moderate: 4,
  discount_light: 5,  // NEW: Lower priority for light discounts
  alert: 6,
  monitor: 7,
  maintain: 8,
}

// Color mapping for UI
const COLOR_MAP: Record<string, string> = {
  dispose: 'destructive',
  donate: 'default',  // NEW: Neutral color for donation (positive action)
  discount_aggressive: 'destructive',
  discount_moderate: 'secondary',
  discount_light: 'secondary',  // NEW: Same as moderate discount
  alert: 'secondary',
  monitor: 'outline',
  maintain: 'outline',
}

/**
 * Migrate a legacy recommendation to FastAPI standard format
 */
export function migrateRecommendation(legacyRecommendation: string | null | undefined): string {
  if (!legacyRecommendation) {
    return 'maintain'
  }

  // Clean the input
  const cleaned = legacyRecommendation.trim().toLowerCase()

  // Check direct mapping
  if (cleaned in LEGACY_TO_FASTAPI_MAP) {
    return LEGACY_TO_FASTAPI_MAP[cleaned]
  }

  // Fuzzy matching for variations
  if (cleaned.includes('immediate') || cleaned.includes('urgent')) {
    return 'discount_aggressive'
  } else if (cleaned.includes('high') && cleaned.includes('priority')) {
    return 'discount_aggressive'
  } else if (cleaned.includes('medium') && cleaned.includes('priority')) {
    return 'discount_moderate'
  } else if (
    cleaned.includes('discount') &&
    (cleaned.includes('heavy') || cleaned.includes('heavily') || cleaned.includes('aggressive'))
  ) {
    return 'discount_aggressive'
  } else if (cleaned.includes('discount') && cleaned.includes('moderate')) {
    return 'discount_moderate'
  } else if (cleaned.includes('discount') && cleaned.includes('light')) {
    return 'discount_light'
  } else if (cleaned.includes('donate') || cleaned.includes('donation')) {
    return 'donate'
  } else if (cleaned.includes('dispose') || cleaned.includes('disposal')) {
    return 'dispose'
  } else if (cleaned.includes('normal') || cleaned.includes('maintain')) {
    return 'maintain'
  } else if (cleaned.includes('monitor')) {
    return 'monitor'
  } else if (cleaned.includes('alert')) {
    return 'alert'
  }

  // Default fallback
  return 'maintain'
}

/**
 * Get user-friendly display text for a recommendation
 */
export function getDisplayText(recommendation: string | null | undefined): string {
  // First migrate if it's legacy format
  const standardRecommendation = migrateRecommendation(recommendation)

  return (
    FASTAPI_TO_DISPLAY_MAP[standardRecommendation] ||
    standardRecommendation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  )
}

/**
 * Get priority score for sorting (lower = higher priority)
 */
export function getPriorityScore(recommendation: string | null | undefined): number {
  const standardRecommendation = migrateRecommendation(recommendation)
  return PRIORITY_ORDER[standardRecommendation] || 99
}

/**
 * Get color variant for UI components
 */
export function getColorVariant(recommendation: string | null | undefined): string {
  const standardRecommendation = migrateRecommendation(recommendation)
  return COLOR_MAP[standardRecommendation] || 'outline'
}

/**
 * Categorize recommendation into action type
 */
export function getActionCategory(
  recommendation: string | null | undefined,
): 'critical' | 'action_needed' | 'monitor' | 'normal' {
  const standardRecommendation = migrateRecommendation(recommendation)

  if (standardRecommendation === 'dispose') {
    return 'critical'
  } else if (['donate', 'discount_aggressive'].includes(standardRecommendation)) {
    return 'action_needed'
  } else if (['discount_moderate', 'discount_light', 'alert'].includes(standardRecommendation)) {
    return 'monitor'
  } else {
    return 'normal'
  }
}

/**
 * Check if recommendation should show discount suggestions
 */
export function shouldShowDiscountSuggestion(recommendation: string | null | undefined): boolean {
  const standardRecommendation = migrateRecommendation(recommendation)
  return ['discount_aggressive', 'discount_moderate'].includes(standardRecommendation)
}

/**
 * Get suggested discount range based on recommendation and margin
 */
export function getSuggestedDiscountRange(
  recommendation: string | null | undefined,
  marginPercent: number,
): DiscountRange | null {
  const standardRecommendation = migrateRecommendation(recommendation)

  if (!shouldShowDiscountSuggestion(standardRecommendation)) {
    return null
  }

  // Calculate safe discount range based on margin
  const maxSafeDiscount = Math.min(Math.floor(marginPercent * 0.8), 60) // Don't go below 20% margin

  if (standardRecommendation === 'discount_aggressive') {
    return {
      min: Math.min(20, maxSafeDiscount),
      max: maxSafeDiscount,
    }
  } else if (standardRecommendation === 'discount_moderate') {
    return {
      min: 5,
      max: Math.min(25, maxSafeDiscount),
    }
  }

  return null
}

/**
 * Get action suggestions based on recommendation
 */
export function getActionSuggestions(recommendation: string | null | undefined): string[] {
  const standardRecommendation = migrateRecommendation(recommendation)

  const suggestions: Record<string, string[]> = {
    dispose: [
      'Remove from inventory immediately',
      'Check for similar expired batches',
      'Review disposal procedures',
    ],
    donate: [
      'Contact donation recipient',
      'Prepare for donation pickup',
      'Ensure food safety compliance',
      'Document donation for tax benefits',
    ],
    discount_aggressive: [
      'Apply 25-50% discount',
      'Move to prominent display area',
      'Create bundle offers',
      'Notify customers via app/email',
    ],
    discount_moderate: [
      'Apply 10-25% discount',
      'Feature in promotional materials',
      'Monitor daily for changes',
    ],
    discount_light: [
      'Apply 5-15% discount',
      'Feature in regular promotions',
      'Monitor for changes',
    ],
    alert: [
      'Monitor closely for next 24-48 hours',
      'Prepare discount strategy',
      'Check similar products',
    ],
    monitor: ['Continue routine monitoring', 'Review weekly for changes'],
    maintain: ['No immediate action required', 'Continue normal operations'],
  }

  return suggestions[standardRecommendation] || ['Continue monitoring']
}
