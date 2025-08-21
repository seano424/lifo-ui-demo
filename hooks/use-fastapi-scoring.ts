'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'

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

export interface AnalyticsResponse {
  analytics: {
    timeframe: string
    store_id: string
    generated_at: string
    overview?: any
    waste?: any
    revenue?: any
    categories?: any
  }
}

// React Query hooks using existing backend routes

/**
 * Hook for fetching scoring alerts from existing /api/alerts route
 * @param storeId - Store ID to fetch alerts for
 * @param threshold - Score threshold (default: 0.6)
 * @param urgencyLevel - Filter by urgency level
 * @param category - Filter by category
 */
export function useScoringAlerts(
  storeId: string | null,
  threshold: number = 0.6,
  urgencyLevel?: string,
  category?: string,
) {
  return useQuery({
    queryKey: queryKeys.fastapi.scoring.alerts(storeId!, threshold),
    queryFn: async (): Promise<AlertsResponse> => {
      const params = new URLSearchParams({
        storeId: storeId!,
        threshold: threshold.toString(),
      })

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
 * Hook for fetching store analytics from existing /api/analytics route
 * @param storeId - Store ID to fetch analytics for
 * @param timeframe - Time period (1d/7d/30d/90d, default: 7d)
 * @param metric - Specific metric type (optional)
 */
export function useStoreAnalytics(
  storeId: string | null,
  timeframe: string = '7d',
  metric?: string,
) {
  return useQuery({
    queryKey: queryKeys.fastapi.analytics.store(storeId!, timeframe),
    queryFn: async (): Promise<AnalyticsResponse> => {
      const params = new URLSearchParams({
        storeId: storeId!,
        timeframe,
      })

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
 * Hook for fetching dashboard insights (using analytics with overview metric)
 * @param storeId - Store ID to fetch insights for
 */
export function useDashboardInsights(storeId: string | null) {
  return useStoreAnalytics(storeId, '7d', 'overview')
}

/**
 * Hook for mobile summary (using analytics with overview metric and shorter timeframe)
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
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({
    storeId,
    timeframe,
  })

  const response = await fetch(`/api/analytics?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`)
  }

  return response.json()
}
