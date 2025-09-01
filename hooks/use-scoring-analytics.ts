'use client'

import { useQuery } from '@tanstack/react-query'
import { useScoringThresholds } from './use-scoring-thresholds'

// TypeScript interfaces for existing API responses
export interface ScoringAlert {
  batch_id: string
  batch_number: string
  sku: string
  product_name: string
  category: string
  brand: string
  quantity: number
  unit_type: string
  days_to_expiry: number
  expiry_date: string
  current_price: number
  cost_price: number
  margin_percent: number
  composite_score: number
  recommendation: string
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  potential_loss: number
  location: string
  supplier: string
  calculated_at: string | null
  suggested_actions: string[]
  priority_score: number
}

export interface AlertsSummary {
  total_alerts: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_potential_loss: number
  categories_affected: number
  avg_days_to_expiry: number
  expired_items: number
}

export interface AlertsResponse {
  alerts: ScoringAlert[]
  summary: AlertsSummary
  filters: {
    store_id: string
    threshold: number
    urgency_level?: string
    category?: string
    limit: number
  }
}

interface OverviewAnalytics {
  urgent_items: number
  actions_taken: number
  discount_actions: number
  total_discount_value: number
  avg_composite_score: number
  [key: string]: number | string | undefined // For other store stats
}

interface WasteAnalytics {
  expired_items: number
  expiring_soon: number
  waste_value: number
  waste_by_category: Record<string, number>
  prevention_potential: number
}

interface RevenueAnalytics {
  total_discounts_applied: number
  total_discount_value: number
  revenue_recovered: number
  waste_prevented: number
  recovery_rate: number
  avg_discount_percent: number
}

interface CategoryAnalytics {
  [category: string]: {
    total_items: number
    total_value: number
    high_urgency: number
    avg_score: number
    expiring_3days: number
  }
}

export interface AnalyticsResponse {
  analytics: {
    timeframe: string
    store_id: string
    generated_at: string
    overview?: OverviewAnalytics | { error: string }
    waste?: WasteAnalytics | { error: string }
    revenue?: RevenueAnalytics | { error: string }
    categories?: CategoryAnalytics | { error: string }
  }
}

// React Query hooks for scoring alerts and analytics using Next.js API routes

/**
 * Hook for fetching scoring alerts from /api/alerts route
 * @param storeId - Store ID to fetch alerts for
 * @param thresholdOverride - Override threshold (otherwise uses store settings)
 * @param urgencyLevel - Filter by urgency level
 * @param category - Filter by category
 */
export function useScoringAlerts(
  storeId: string | null,
  thresholdOverride?: number,
  urgencyLevel?: string,
  category?: string,
) {
  // Use store-specific threshold if no override provided
  const { warningThreshold } = useScoringThresholds(storeId || undefined)
  const threshold = thresholdOverride ?? warningThreshold
  return useQuery({
    queryKey: ['alerts', 'store', storeId!, threshold],
    queryFn: async (): Promise<AlertsResponse> => {
      const params = new URLSearchParams({
        storeId: storeId!,
      })
      
      // Only add threshold parameter if it's an override (let API use store settings otherwise)
      if (thresholdOverride !== undefined) {
        params.append('threshold', threshold.toString())
      }

      if (urgencyLevel) params.append('urgency', urgencyLevel)
      if (category) params.append('category', category)

      const response = await fetch(`/api/alerts?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!storeId,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching store analytics from /api/analytics route
 * @param storeId - Store ID to fetch analytics for
 * @param timeframe - Time period (1d/7d/30d/90d, default: 7d)
 * @param metric - Specific metric type (optional)
 * @param thresholdOverride - Override threshold (otherwise uses store settings)
 */
export function useStoreAnalytics(
  storeId: string | null,
  timeframe: string = '7d',
  metric?: string,
  thresholdOverride?: number,
) {
  // Use store-specific threshold if no override provided
  const { warningThreshold } = useScoringThresholds(storeId || undefined)
  const threshold = thresholdOverride ?? warningThreshold
  return useQuery({
    queryKey: ['analytics', 'store', storeId!, timeframe, threshold],
    queryFn: async (): Promise<AnalyticsResponse> => {
      const params = new URLSearchParams({
        storeId: storeId!,
        timeframe,
      })
      
      // Only add threshold parameter if it's an override (let API use store settings otherwise)
      if (thresholdOverride !== undefined) {
        params.append('threshold', threshold.toString())
      }

      if (metric) params.append('metric', metric)

      const response = await fetch(`/api/analytics?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!storeId,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Alias for scoring alerts (for backward compatibility)
 */
export function useScoringRecommendations(storeId: string | null, category?: string) {
  return useScoringAlerts(storeId, 0.5, undefined, category)
}

/**
 * Hook for fetching dashboard insights (7-day analytics overview)
 * @param storeId - Store ID to fetch insights for
 */
export function useDashboardInsights(storeId: string | null) {
  return useStoreAnalytics(storeId, '7d', 'overview')
}

/**
 * Hook for mobile summary (1-day analytics overview)
 * @param storeId - Store ID to fetch summary for
 */
export function useMobileSummary(storeId: string | null) {
  return useStoreAnalytics(storeId, '1d', 'overview')
}

// Direct fetch functions (for compatibility with existing code)
export async function fetchScoringAlerts(
  storeId: string,
  threshold: number = 0.6,
): Promise<ScoringAlert[]> {
  const params = new URLSearchParams({
    storeId,
    threshold: threshold.toString(),
  })

  const response = await fetch(`/api/alerts?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`)
  }

  const data = await response.json()
  return data.alerts
}

export async function fetchStoreAnalytics(
  storeId: string,
  timeframe: string = '7d',
  thresholdOverride?: number,
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({
    storeId,
    timeframe,
  })
  
  // Only add threshold parameter if it's an override
  if (thresholdOverride !== undefined) {
    params.append('threshold', thresholdOverride.toString())
  }

  const response = await fetch(`/api/analytics?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`)
  }

  return response.json()
}
