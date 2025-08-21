import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lib/database/operations'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ScoringData {
  batch_id: string
  composite_score: number
  recommendation: string
  calculated_at: string
}

interface AlertData {
  batch_id: string
  batch_number: string
  current_quantity: number
  selling_price: number
  cost_price: number
  expiry_date: string
  location_code: string
  supplier: string
  sku?: string
  product_name?: string
  category?: string
  brand?: string
  unit_type?: string
  composite_score?: number
  recommendation?: string
  calculated_at?: string
}

interface EnhancedAlert {
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
  urgency_level: string
  potential_loss: number
  location: string
  supplier: string
  calculated_at: string | null
  suggested_actions: string[]
  priority_score: number
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  console.log('[/api/alerts] Request received:', {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.log('[/api/alerts] Authentication failed:', {
      error: error?.message,
      hasUser: !!user,
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  const threshold = parseFloat(searchParams.get('threshold') || '0.6')
  const urgencyLevel = searchParams.get('urgency') // critical, high, medium, low
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  console.log('[/api/alerts] Request parameters:', {
    userId: user.id,
    storeId,
    threshold,
    urgencyLevel,
    category,
    limit,
  })

  if (!storeId) {
    console.log('[/api/alerts] Missing storeId parameter')
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

  // Validate threshold
  if (threshold < 0 || threshold > 1) {
    console.log('[/api/alerts] Invalid threshold:', threshold)
    return NextResponse.json(
      {
        error: 'Threshold must be between 0 and 1',
      },
      { status: 400 },
    )
  }

  try {
    console.log('[/api/alerts] Initializing InventoryOperations...')
    const operations = new InventoryOperations(supabase)

    console.log('[/api/alerts] Checking store access...', {
      storeId,
      userId: user.id,
    })

    const hasAccess = await operations.validateStoreAccess(storeId, user.id)

    console.log('[/api/alerts] Store access validation result:', {
      hasAccess,
      storeId,
      userId: user.id,
    })

    if (!hasAccess) {
      console.log('[/api/alerts] Access denied - user does not have permission for store')
      return NextResponse.json(
        {
          error: 'No access to this store',
          details: {
            userId: user.id,
            storeId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 },
      )
    }

    // Get alerts using the existing scoring system
    const alerts = await getStoreAlerts(supabase, storeId, threshold)

    // Enhance alerts with calculated fields
    const enhancedAlerts = alerts.map((alert: AlertData) => {
      const daysToExpiry = Math.floor(
        (new Date(alert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )

      const urgencyLevel =
        daysToExpiry <= 0
          ? 'critical'
          : daysToExpiry <= 1
            ? 'high'
            : daysToExpiry <= 3
              ? 'medium'
              : 'low'

      const potentialLoss = alert.current_quantity * alert.selling_price
      const marginPercent = ((alert.selling_price - alert.cost_price) / alert.selling_price) * 100

      return {
        batch_id: alert.batch_id,
        batch_number: alert.batch_number,
        sku: alert.sku || 'Unknown',
        product_name: alert.product_name || 'Unknown Product',
        category: alert.category || 'Unknown',
        brand: alert.brand || '',
        quantity: parseFloat(alert.current_quantity.toString()),
        unit_type: alert.unit_type || 'pcs',
        days_to_expiry: daysToExpiry,
        expiry_date: alert.expiry_date,
        current_price: parseFloat(alert.selling_price.toString()),
        cost_price: parseFloat(alert.cost_price.toString()),
        margin_percent: Math.round(marginPercent * 100) / 100,
        composite_score: alert.composite_score || 0,
        recommendation: alert.recommendation || 'unknown',
        urgency_level: urgencyLevel,
        potential_loss: Math.round(potentialLoss * 100) / 100,
        location: alert.location_code || 'Unknown',
        supplier: alert.supplier || '',
        calculated_at: alert.calculated_at || null,

        // Action suggestions based on urgency and score
        suggested_actions: generateActionSuggestions(
          daysToExpiry,
          alert.composite_score || 0,
          marginPercent,
        ),

        // Priority score for sorting (combines urgency and value)
        priority_score: calculatePriorityScore(
          daysToExpiry,
          potentialLoss,
          alert.composite_score || 0,
        ),
      }
    })

    // Apply filters
    let filteredAlerts = enhancedAlerts

    if (urgencyLevel) {
      filteredAlerts = filteredAlerts.filter(
        (alert: EnhancedAlert) => alert.urgency_level === urgencyLevel,
      )
    }

    if (category) {
      filteredAlerts = filteredAlerts.filter((alert: EnhancedAlert) =>
        alert.category.toLowerCase().includes(category.toLowerCase()),
      )
    }

    // Sort by priority score (highest first), then by days to expiry
    filteredAlerts.sort((a: EnhancedAlert, b: EnhancedAlert) => {
      if (b.priority_score !== a.priority_score) {
        return b.priority_score - a.priority_score
      }
      return a.days_to_expiry - b.days_to_expiry
    })

    // Apply limit
    filteredAlerts = filteredAlerts.slice(0, limit)

    // Calculate summary statistics
    const summary = {
      total_alerts: filteredAlerts.length,
      critical_count: filteredAlerts.filter((a: EnhancedAlert) => a.urgency_level === 'critical')
        .length,
      high_count: filteredAlerts.filter((a: EnhancedAlert) => a.urgency_level === 'high').length,
      medium_count: filteredAlerts.filter((a: EnhancedAlert) => a.urgency_level === 'medium')
        .length,
      low_count: filteredAlerts.filter((a: EnhancedAlert) => a.urgency_level === 'low').length,
      total_potential_loss: filteredAlerts.reduce(
        (sum: number, alert: EnhancedAlert) => sum + alert.potential_loss,
        0,
      ),
      categories_affected: [...new Set(filteredAlerts.map((a: EnhancedAlert) => a.category))]
        .length,
      avg_days_to_expiry:
        filteredAlerts.length > 0
          ? Math.round(
              filteredAlerts.reduce((sum: number, a: EnhancedAlert) => sum + a.days_to_expiry, 0) /
                filteredAlerts.length,
            )
          : 0,
      expired_items: filteredAlerts.filter((a: EnhancedAlert) => a.days_to_expiry < 0).length,
    }

    return NextResponse.json({
      alerts: filteredAlerts,
      summary,
      filters: {
        store_id: storeId,
        threshold,
        urgency_level: urgencyLevel,
        category,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Helper function to get alerts from database with scoring
async function getStoreAlerts(supabase: SupabaseClient, storeId: string, threshold: number) {
  try {
    // Get batches with scoring data using the existing structure
    const { data: batches, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        batch_id,
        batch_number,
        current_quantity,
        selling_price,
        cost_price,
        expiry_date,
        location_code,
        supplier,
        products:product_id (
          sku,
          name,
          category,
          brand,
          unit_type
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (error) throw error

    if (!batches || batches.length === 0) {
      console.log('[getStoreAlerts] No batches found for store:', storeId)
      return []
    }

    // Get batch IDs for scoring lookup
    const batchIds = batches.map(batch => batch.batch_id)

    // Get scoring data separately from scoring schema
    const { data: scoringData, error: scoringError } = await supabase
      .schema('scoring')
      .from('product_scores')
      .select('batch_id, composite_score, recommendation, calculated_at')
      .eq('store_id', storeId)
      .in('batch_id', batchIds)

    if (scoringError) {
      console.warn('[getStoreAlerts] Error fetching scoring data:', scoringError)
    }

    // Create a map of batch_id to scoring data for quick lookup
    const scoringMap = new Map()
    scoringData?.forEach((score: ScoringData) => {
      scoringMap.set(score.batch_id, score)
    })

    // Filter by threshold and format data
    const alerts =
      batches
        ?.map(batch => {
          const scoring = scoringMap.get(batch.batch_id)
          return {
            batch_id: batch.batch_id,
            batch_number: batch.batch_number,
            current_quantity: batch.current_quantity,
            selling_price: batch.selling_price,
            cost_price: batch.cost_price,
            expiry_date: batch.expiry_date,
            location_code: batch.location_code,
            supplier: batch.supplier,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sku: (batch as any).products?.sku,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            product_name: (batch as any).products?.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            category: (batch as any).products?.category,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            brand: (batch as any).products?.brand,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            unit_type: (batch as any).products?.unit_type,
            composite_score: scoring?.composite_score || 0,
            recommendation: scoring?.recommendation,
            calculated_at: scoring?.calculated_at,
          }
        })
        .filter((alert: AlertData) => (alert.composite_score || 0) >= threshold) || []

    return alerts
  } catch (error) {
    console.error('Error fetching store alerts:', error)
    return []
  }
}

function generateActionSuggestions(
  daysToExpiry: number,
  compositeScore: number,
  marginPercent: number,
): string[] {
  const suggestions = []

  if (daysToExpiry <= 0) {
    suggestions.push('URGENT: Remove expired product immediately')
    suggestions.push('Check for similar batches nearing expiry')
    return suggestions
  }

  if (daysToExpiry <= 1) {
    if (marginPercent > 30) {
      suggestions.push('Apply 40-60% discount immediately')
    } else if (marginPercent > 15) {
      suggestions.push('Apply 20-30% discount')
    } else {
      suggestions.push('Consider staff purchase or donation')
    }
    suggestions.push('Move to prominent display location')
    suggestions.push('Bundle with popular items')
  } else if (daysToExpiry <= 3) {
    if (compositeScore >= 0.8) {
      suggestions.push('Apply 25-40% discount')
      suggestions.push('Promote in-store or online')
    } else if (compositeScore >= 0.6) {
      suggestions.push('Apply 15-25% discount')
      suggestions.push('Monitor closely for next 24 hours')
    }
    suggestions.push('Consider customer pre-orders')
  } else if (daysToExpiry <= 7) {
    if (compositeScore >= 0.7) {
      suggestions.push('Apply 10-20% discount')
      suggestions.push('Feature in promotional materials')
    }
    suggestions.push('Monitor daily and adjust pricing')
  }

  // Category-specific suggestions
  if (compositeScore >= 0.6) {
    suggestions.push('Check similar products for bundling opportunities')
    suggestions.push('Notify customers via app/email if available')
  }

  return suggestions
}

function calculatePriorityScore(
  daysToExpiry: number,
  potentialLoss: number,
  compositeScore: number,
): number {
  // Higher score = higher priority
  let score = 0

  // Urgency component (0-50 points)
  if (daysToExpiry <= 0) score += 50
  else if (daysToExpiry <= 1) score += 40
  else if (daysToExpiry <= 3) score += 30
  else if (daysToExpiry <= 7) score += 20
  else score += Math.max(0, 15 - daysToExpiry)

  // Value component (0-30 points)
  const valueScore = Math.min(30, potentialLoss / 10) // €1 = 0.1 points, max 30 points
  score += valueScore

  // Composite score component (0-20 points)
  score += compositeScore * 20

  return Math.round(score * 100) / 100
}
