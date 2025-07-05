import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo-ai-core/database/operations'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { storeId, batchIds } = body

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id, 'staff')

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'No access to this store',
        },
        { status: 403 },
      )
    }

    // For MVP, we'll implement a TypeScript version of the scoring algorithm
    // In production, this would call the Python scoring service
    const scoringResult = await calculateScoresTypeScript(storeId, batchIds)

    return NextResponse.json({
      success: true,
      ...scoringResult,
      recalculated_at: new Date().toISOString(),
      store_id: storeId,
    })
  } catch (error) {
    console.error('Error recalculating scores:', error)
    return NextResponse.json(
      {
        error: 'Failed to recalculate scores',
        details: error.message,
      },
      { status: 500 },
    )
  }
}

async function calculateScoresTypeScript(storeId: string, batchIds?: string[]) {
  const supabase = createClient()

  try {
    // Get active batches with product info
    let query = supabase
      .from('batches')
      .select(
        `
        *,
        products(*)
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')

    if (batchIds && batchIds.length > 0) {
      query = query.in('batch_id', batchIds)
    }

    const { data: batches, error } = await query

    if (error) throw error

    const processed = []
    const errors = []

    for (const batch of batches || []) {
      try {
        // Calculate days to expiry
        const expiryDate = new Date(batch.expiry_date)
        const daysToExpiry = Math.floor(
          (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        )

        // Get category weights
        const { data: categoryWeights } = await supabase
          .from('category_weights')
          .select('*')
          .eq('category', batch.products.category)
          .single()

        const weights = categoryWeights
          ? {
              expiry: parseFloat(categoryWeights.spoilage_risk_weight),
              velocity: parseFloat(categoryWeights.turnover_speed_weight),
              margin: parseFloat(categoryWeights.value_impact_weight),
            }
          : { expiry: 0.5, velocity: 0.3, margin: 0.2 }

        // Calculate individual scores
        const expiryScore = calculateExpiryScore(
          daysToExpiry,
          batch.products.typical_shelf_life_days,
        )
        const velocityScore = calculateVelocityScore(batch.current_quantity, 2.0, daysToExpiry) // Default velocity
        const marginScore = calculateMarginScore(batch.selling_price, batch.cost_price)

        const compositeScore =
          expiryScore * weights.expiry +
          velocityScore * weights.velocity +
          marginScore * weights.margin

        // Generate recommendation
        const recommendation = generateRecommendation(compositeScore, daysToExpiry)

        // Store scores (upsert)
        const { error: upsertError } = await supabase.from('product_scores').upsert(
          {
            batch_id: batch.batch_id,
            store_id: storeId,
            expiry_score: Math.round(expiryScore * 100) / 100,
            velocity_score: Math.round(velocityScore * 100) / 100,
            margin_score: Math.round(marginScore * 100) / 100,
            composite_score: Math.round(compositeScore * 100) / 100,
            recommendation: recommendation.action,
            confidence_level: 0.8,
            calculated_at: new Date().toISOString(),
          },
          {
            onConflict: 'batch_id',
          },
        )

        if (upsertError) {
          errors.push(`Batch ${batch.batch_id}: ${upsertError.message}`)
        } else {
          processed.push({
            batch_id: batch.batch_id,
            sku: batch.products.sku,
            composite_score: Math.round(compositeScore * 100) / 100,
            recommendation: recommendation.action,
            days_to_expiry: daysToExpiry,
          })
        }
      } catch (error) {
        errors.push(`Batch ${batch.batch_id}: ${error.message}`)
      }
    }

    return {
      processed: processed.length,
      errors,
      batch_scores: processed.slice(0, 10), // Return first 10 for preview
      summary: {
        total_batches: batches?.length || 0,
        high_urgency: processed.filter(p => p.composite_score >= 0.8).length,
        medium_urgency: processed.filter(p => p.composite_score >= 0.6 && p.composite_score < 0.8)
          .length,
        low_urgency: processed.filter(p => p.composite_score < 0.6).length,
      },
    }
  } catch (error) {
    return {
      processed: 0,
      errors: [error.message],
    }
  }
}

function calculateExpiryScore(daysToExpiry: number, shelfLifeDays: number): number {
  if (daysToExpiry <= 0) return 1.0
  if (daysToExpiry <= 1) return 0.95
  if (daysToExpiry <= 3) return 0.8
  if (daysToExpiry <= 7) return 0.6

  if (shelfLifeDays > 0) {
    const ratio = daysToExpiry / shelfLifeDays
    if (ratio <= 0.1) return 0.7
    if (ratio <= 0.2) return 0.4
  }

  return 0.1
}

function calculateVelocityScore(
  currentQuantity: number,
  avgDailySales: number,
  daysToExpiry: number,
): number {
  if (avgDailySales <= 0) return 1.0

  const daysToSellout = currentQuantity / avgDailySales

  if (daysToSellout <= daysToExpiry * 0.5) return 0.1
  if (daysToSellout <= daysToExpiry * 0.8) return 0.4
  if (daysToSellout <= daysToExpiry) return 0.7
  return 1.0
}

function calculateMarginScore(sellingPrice: number, costPrice: number): number {
  if (sellingPrice <= 0 || costPrice <= 0) return 0.5

  const marginPercent = ((sellingPrice - costPrice) / sellingPrice) * 100

  if (marginPercent < 10) return 1.0
  if (marginPercent < 20) return 0.7
  if (marginPercent < 40) return 0.4
  return 0.1
}

function generateRecommendation(compositeScore: number, daysToExpiry: number) {
  if (daysToExpiry <= 0) {
    return { action: 'remove', urgency: 'critical' }
  }

  if (compositeScore >= 0.8) {
    return { action: 'discount_aggressive', urgency: 'high' }
  } else if (compositeScore >= 0.6) {
    return { action: 'discount_moderate', urgency: 'medium' }
  } else if (compositeScore >= 0.4) {
    return { action: 'alert', urgency: 'low' }
  } else {
    return { action: 'maintain', urgency: 'none' }
  }
}
