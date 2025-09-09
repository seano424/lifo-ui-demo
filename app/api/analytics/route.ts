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

    // ENHANCED: Try FastAPI dashboard endpoint for actionable batches
    // This now triggers scoring internally and returns individual batch recommendations
    const useFastAPI =
      process.env.ENABLE_FASTAPI === 'true' || process.env.NODE_ENV === 'development'
    console.log(
      `[ANALYTICS] FastAPI enabled: ${useFastAPI} (ENABLE_FASTAPI=${process.env.ENABLE_FASTAPI}, NODE_ENV=${process.env.NODE_ENV})`,
    )
    let fastApiDashboard = null

    if (useFastAPI) {
      try {
        console.log(`[ANALYTICS] Attempting enhanced FastAPI dashboard for store ${storeId}`)

        // Get user's session with access token
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          try {
            fastApiDashboard = await fastApiClient.getDashboardDataWithUserToken(
              storeId,
              session.access_token,
            )

            console.log(
              `[ANALYTICS] FastAPI dashboard user JWT success: Enhanced analytics with actionable batches`,
            )
            console.log(
              `[ANALYTICS] Actionable batches count: ${fastApiDashboard.actionable_batches?.length || 0}`,
            )
          } catch (userError) {
            console.warn(
              '[ANALYTICS] Dashboard user JWT failed, trying service key fallback:',
              userError,
            )

            // Fallback to service key if user JWT fails
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            if (serviceKey) {
              fastApiDashboard = await fastApiClient.getDashboardDataWithServiceKey(
                storeId,
                serviceKey,
              )
              console.log(`[ANALYTICS] FastAPI service key fallback success`)
              console.log(
                `[ANALYTICS] Actionable batches count: ${fastApiDashboard.actionable_batches?.length || 0}`,
              )
            }
          }

          if (fastApiDashboard) {
            analytics.source = 'fastapi'
            analytics.ai_enhanced = true

            // Include full FastAPI dashboard data with actionable batches
            analytics.dashboard = fastApiDashboard
            analytics.actionable_batches = fastApiDashboard.actionable_batches || []
            analytics.dashboard_summary = fastApiDashboard.summary || {}
            analytics.dashboard_alerts = fastApiDashboard.alerts || {}
          }
        } else {
          console.warn('[ANALYTICS] No user session, trying service key fallback')

          // Direct service key fallback if no user session
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceKey) {
            fastApiDashboard = await fastApiClient.getDashboardDataWithServiceKey(
              storeId,
              serviceKey,
            )

            console.log(`[ANALYTICS] FastAPI service key success`)
            console.log(
              `[ANALYTICS] Actionable batches count: ${fastApiDashboard.actionable_batches?.length || 0}`,
            )
            analytics.source = 'fastapi'
            analytics.ai_enhanced = true

            // Include full FastAPI dashboard data with actionable batches
            analytics.dashboard = fastApiDashboard
            analytics.actionable_batches = fastApiDashboard.actionable_batches || []
            analytics.dashboard_summary = fastApiDashboard.summary || {}
            analytics.dashboard_alerts = fastApiDashboard.alerts || {}
          }
        }
      } catch (fastApiError) {
        console.warn('[ANALYTICS] FastAPI dashboard failed, using Supabase fallback:', fastApiError)
        analytics.source = 'supabase'
        analytics.ai_enhanced = false

        // Add comprehensive Supabase insights as fallback
        await addSupabaseInsightsFallback(supabase, storeId, analytics)
      }
    } else {
      analytics.source = 'supabase'
      analytics.ai_enhanced = false

      // Add comprehensive Supabase insights when FastAPI is disabled
      await addSupabaseInsightsFallback(supabase, storeId, analytics)
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

// Helper function to add comprehensive Supabase insights as fallback
async function addSupabaseInsightsFallback(
  supabase: SupabaseClient<Database>,
  storeId: string,
  analytics: Record<string, unknown>,
) {
  try {
    console.log('[ANALYTICS] Adding Supabase insights fallback')

    // Since the RPC might not return the expected format, let's build the insights manually
    // from the data we can query directly - similar to what the existing analytics functions do

    // Get batches by different expiry windows to match FastAPI-style classification
    const today = new Date()

    // Critical: expiring today or tomorrow (0-1 days)
    const criticalDate = new Date(today)
    criticalDate.setDate(today.getDate() + 1)

    const { data: criticalBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id, expiry_date')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .lte('expiry_date', criticalDate.toISOString().split('T')[0])

    // High: expiring in 2-3 days
    const highDate = new Date(today)
    highDate.setDate(today.getDate() + 3)

    const { data: highBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id, expiry_date')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .gt('expiry_date', criticalDate.toISOString().split('T')[0])
      .lte('expiry_date', highDate.toISOString().split('T')[0])

    // Medium: expiring in 4-7 days
    const mediumDate = new Date(today)
    mediumDate.setDate(today.getDate() + 7)

    const { data: mediumBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id, expiry_date')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .gt('expiry_date', highDate.toISOString().split('T')[0])
      .lte('expiry_date', mediumDate.toISOString().split('T')[0])

    // Get all active batches for totals and calculate low priority
    const { data: allActiveBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id')
      .eq('store_id', storeId)
      .eq('status', 'active')

    // Calculate counts
    const criticalCount = criticalBatches?.length || 0
    const highCount = highBatches?.length || 0
    const mediumCount = mediumBatches?.length || 0
    const totalActiveBatches = allActiveBatches?.length || 0
    const lowCount = Math.max(0, totalActiveBatches - criticalCount - highCount - mediumCount) // Everything else

    // Calculate actionable items (critical + high + medium)
    const expiringSoonCount = criticalCount + highCount // Items expiring within 3 days
    const readyForDiscountCount = highCount + mediumCount // Items suitable for discount
    const perfectForDonationCount = Math.floor(mediumCount * 0.5) // ~50% of medium priority suitable for donation
    const totalActionableItems = criticalCount + highCount + mediumCount

    const actionRequiredPercentage =
      totalActiveBatches > 0 ? Math.round((totalActionableItems / totalActiveBatches) * 100) : 0

    const insights = {
      expiring_soon: {
        count: expiringSoonCount,
        description: `${expiringSoonCount} items expiring within 3 days`,
      },
      ready_for_discount: {
        count: readyForDiscountCount,
        description: `${readyForDiscountCount} items ready for discount pricing`,
      },
      perfect_for_donation: {
        count: perfectForDonationCount,
        description: `${perfectForDonationCount} items suitable for donation`,
      },
      high_urgency: {
        count: criticalCount,
        description: `${criticalCount} items requiring immediate attention`,
      },
      summary: {
        total_active_batches: totalActiveBatches,
        total_actionable_items: totalActionableItems,
        action_required_percentage: actionRequiredPercentage,
      },
    }

    // ENHANCED: Build actionable batches array from actual data
    const actionableBatches = []

    // Get detailed batch info with product names
    const { data: detailedBatches } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        batch_id,
        current_quantity,
        selling_price,
        expiry_date,
        location_code,
        store_products!inner (
          products (
            name
          )
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .lte('expiry_date', mediumDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
      .limit(20) // Top 20 most urgent

    if (detailedBatches) {
      for (const batch of detailedBatches) {
        const expiryDate = new Date(batch.expiry_date)
        const daysToExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        )

        let urgency: 'critical' | 'high' | 'medium' | 'low'
        let recommendation: string
        let discount_percent: number
        let reason: string

        if (daysToExpiry <= 1) {
          urgency = 'critical'
          recommendation = 'discount_aggressive'
          discount_percent = 40
          reason =
            daysToExpiry <= 0
              ? 'Item has expired - immediate removal required'
              : 'Critical: Expires today - apply 40% discount'
        } else if (daysToExpiry <= 3) {
          urgency = 'high'
          recommendation = 'discount_moderate'
          discount_percent = 25
          reason = `High priority: Expires in ${daysToExpiry} days - discount recommended`
        } else if (daysToExpiry <= 7) {
          urgency = 'medium'
          recommendation = 'discount_light'
          discount_percent = 15
          reason = `Medium priority: Expires in ${daysToExpiry} days - monitor closely`
        } else {
          urgency = 'low'
          recommendation = 'monitor'
          discount_percent = 0
          reason = 'Low priority - monitor for changes'
        }

        const productName = batch.store_products?.products?.name || 'Unknown Product'
        const potentialLoss = (batch.current_quantity || 0) * (batch.selling_price || 0)

        actionableBatches.push({
          batch_id: batch.batch_id,
          product_name: productName,
          expiry_date: batch.expiry_date,
          urgency,
          recommendation,
          discount_percent,
          reason,
          location_code: batch.location_code || '',
          current_quantity: batch.current_quantity || 0,
          potential_loss: Math.round(potentialLoss * 100) / 100,
          composite_score:
            urgency === 'critical'
              ? 0.9
              : urgency === 'high'
                ? 0.7
                : urgency === 'medium'
                  ? 0.5
                  : 0.3,
        })
      }
    }

    // Also add FastAPI-compatible urgency distribution for consistency
    const urgencyDistribution = {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    }

    // Add insights in the format expected by the frontend hooks
    analytics.insights = insights
    analytics.store_insights = {
      store_id: storeId,
      store_name: 'Store', // We don't have the name readily available
      insights: insights,
    }

    // Add FastAPI-compatible structure for components that expect it
    analytics.fastapi_analytics = {
      inventory_summary: {
        total_batches: totalActiveBatches,
        total_quantity: 0, // Not calculated in fallback
        total_value: 0, // Not calculated in fallback
        expired_count: 0, // Not calculated in fallback
        expiring_soon_count: expiringSoonCount,
      },
      urgency_distribution: urgencyDistribution,
      category_breakdown: [],
      recent_actions: [],
    }

    // CRITICAL: Add the actionable batches to the analytics response
    analytics.actionable_batches = actionableBatches

    console.log(
      `[ANALYTICS] Successfully added Supabase insights fallback with ${actionableBatches.length} actionable batches`,
    )

    // Skip RPC call - we're using our enhanced actionable batches implementation above
    // which provides better individual batch recommendations with discount percentages and reasons
    console.log('[ANALYTICS] Using enhanced actionable batches implementation instead of RPC')
  } catch (error) {
    console.error('[ANALYTICS] Error adding Supabase insights fallback:', error)
    // Don't throw - this is a fallback, we want to continue with other analytics
  }
}
