import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo_ai_core/database/operations'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Helper type for joined batch with optional products and product_scores
type BatchWithJoins = Database['inventory']['Tables']['batches']['Row'] & {
  products?: { category?: string; name?: string; sku?: string }
  product_scores?: { composite_score?: number; recommendation?: string }[]
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

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

  try {
    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id)

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'No access to this store',
        },
        { status: 403 },
      )
    }

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
      analytics.overview = await getOverviewAnalytics(supabase, storeId, startDate, endDate)
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
) {
  try {
    // Get current store stats
    const operations = new InventoryOperations(supabase)
    const storeStats = await operations.getStoreStats(storeId)

    // Get actions taken in timeframe (from analytics schema)
    const { data: actions } = await supabase
      .schema('analytics')
      .from('actions')
      .select('*')
      .eq('store_id', storeId)
      .gte('executed_at', startDate.toISOString())
      .lte('executed_at', endDate.toISOString())

    // Get high urgency batches (from scoring schema with joins to inventory)
    let urgentBatchesResult = null
    // The get_urgent_batches RPC is not available in the types, so we use the fallback query only
    const { data: fallbackUrgent } = await supabase
      .schema('scoring')
      .from('product_scores')
      .select('*')
      .eq('store_id', storeId)
      .gte('composite_score', 0.6)
    urgentBatchesResult = fallbackUrgent

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
      ...storeStats,
      urgent_items: urgentBatchesResult?.length || 0,
      actions_taken: actions?.length || 0,
      discount_actions: discountActions.length,
      total_discount_value: Math.round(totalDiscountValue * 100) / 100,
      avg_composite_score:
        urgentBatchesResult && urgentBatchesResult.length > 0
          ? urgentBatchesResult.reduce((sum, b) => sum + (b.composite_score ?? 0), 0) /
            urgentBatchesResult.length
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
      .select('*')
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
      .select('*')
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
      const b = batch as BatchWithJoins
      const category = b.products?.category || 'unknown'
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
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')

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
      const b = batch as BatchWithJoins
      const category = b.products?.category || 'unknown'

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
        (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )

      const score = b.product_scores?.[0]?.composite_score || 0
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
