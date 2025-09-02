// app/api/analytics/route.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreThreshold } from '@/lib/utils/scoring-thresholds'
import type { Database } from '@/types/supabase'

// Helper type for batch with store_products join
type BatchWithStoreProduct = Database['inventory']['Tables']['batches']['Row'] & {
  store_products?: {
    products?: { category?: string; name?: string; sku?: string }
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    if (!metric || metric === 'overview') {
      // Get comprehensive overview
      analytics.overview = await getOverviewAnalytics(
        supabase,
        storeId,
        startDate,
        endDate,
        threshold,
      )
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

async function getOverviewAnalytics(
  supabase: SupabaseClient<Database>,
  storeId: string,
  startDate: Date,
  endDate: Date,
  threshold: number = 0.7,
) {
  try {
    // Get batches first (same as alerts API)
    const { data: batches, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        'batch_id, batch_number, current_quantity, selling_price, cost_price, expiry_date, location_code, supplier, product_id',
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (batchError) {
      console.error('[getOverviewAnalytics] Error fetching batches:', batchError)
    }

    if (!batches || batches.length === 0) {
      return {
        totalProducts: 0,
        totalBatches: 0,
        activeAlerts: 0,
        totalValue: 0,
        expiringItems: 0,
        urgent_items: 0,
        actions_taken: 0,
        discount_actions: 0,
        total_discount_value: 0,
        avg_composite_score: 0,
      }
    }

    // Get batch IDs for scoring lookup
    const batchIds = batches.map(batch => batch.batch_id)

    // Get scoring data for these batches
    const { data: scoringData, error: scoringError } = await supabase
      .schema('scoring')
      .from('product_scores')
      .select('batch_id, composite_score, recommendation, calculated_at')
      .eq('store_id', storeId)
      .in('batch_id', batchIds)

    if (scoringError) {
      console.error('[getOverviewAnalytics] Error fetching scoring data:', scoringError)
    }

    // Get total store products count
    const { count: productCount, error: productError } = await supabase
      .schema('inventory')
      .from('store_products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (productError) {
      console.error('[getOverviewAnalytics] Error counting products:', productError)
    }

    // Create scoring map for quick lookup
    const scoringMap = new Map()
    scoringData?.forEach(score => {
      scoringMap.set(score.batch_id, score)
    })

    // Combine batch and scoring data (same logic as alerts API)
    const combinedData =
      batches?.map(batch => {
        const scoring = scoringMap.get(batch.batch_id)
        return {
          ...batch,
          composite_score: scoring?.composite_score || 0,
          recommendation: scoring?.recommendation,
          calculated_at: scoring?.calculated_at,
        }
      }) || []

    // Count urgent items above threshold (same logic as alerts API)
    const urgentItems = combinedData.filter(item => (item.composite_score || 0) >= threshold)

    // Calculate totals from combined data
    const totalBatches = combinedData.length
    const totalValue = combinedData.reduce((sum, item) => {
      return sum + (item.current_quantity || 0) * (item.selling_price || 0)
    }, 0)

    // Count expiring items (expiring within 3 days)
    const expiringItems = combinedData.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      return expiryDate <= threeDaysFromNow
    }).length

    // Get actions taken in timeframe (from analytics schema)
    const { data: actions } = await supabase
      .schema('analytics')
      .from('actions')
      .select('*')
      .eq('store_id', storeId)
      .gte('executed_at', startDate.toISOString())
      .lte('executed_at', endDate.toISOString())

    // Calculate discounts applied
    const discountActions =
      actions?.filter(
        a =>
          a.action_type &&
          (a.action_type.includes('discount') ||
            a.action_type === 'discount_aggressive' ||
            a.action_type === 'discount_moderate'),
      ) || []

    const totalDiscountValue = discountActions.reduce((sum, action) => {
      return sum + ((action.original_price ?? 0) - (action.new_price ?? 0))
    }, 0)

    return {
      totalProducts: productCount || 0,
      totalBatches,
      activeAlerts: urgentItems.length,
      totalValue: Math.round(totalValue * 100) / 100,
      expiringItems,
      urgent_items: urgentItems.length,
      actions_taken: actions?.length || 0,
      discount_actions: discountActions.length,
      total_discount_value: Math.round(totalDiscountValue * 100) / 100,
      avg_composite_score:
        totalBatches > 0
          ? Math.round(
              (combinedData.reduce((sum, item) => sum + (item.composite_score || 0), 0) /
                totalBatches) *
                100,
            ) / 100
          : 0,
    }
  } catch (error) {
    console.error('Error in overview analytics:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
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
      .select(`
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `)
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
      .select(`
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `)
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
      .select(`
        *,
        store_products!inner (
          products (
            category,
            name,
            sku
          )
        )
      `)
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
