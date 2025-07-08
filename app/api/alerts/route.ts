import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo-ai-core/database/operations'

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
  const threshold = parseFloat(searchParams.get('threshold') || '0.6')
  const urgencyLevel = searchParams.get('urgency') // critical, high, medium, low
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

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

    // Get base alerts from operations
    const alerts = await operations.getStoreInventoryAlerts(storeId, threshold)

    // Enhance alerts with calculated fields
    const enhancedAlerts = alerts.map(alert => {
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
        sku: alert.products?.sku || 'Unknown',
        product_name: alert.products?.name || 'Unknown Product',
        category: alert.products?.category || 'Unknown',
        brand: alert.products?.brand || '',
        quantity: parseFloat(alert.current_quantity),
        unit_type: alert.products?.unit_type || 'pcs',
        days_to_expiry: daysToExpiry,
        expiry_date: alert.expiry_date,
        current_price: parseFloat(alert.selling_price),
        cost_price: parseFloat(alert.cost_price),
        margin_percent: Math.round(marginPercent * 100) / 100,
        composite_score: alert.product_scores?.[0]?.composite_score || 0,
        recommendation: alert.product_scores?.[0]?.recommendation || 'unknown',
        urgency_level: urgencyLevel,
        potential_loss: Math.round(potentialLoss * 100) / 100,
        location: alert.location_code || 'Unknown',
        supplier: alert.supplier || '',
        calculated_at: alert.product_scores?.[0]?.calculated_at || null,

        // Action suggestions based on urgency and score
        suggested_actions: generateActionSuggestions(
          daysToExpiry,
          alert.product_scores?.[0]?.composite_score || 0,
          marginPercent,
        ),

        // Priority score for sorting (combines urgency and value)
        priority_score: calculatePriorityScore(
          daysToExpiry,
          potentialLoss,
          alert.product_scores?.[0]?.composite_score || 0,
        ),
      }
    })

    // Apply filters
    let filteredAlerts = enhancedAlerts

    if (urgencyLevel) {
      filteredAlerts = filteredAlerts.filter(alert => alert.urgency_level === urgencyLevel)
    }

    if (category) {
      filteredAlerts = filteredAlerts.filter(alert =>
        alert.category.toLowerCase().includes(category.toLowerCase()),
      )
    }

    // Sort by priority score (highest first), then by days to expiry
    filteredAlerts.sort((a, b) => {
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
      critical_count: filteredAlerts.filter(a => a.urgency_level === 'critical').length,
      high_count: filteredAlerts.filter(a => a.urgency_level === 'high').length,
      medium_count: filteredAlerts.filter(a => a.urgency_level === 'medium').length,
      low_count: filteredAlerts.filter(a => a.urgency_level === 'low').length,
      total_potential_loss: filteredAlerts.reduce((sum, alert) => sum + alert.potential_loss, 0),
      categories_affected: [...new Set(filteredAlerts.map(a => a.category))].length,
      avg_days_to_expiry:
        filteredAlerts.length > 0
          ? Math.round(
              filteredAlerts.reduce((sum, a) => sum + a.days_to_expiry, 0) / filteredAlerts.length,
            )
          : 0,
      expired_items: filteredAlerts.filter(a => a.days_to_expiry < 0).length,
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
