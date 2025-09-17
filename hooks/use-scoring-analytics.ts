// hooks/use-scoring-analytics.ts

'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { getMetricsService } from '@/lib/services/metrics'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { useScoringThresholds } from './use-scoring-thresholds'

// Type for batch actions from database
export type BatchAction = Database['inventory']['Tables']['batch_action_entries']['Row']
export type ActionType = Database['public']['Enums']['action_type']

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

interface FastAPIInventorySummary {
  total_batches: number
  total_value: number
  expired_count: number
  expiring_soon_count: number
}

interface FastAPIUrgencyDistribution {
  critical: number
  high: number
  medium: number
  low: number
}

interface FastAPIRecentAction {
  action_type: string
  batch_id: string
  original_price?: number
  new_price?: number
  executed_at: string
}

interface FastAPIAnalytics {
  inventory_summary: FastAPIInventorySummary
  urgency_distribution: FastAPIUrgencyDistribution
  recent_actions: FastAPIRecentAction[]
}

// Interface for Supabase fallback insights
interface SupabaseInsights {
  expiring_soon: {
    count: number
    description: string
  }
  ready_for_discount: {
    count: number
    description: string
  }
  perfect_for_donation: {
    count: number
    description: string
  }
  high_urgency: {
    count: number
    description: string
  }
  summary: {
    total_active_batches: number
    total_actionable_items: number
    action_required_percentage: number
  }
}

// Actionable batch type from the JSON structure you provided
export interface ActionableBatch {
  batch_id: string
  product_name: string
  expiry_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
  discount_percent: number
  reason: string
  location_code: string
  current_quantity: number
  potential_loss: number
  composite_score: number
}

export interface DashboardSummary {
  total_batches: number
  total_quantity: number
  total_value: number
  expired_count: number
  expiring_soon_count: number
}

export interface DashboardAlerts {
  expired_items: number
  expiring_soon: number
}

export interface AnalyticsResponse {
  analytics: {
    timeframe: string
    store_id: string
    generated_at: string
    source?: string
    ai_enhanced?: boolean
    ai_insights?: unknown
    ai_summary?: string
    fastapi_analytics?: FastAPIAnalytics // Available in both FastAPI and Supabase fallback for consistency
    insights?: SupabaseInsights // Added for Supabase fallback
    store_insights?: {
      store_id: string
      store_name: string
      insights: SupabaseInsights
    }
    // New fields from your JSON structure
    actionable_batches?: ActionableBatch[]
    dashboard?: {
      summary?: DashboardSummary
      alerts?: DashboardAlerts
    }
    dashboard_summary?: DashboardSummary
    dashboard_alerts?: DashboardAlerts
    waste?: WasteAnalytics | { error: string }
    revenue?: RevenueAnalytics | { error: string }
    categories?: CategoryAnalytics | { error: string }
  }
}

// Interface for todos infinite query pagination
export interface TodosInfiniteData {
  data: ActionableBatch[]
  nextPage: number | undefined
  count: number
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

  // Only include threshold in query key if it's an override
  const queryKey =
    thresholdOverride !== undefined
      ? ['alerts', 'store', storeId!, 'threshold', threshold, urgencyLevel, category]
      : ['alerts', 'store', storeId!, 'default', urgencyLevel, category]

  return useQuery({
    queryKey,
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

      const metrics = getMetricsService()
      const endpoint = `alerts_${storeId}_${urgencyLevel || 'all'}_${category || 'all'}`

      // Check circuit breaker
      if (!metrics.shouldAllowRequest(endpoint)) {
        throw new Error(`Circuit breaker open for alerts endpoint`)
      }

      const startTime = Date.now()

      try {
        const response = await fetch(`/api/alerts?${params}`)
        const duration = Date.now() - startTime

        if (!response.ok) {
          metrics.recordRequest(endpoint, duration, 'error', response.status)
          throw new Error(`Failed to fetch alerts: ${response.statusText}`)
        }

        metrics.recordRequest(endpoint, duration, 'success', response.status)
        const data = await response.json()
        return data
      } catch (error) {
        const duration = Date.now() - startTime
        const isTimeout = duration >= 10000

        metrics.recordRequest(
          endpoint,
          duration,
          isTimeout ? 'timeout' : 'error',
          undefined,
          error instanceof Error ? error.message : 'Unknown error',
        )

        throw error
      }
    },
    enabled: !!storeId,
    retry: (failureCount, error) => {
      const metrics = getMetricsService()
      const endpoint = `alerts_${storeId}_${urgencyLevel || 'all'}_${category || 'all'}`

      // Don't retry if circuit breaker is open
      if (!metrics.shouldAllowRequest(endpoint)) {
        return false
      }

      // Only retry once for non-timeout errors
      return failureCount < 1 && !(error instanceof Error && error.message.includes('timeout'))
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
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

  // Only include threshold in query key if it's an override
  const queryKey =
    thresholdOverride !== undefined
      ? ['analytics', 'store', storeId!, timeframe, 'threshold', threshold, metric]
      : ['analytics', 'store', storeId!, timeframe, 'default', metric]

  return useQuery({
    queryKey,
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

      const metrics = getMetricsService()
      const endpoint = `analytics_${storeId}_${timeframe}_${metric || 'all'}`

      // Check circuit breaker
      if (!metrics.shouldAllowRequest(endpoint)) {
        throw new Error(`Circuit breaker open for analytics endpoint`)
      }

      const startTime = Date.now()

      try {
        const response = await fetch(`/api/analytics?${params}`)
        const duration = Date.now() - startTime

        if (!response.ok) {
          metrics.recordRequest(endpoint, duration, 'error', response.status)
          throw new Error(`Failed to fetch analytics: ${response.statusText}`)
        }

        metrics.recordRequest(endpoint, duration, 'success', response.status)
        const data = await response.json()
        return data
      } catch (error) {
        const duration = Date.now() - startTime
        const isTimeout = duration >= 10000

        metrics.recordRequest(
          endpoint,
          duration,
          isTimeout ? 'timeout' : 'error',
          undefined,
          error instanceof Error ? error.message : 'Unknown error',
        )

        throw error
      }
    },
    enabled: !!storeId,
    retry: (failureCount, error) => {
      const metrics = getMetricsService()
      const endpoint = `analytics_${storeId}_${timeframe}_${metric || 'all'}`

      // Don't retry if circuit breaker is open
      if (!metrics.shouldAllowRequest(endpoint)) {
        return false
      }

      // Only retry once for non-timeout errors
      return failureCount < 1 && !(error instanceof Error && error.message.includes('timeout'))
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
}

/**
 * Alias for scoring alerts (for backward compatibility)
 */
export function useScoringRecommendations(storeId: string | null, category?: string) {
  return useScoringAlerts(storeId, 0.5, undefined, category)
}

/**
 * Hook for fetching dashboard insights (7-day analytics)
 * @param storeId - Store ID to fetch insights for
 */
export function useDashboardInsights(storeId: string | null) {
  return useStoreAnalytics(storeId, '7d')
}

/**
 * Hook for mobile summary (1-day analytics)
 * @param storeId - Store ID to fetch summary for
 */
export function useMobileSummary(storeId: string | null) {
  return useStoreAnalytics(storeId, '1d')
}

/**
 * Hook for fetching actionable batches with individual recommendations
 * ENHANCED: Uses FastAPI dashboard endpoint that triggers scoring internally
 * @param storeId - Store ID to fetch actionable batches for
 */
export function useActionableBatches(storeId: string | null) {
  return useQuery({
    queryKey: ['actionable_batches', storeId],
    queryFn: async () => {
      if (!storeId) throw new Error('Store ID required')

      const params = new URLSearchParams({
        storeId,
        timeframe: '7d', // 7-day dashboard data
      })

      const response = await fetch(`/api/analytics?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch actionable batches: ${response.statusText}`)
      }

      const data = await response.json()

      // Extract actionable batches from the enhanced analytics response
      return {
        actionable_batches: data.analytics?.actionable_batches || [],
        dashboard_summary: data.analytics?.dashboard_summary || {},
        dashboard_alerts: data.analytics?.dashboard_alerts || {},
        ai_enhanced: data.analytics?.ai_enhanced || false,
        source: data.analytics?.source || 'unknown',
      }
    },
    enabled: !!storeId,
    staleTime: 1 * 60 * 1000, // 1 minute - actionable items change quickly
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  })
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

  const metrics = getMetricsService()
  const endpoint = `alerts_${storeId}_direct`

  if (!metrics.shouldAllowRequest(endpoint)) {
    throw new Error(`Circuit breaker open for alerts endpoint`)
  }

  const startTime = Date.now()

  try {
    const response = await fetch(`/api/alerts?${params}`)
    const duration = Date.now() - startTime

    if (!response.ok) {
      metrics.recordRequest(endpoint, duration, 'error', response.status)
      throw new Error(`Failed to fetch alerts: ${response.statusText}`)
    }

    metrics.recordRequest(endpoint, duration, 'success', response.status)
    const data = await response.json()
    return data.alerts
  } catch (error) {
    const duration = Date.now() - startTime
    const isTimeout = duration >= 10000

    metrics.recordRequest(
      endpoint,
      duration,
      isTimeout ? 'timeout' : 'error',
      undefined,
      error instanceof Error ? error.message : 'Unknown error',
    )

    throw error
  }
}

/**
 * Fetch actionable batches directly from enhanced analytics endpoint
 * @param storeId - Store ID to fetch actionable batches for
 */
export async function fetchActionableBatches(storeId: string): Promise<{
  actionable_batches: Array<{
    batch_id: string
    product_name: string
    expiry_date: string
    urgency: 'critical' | 'high' | 'medium' | 'low'
    recommendation: string
    discount_percent: number
    reason: string
    location_code: string
    current_quantity: number
    potential_loss: number
    composite_score: number
  }>
  dashboard_summary: Record<string, unknown>
  dashboard_alerts: Record<string, unknown>
  ai_enhanced: boolean
  source: string
}> {
  const params = new URLSearchParams({
    storeId,
    timeframe: '7d',
  })

  const response = await fetch(`/api/analytics?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch actionable batches: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    actionable_batches: data.analytics?.actionable_batches || [],
    dashboard_summary: data.analytics?.dashboard_summary || {},
    dashboard_alerts: data.analytics?.dashboard_alerts || {},
    ai_enhanced: data.analytics?.ai_enhanced || false,
    source: data.analytics?.source || 'unknown',
  }
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

  const metrics = getMetricsService()
  const endpoint = `analytics_${storeId}_${timeframe}_direct`

  if (!metrics.shouldAllowRequest(endpoint)) {
    throw new Error(`Circuit breaker open for analytics endpoint`)
  }

  const startTime = Date.now()

  try {
    const response = await fetch(`/api/analytics?${params}`)
    const duration = Date.now() - startTime

    if (!response.ok) {
      metrics.recordRequest(endpoint, duration, 'error', response.status)
      throw new Error(`Failed to fetch analytics: ${response.statusText}`)
    }

    metrics.recordRequest(endpoint, duration, 'success', response.status)
    return response.json()
  } catch (error) {
    const duration = Date.now() - startTime
    const isTimeout = duration >= 10000

    metrics.recordRequest(
      endpoint,
      duration,
      isTimeout ? 'timeout' : 'error',
      undefined,
      error instanceof Error ? error.message : 'Unknown error',
    )

    throw error
  }
}

/**
 * Hook for infinite query pagination of todos (actionable batches)
 * This provides client-side pagination for better UX and mutation support
 * @param storeId - Store ID to fetch todos for
 * @param pageSize - Number of items per page (default: 20)
 * @param timeframe - Analytics timeframe (default: '7d')
 * @param thresholdOverride - Optional threshold override
 */
export function useTodosInfinite(
  storeId: string | null,
  pageSize: number = 20,
  timeframe: string = '7d',
  thresholdOverride?: number,
  filters?: { urgency?: string },
) {
  // Get the full analytics data first
  const {
    data: allAnalytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useStoreAnalytics(storeId, timeframe, undefined, thresholdOverride)

  return useInfiniteQuery({
    queryKey: ['todos', 'infinite', storeId, pageSize, timeframe, thresholdOverride, filters],
    queryFn: ({ pageParam = 0 }): TodosInfiniteData => {
      let batches = allAnalytics?.analytics?.actionable_batches || []

      // Apply urgency filter before pagination
      if (filters?.urgency && filters.urgency !== 'all') {
        batches = batches.filter(batch => batch.urgency === filters.urgency)
      }

      const start = pageParam * pageSize
      const end = start + pageSize

      return {
        data: batches.slice(start, end),
        nextPage: end < batches.length ? pageParam + 1 : undefined,
        count: batches.length,
      }
    },
    enabled: !!allAnalytics && !isLoadingAnalytics && !analyticsError,
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    staleTime: 10 * 60 * 1000, // 10 minutes - same as base analytics
  })
}

// Enhanced batch action type with related data for UI display
export interface BatchActionWithDetails extends BatchAction {
  // From the batches table join
  product_name?: string
  batch_number?: string
  sku?: string
  expiry_date?: string
  location_code?: string

  // From the donation recipient join (if applicable)
  recipient_name?: string
  recipient_type?: string

  // For computing effectiveness
  original_price?: number
  new_price?: number

  // Backward compatibility aliases for old column names
  action_id: string // Maps to entry_id
  action_date: string | null // Maps to performed_at
  actual_action: Database['public']['Enums']['action_type'] // Maps to action_type
  original_value: number // Maps to total_original_value
  recovered_value: number // Maps to total_recovered_value
}

// Interface for batch actions infinite query pagination
export interface BatchActionsInfiniteData {
  data: BatchActionWithDetails[]
  nextPage: number | undefined
  count: number
}

/**
 * Hook for infinite query pagination of batch actions (action history)
 * Fetches user actions on inventory batches with infinite scrolling support
 * @param storeId - Store ID to fetch actions for
 * @param pageSize - Number of items per page (default: 20)
 * @param filters - Optional filters for action type, date range, etc.
 */
export function useBatchActionsInfinite(
  storeId: string | null,
  pageSize: number = 20,
  filters?: {
    actionType?: ActionType
    dateFrom?: string
    dateTo?: string
  },
) {
  console.log('[useBatchActionsInfinite] Hook called with:', {
    storeId,
    pageSize,
    filters,
  })

  return useInfiniteQuery({
    queryKey: storeId
      ? queryKeys.batchActions.infinite(storeId, pageSize, filters)
      : ['batchActions', 'disabled'],
    queryFn: async ({ pageParam = 0 }): Promise<BatchActionsInfiniteData> => {
      console.log('[useBatchActionsInfinite] QueryFn executing with:', {
        storeId,
        pageParam,
        pageSize,
        filters,
      })
      if (!storeId) {
        return { data: [], nextPage: undefined, count: 0 }
      }

      const supabase = createClient()
      const limit = pageSize
      const offset = pageParam * pageSize

      // Build the query with joins to get related data
      let query = supabase
        .schema('inventory')
        .from('batch_action_entries')
        .select(
          `
          *,
          batches (
            batch_number,
            expiry_date,
            location_code,
            store_products (
              products (
                name,
                sku
              )
            )
          ),
          donation_recipients (
            name,
            recipient_type
          )
        `,
          { count: 'exact' },
        )
        .eq('store_id', storeId)
        .order('performed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters if provided
      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType)
      }
      if (filters?.dateFrom) {
        query = query.gte('performed_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('performed_at', filters.dateTo)
      }

      console.log('[useBatchActionsInfinite] Query details:', {
        storeId,
        schema: 'inventory',
        table: 'batch_action_entries',
        filters: {
          store_id: storeId,
          action_type: filters?.actionType || 'none',
          dateFrom: filters?.dateFrom || 'none',
          dateTo: filters?.dateTo || 'none',
        },
        orderBy: 'performed_at DESC',
        pagination: `LIMIT ${limit} OFFSET ${offset}`,
      })

      console.log('[useBatchActionsInfinite] About to execute query for store:', storeId)
      const { data, error, count } = await query

      console.log('[useBatchActionsInfinite] Query executed:', {
        hasError: !!error,
        errorMessage: error?.message,
        dataLength: data?.length || 0,
        totalCount: count,
      })

      if (error) {
        console.error('[useBatchActionsInfinite] Supabase error:', error)
        throw new Error(`Failed to fetch batch actions: ${error.message}`)
      }

      // Log the raw data for debugging
      console.log('[useBatchActionsInfinite] Raw batch actions data:', {
        storeId,
        pageParam,
        offset,
        limit,
        dataLength: data?.length || 0,
        count,
        rawData: data,
      })

      // Transform the data to include related information
      const transformedData: BatchActionWithDetails[] = (data || []).map(action => ({
        ...action,
        // Flatten batch data
        product_name: action.batches?.store_products?.products?.name,
        batch_number: action.batches?.batch_number,
        sku: action.batches?.store_products?.products?.sku,
        expiry_date: action.batches?.expiry_date,
        location_code: action.batches?.location_code,
        // Flatten recipient data
        recipient_name: action.donation_recipients?.name,
        recipient_type: action.donation_recipients?.recipient_type,
        // Map new column names to old ones for backward compatibility
        action_id: action.entry_id,
        action_date: action.performed_at,
        actual_action: action.action_type,
        original_value: action.total_original_value,
        recovered_value: action.total_recovered_value,
      }))

      console.log('[useBatchActionsInfinite] Transformed data:', {
        transformedLength: transformedData.length,
        transformedData,
      })

      const totalCount = count || 0
      const hasMore = offset + limit < totalCount

      return {
        data: transformedData,
        nextPage: hasMore ? pageParam + 1 : undefined,
        count: totalCount,
      }
    },
    enabled: !!storeId,
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    staleTime: 0, // Force fresh queries for debugging
    gcTime: 0, // Don't cache for debugging
  })
}

// Count hooks for tab badges
export function useSuggestionsCount(storeId: string | null, urgency?: string) {
  const { data: analyticsResponse } = useStoreAnalytics(storeId || '')
  const { data: infiniteData } = useTodosInfinite(storeId || '', 20, '7d', undefined, {
    urgency: urgency && urgency !== 'all' ? urgency : undefined,
  })

  // Use infinite query count if available, otherwise calculate from analytics
  if (infiniteData?.pages?.[0]?.count !== undefined) {
    return infiniteData.pages[0].count
  }

  if (!analyticsResponse?.analytics?.actionable_batches) return 0

  if (urgency && urgency !== 'all') {
    return analyticsResponse.analytics.actionable_batches.filter(batch => batch.urgency === urgency)
      .length
  }

  return analyticsResponse.analytics.actionable_batches.length
}

export function useRecentlyExpiredCount(storeId: string | null) {
  const { data: analyticsResponse } = useStoreAnalytics(storeId || '')

  if (!analyticsResponse?.analytics?.actionable_batches) return 0

  return analyticsResponse.analytics.actionable_batches.filter(
    batch => new Date(batch.expiry_date) < new Date(),
  ).length
}

export function useAllActiveCount(storeId: string | null, urgency?: string) {
  const { data: analyticsResponse } = useStoreAnalytics(storeId || '')

  if (!analyticsResponse?.analytics?.actionable_batches) return 0

  const activeBatches = analyticsResponse.analytics.actionable_batches.filter(
    batch => new Date(batch.expiry_date) >= new Date(),
  )

  if (urgency && urgency !== 'all') {
    return activeBatches.filter(batch => batch.urgency === urgency).length
  }

  return activeBatches.length
}

export function useActionHistoryCount(storeId: string | null, actionType?: string) {
  const { data: batchActionsData } = useBatchActionsInfinite(storeId, 20)

  if (!batchActionsData?.pages?.[0]) return 0

  // Use filtered count if action type is specified
  if (actionType && actionType !== 'all') {
    const allActions = batchActionsData.pages.flatMap(page => page.data)
    return allActions.filter(action => action.actual_action === actionType).length
  }

  // Use total count from first page
  return batchActionsData.pages[0].count || 0
}
