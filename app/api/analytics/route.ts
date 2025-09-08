// app/api/analytics/route.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { fastApiClient } from '@/lib/services/fastapi-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStoreThreshold } from '@/lib/utils/scoring-thresholds'
import type { Database } from '@/types/supabase'

// Helper type for batch with store_products join
type BatchWithStoreProduct = Database['inventory']['Tables']['batches']['Row'] & {
  store_products?: {
    products?: { category?: string; name?: string; sku?: string }
  }
}

export async function GET(request: NextRequest) {
  // Use admin client for analytics - no user auth required
  const supabase = createAdminClient()

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  const timeframe = searchParams.get('timeframe') || '7d' // 1d, 7d, 30d, 90d
  const metric = searchParams.get('metric') // 'overview', 'waste', 'revenue', 'categories'
  // Allow override via URL parameter, otherwise use store settings
  const thresholdOverride = searchParams.get('threshold')

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

  // Get threshold from store settings or URL override
  const threshold = thresholdOverride
    ? parseFloat(thresholdOverride)
    : await getStoreThreshold(supabase, storeId, 'warning')

  // Validate threshold
  if (threshold < 0 || threshold > 1) {
    return NextResponse.json(
      {
        error: 'Threshold must be between 0 and 1',
      },
      { status: 400 },
    )
  }

  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (timeframe) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    const analytics: Record<string, unknown> = {
      timeframe,
      store_id: storeId,
      generated_at: new Date().toISOString(),
    }

    // Phase 2 Step 4: Try FastAPI for enhanced AI analytics
    // Database connectivity has been fixed - re-enabling FastAPI
    const useFastAPI =
      process.env.ENABLE_FASTAPI === 'true' || process.env.NODE_ENV === 'development'
    console.log(
      `[ANALYTICS] FastAPI enabled: ${useFastAPI} (ENABLE_FASTAPI=${process.env.ENABLE_FASTAPI}, NODE_ENV=${process.env.NODE_ENV})`,
    )
    let fastApiAnalytics = null

    if (useFastAPI) {
      try {
        console.log(`[ANALYTICS] Attempting FastAPI for store ${storeId}`)

        // Get user's session with access token
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const days =
            timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

          try {
            fastApiAnalytics = await fastApiClient.getStoreAnalyticsWithUserToken(
              storeId,
              session.access_token,
              days,
            )

            console.log(`[ANALYTICS] FastAPI user JWT success: Enhanced analytics with AI insights`)
          } catch (userError) {
            console.warn('[ANALYTICS] User JWT failed, trying service key fallback:', userError)

            // Fallback to service key if user JWT fails
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            if (serviceKey) {
              fastApiAnalytics = await fastApiClient.getStoreAnalyticsWithServiceKey(
                storeId,
                serviceKey,
                days,
              )
              console.log(`[ANALYTICS] FastAPI service key fallback success`)
            }
          }

          if (fastApiAnalytics) {
            analytics.source = 'fastapi'
            analytics.ai_enhanced = true

            // Add FastAPI AI insights
            if (fastApiAnalytics.ai_insights) {
              analytics.ai_insights = fastApiAnalytics.ai_insights
            }

            if (fastApiAnalytics.summary) {
              analytics.ai_summary = fastApiAnalytics.summary
            }

            // Include full FastAPI analytics data
            if (fastApiAnalytics.analytics) {
              analytics.fastapi_analytics = fastApiAnalytics.analytics
            }
          }
        } else {
          console.warn('[ANALYTICS] No user session, trying service key fallback')

          // Direct service key fallback if no user session
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceKey) {
            const days =
              timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

            fastApiAnalytics = await fastApiClient.getStoreAnalyticsWithServiceKey(
              storeId,
              serviceKey,
              days,
            )

            console.log(`[ANALYTICS] FastAPI service key success`)
            analytics.source = 'fastapi'
            analytics.ai_enhanced = true

            // Add FastAPI AI insights
            if (fastApiAnalytics.ai_insights) {
              analytics.ai_insights = fastApiAnalytics.ai_insights
            }

            if (fastApiAnalytics.summary) {
              analytics.ai_summary = fastApiAnalytics.summary
            }

            // Include full FastAPI analytics data
            if (fastApiAnalytics.analytics) {
              analytics.fastapi_analytics = fastApiAnalytics.analytics
            }
          }
        }
      } catch (fastApiError) {
        console.warn('[ANALYTICS] FastAPI failed, using Supabase fallback:', fastApiError)
        analytics.source = 'supabase'
        analytics.ai_enhanced = false
      }
    } else {
      analytics.source = 'supabase'
      analytics.ai_enhanced = false
    }

    if (!metric || metric === 'waste') {
      // Get waste analytics
      analytics.waste = await getWasteAnalytics(supabase, storeId, startDate, endDate)
    }

    if (!metric || metric === 'revenue') {
      // Get revenue analytics
      analytics.revenue = await getRevenueAnalytics(supabase, storeId, startDate, endDate)
    }

    if (!metric || metric === 'categories') {
      // Get category analytics
      analytics.categories = await getCategoryAnalytics(supabase, storeId)
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getWasteAnalytics(
  supabase: SupabaseClient<Database>,
  storeId: string,
  startDate: Date,
  endDate: Date,
) {
  try {
    // Get expired batches (from inventory schema with products join)
    const { data: expiredBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'expired')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())

    // Get batches expiring soon
    const soonExpiryDate = new Date()
    soonExpiryDate.setDate(soonExpiryDate.getDate() + 3)

    const { data: expiringSoon } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .lte('expiry_date', soonExpiryDate.toISOString().split('T')[0])

    // Calculate waste metrics
    const wasteValue =
      expiredBatches?.reduce((sum, batch) => {
        return sum + (batch.current_quantity ?? 0) * (batch.selling_price ?? 0)
      }, 0) || 0

    const wasteByCategory: Record<string, { count: number; value: number }> = {}
    expiredBatches?.forEach(batch => {
      const b = batch as BatchWithStoreProduct
      const category = b.store_products?.products?.category || 'unknown'
      if (!wasteByCategory[category]) {
        wasteByCategory[category] = { count: 0, value: 0 }
      }
      wasteByCategory[category].count += 1
      wasteByCategory[category].value += (batch.current_quantity ?? 0) * (batch.selling_price ?? 0)
    })

    return {
      expired_items: expiredBatches?.length || 0,
      expiring_soon: expiringSoon?.length || 0,
      waste_value: Math.round(wasteValue * 100) / 100,
      waste_by_category: wasteByCategory,
      prevention_potential:
        expiringSoon?.reduce((sum, batch) => {
          return sum + (batch.current_quantity ?? 0) * (batch.selling_price ?? 0)
        }, 0) || 0,
    }
  } catch (error) {
    console.error('Error in waste analytics:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getRevenueAnalytics(
  supabase: SupabaseClient<Database>,
  storeId: string,
  startDate: Date,
  endDate: Date,
) {
  try {
    // Get discount actions and their effectiveness (from analytics schema)
    const { data: discountActions } = await supabase
      .schema('analytics')
      .from('actions')
      .select('*')
      .eq('store_id', storeId)
      .in('action_type', ['discount_aggressive', 'discount_moderate'])
      .gte('executed_at', startDate.toISOString())
      .lte('executed_at', endDate.toISOString())

    // Calculate revenue metrics
    const totalOriginalValue =
      discountActions?.reduce((sum, action) => {
        return sum + (action.original_price ?? 0)
      }, 0) || 0

    const totalDiscountedValue =
      discountActions?.reduce((sum, action) => {
        return sum + (action.new_price ?? 0)
      }, 0) || 0

    const totalDiscountGiven = totalOriginalValue - totalDiscountedValue

    const revenueRecovered =
      discountActions?.reduce((sum, action) => {
        return sum + (action.revenue_recovered ?? action.new_price ?? 0)
      }, 0) || 0

    // Calculate savings vs waste
    const preventedWaste = discountActions?.filter(a => (a.revenue_recovered ?? 0) > 0).length || 0

    return {
      total_discounts_applied: discountActions?.length || 0,
      total_discount_value: Math.round(totalDiscountGiven * 100) / 100,
      revenue_recovered: Math.round(revenueRecovered * 100) / 100,
      waste_prevented: preventedWaste,
      recovery_rate:
        totalOriginalValue > 0 ? Math.round((revenueRecovered / totalOriginalValue) * 100) : 0,
      avg_discount_percent:
        discountActions && discountActions.length > 0
          ? Math.round(
              discountActions.reduce((sum, a) => sum + (a.discount_percent ?? 0), 0) /
                discountActions.length,
            )
          : 0,
    }
  } catch (error) {
    console.error('Error in revenue analytics:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getCategoryAnalytics(supabase: SupabaseClient<Database>, storeId: string) {
  try {
    // Get batch data by category (from inventory schema with joins)
    const { data: batches } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')

    // Get product scores separately to avoid cross-schema JOIN issues
    const { data: productScores } = await supabase
      .schema('scoring')
      .from('product_scores')
      .select('batch_id, composite_score, recommendation')
      .eq('store_id', storeId)

    // Define the type for category stats
    type CategoryStats = {
      total_items: number
      total_value: number
      high_urgency: number
      avg_score: number
      expiring_3days: number
      scores?: number[]
    }

    // Group by category
    const categoryStats: Record<string, CategoryStats> = {}

    batches?.forEach(batch => {
      const b = batch as BatchWithStoreProduct
      const category = b.store_products?.products?.category || 'unknown'

      if (!categoryStats[category]) {
        categoryStats[category] = {
          total_items: 0,
          total_value: 0,
          high_urgency: 0,
          avg_score: 0,
          expiring_3days: 0,
        }
      }

      const daysToExpiry = Math.floor(
        (new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )

      const scoreRecord = productScores?.find(ps => ps.batch_id === batch.batch_id)
      const score = scoreRecord?.composite_score || 0
      const value = (batch.current_quantity ?? 0) * (batch.selling_price ?? 0)

      categoryStats[category].total_items += 1
      categoryStats[category].total_value += value
      categoryStats[category].scores = categoryStats[category].scores || []
      categoryStats[category].scores.push(score)

      if (score >= 0.6) categoryStats[category].high_urgency += 1
      if (daysToExpiry <= 3) categoryStats[category].expiring_3days += 1
    })

    // Calculate averages
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category]
      const scoresArray = stats.scores ?? []
      stats.avg_score =
        scoresArray.length > 0
          ? Math.round(
              scoresArray.reduce((sum: number, s: number) => sum + s, 0) / scoresArray.length,
            ) / 100
          : 0
      stats.total_value = Math.round(stats.total_value * 100) / 100
      delete stats.scores // Remove raw scores from response
    })

    return categoryStats
  } catch (error) {
    console.error('Error in category analytics:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
