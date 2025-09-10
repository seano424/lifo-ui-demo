/**
 * Recommendation Migration Utilities for Frontend
 * Handles migration from legacy recommendation formats to standardized FastAPI formats
 */

interface DiscountRange {
  min: number
  max: number
}

export class RecommendationMigrator {
  // Mapping from legacy recommendations to FastAPI standard
  private static readonly LEGACY_TO_FASTAPI_MAP: Record<string, string> = {
    // Legacy format -> FastAPI standard
    immediate_action: 'discount_aggressive',
    high_priority: 'discount_aggressive',
    medium_priority: 'discount_moderate',
    discount_heavily: 'discount_aggressive',
    normal: 'maintain',

    // Keep existing FastAPI standards as-is
    dispose: 'dispose',
    discount_aggressive: 'discount_aggressive',
    discount_moderate: 'discount_moderate',
    alert: 'alert',
    monitor: 'monitor',
    maintain: 'maintain',
  }

  // Display text mapping
  private static readonly FASTAPI_TO_DISPLAY_MAP: Record<string, string> = {
    dispose: 'Dispose Immediately',
    discount_aggressive: 'Apply Heavy Discount',
    discount_moderate: 'Apply Moderate Discount',
    alert: 'Monitor Closely',
    monitor: 'Routine Monitoring',
    maintain: 'No Action Needed',
  }

  // Priority mapping for sorting (lower = higher priority)
  private static readonly PRIORITY_ORDER: Record<string, number> = {
    dispose: 1,
    discount_aggressive: 2,
    discount_moderate: 3,
    alert: 4,
    monitor: 5,
    maintain: 6,
  }

  // Color mapping for UI
  private static readonly COLOR_MAP: Record<string, string> = {
    dispose: 'destructive',
    discount_aggressive: 'destructive',
    discount_moderate: 'secondary',
    alert: 'secondary',
    monitor: 'outline',
    maintain: 'outline',
  }

  /**
   * Migrate a legacy recommendation to FastAPI standard format
   */
  static migrateRecommendation(legacyRecommendation: string | null | undefined): string {
    if (!legacyRecommendation) {
      return 'maintain'
    }

    // Clean the input
    const cleaned = legacyRecommendation.trim().toLowerCase()

    // Check direct mapping
    if (cleaned in RecommendationMigrator.LEGACY_TO_FASTAPI_MAP) {
      return RecommendationMigrator.LEGACY_TO_FASTAPI_MAP[cleaned]
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
      (cleaned.includes('heavy') || cleaned.includes('heavily'))
    ) {
      return 'discount_aggressive'
    } else if (cleaned.includes('discount') && cleaned.includes('moderate')) {
      return 'discount_moderate'
    } else if (cleaned.includes('normal') || cleaned.includes('maintain')) {
      return 'maintain'
    } else if (cleaned.includes('monitor')) {
      return 'monitor'
    } else if (cleaned.includes('alert')) {
      return 'alert'
    } else if (cleaned.includes('dispose')) {
      return 'dispose'
    }

    // Default fallback
    return 'maintain'
  }

  /**
   * Get user-friendly display text for a recommendation
   */
  static getDisplayText(recommendation: string | null | undefined): string {
    // First migrate if it's legacy format
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)

    return (
      RecommendationMigrator.FASTAPI_TO_DISPLAY_MAP[standardRecommendation] ||
      standardRecommendation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    )
  }

  /**
   * Get priority score for sorting (lower = higher priority)
   */
  static getPriorityScore(recommendation: string | null | undefined): number {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)
    return RecommendationMigrator.PRIORITY_ORDER[standardRecommendation] || 99
  }

  /**
   * Get color variant for UI components
   */
  static getColorVariant(recommendation: string | null | undefined): string {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)
    return RecommendationMigrator.COLOR_MAP[standardRecommendation] || 'outline'
  }

  /**
   * Categorize recommendation into action type
   */
  static getActionCategory(
    recommendation: string | null | undefined,
  ): 'critical' | 'action_needed' | 'monitor' | 'normal' {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)

    if (standardRecommendation === 'dispose') {
      return 'critical'
    } else if (standardRecommendation === 'discount_aggressive') {
      return 'action_needed'
    } else if (['discount_moderate', 'alert'].includes(standardRecommendation)) {
      return 'monitor'
    } else {
      return 'normal'
    }
  }

  /**
   * Check if recommendation should show discount suggestions
   */
  static shouldShowDiscountSuggestion(recommendation: string | null | undefined): boolean {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)
    return ['discount_aggressive', 'discount_moderate'].includes(standardRecommendation)
  }

  /**
   * Get suggested discount range based on recommendation and margin
   */
  static getSuggestedDiscountRange(
    recommendation: string | null | undefined,
    marginPercent: number,
  ): DiscountRange | null {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)

    if (!RecommendationMigrator.shouldShowDiscountSuggestion(standardRecommendation)) {
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
  static getActionSuggestions(recommendation: string | null | undefined): string[] {
    const standardRecommendation = RecommendationMigrator.migrateRecommendation(recommendation)

    const suggestions: Record<string, string[]> = {
      dispose: [
        'Remove from inventory immediately',
        'Check for similar expired batches',
        'Review disposal procedures',
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
}

// Convenience functions for easy importing
export const migrateRecommendation = (recommendation: string | null | undefined) =>
  RecommendationMigrator.migrateRecommendation(recommendation)

export const getDisplayText = (recommendation: string | null | undefined) =>
  RecommendationMigrator.getDisplayText(recommendation)

export const getPriorityScore = (recommendation: string | null | undefined) =>
  RecommendationMigrator.getPriorityScore(recommendation)

export const getColorVariant = (recommendation: string | null | undefined) =>
  RecommendationMigrator.getColorVariant(recommendation)

export const getActionCategory = (recommendation: string | null | undefined) =>
  RecommendationMigrator.getActionCategory(recommendation)

export const shouldShowDiscountSuggestion = (recommendation: string | null | undefined) =>
  RecommendationMigrator.shouldShowDiscountSuggestion(recommendation)

export const getSuggestedDiscountRange = (
  recommendation: string | null | undefined,
  marginPercent: number,
) => RecommendationMigrator.getSuggestedDiscountRange(recommendation, marginPercent)

export const getActionSuggestions = (recommendation: string | null | undefined) =>
  RecommendationMigrator.getActionSuggestions(recommendation)
