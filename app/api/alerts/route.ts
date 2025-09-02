// app/api/alerts/route.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreThreshold } from '@/lib/utils/scoring-thresholds'
import { fastApiClient, mapFastAPIAlertToEnhanced } from '@/lib/services/fastapi-client'

interface ScoringData {
  batch_id: string
  composite_score: number
  recommendation: string
  calculated_at: string
  urgency_level?: string
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
  urgency_level?: string
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  // Allow override via URL parameter, otherwise use store settings
  const thresholdOverride = searchParams.get('threshold')
  const urgencyLevel = searchParams.get('urgency') // critical, high, medium, low
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

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
    console.log(`[ALERTS] ===== NEW ALERTS REQUEST =====`)
    console.log(`[ALERTS] Request parameters:`)
    console.log(`[ALERTS] - storeId: ${storeId}`)
    console.log(`[ALERTS] - threshold: ${threshold} (original: ${thresholdOverride})`)
    console.log(`[ALERTS] - urgencyLevel: ${urgencyLevel}`)
    console.log(`[ALERTS] - category: ${category}`)
    console.log(`[ALERTS] - limit: ${limit}`)
    console.log(`[ALERTS] - URL: ${request.url}`)
    
    // PHASE 1: Try FastAPI first with fallback to Supabase
    // Database connectivity has been fixed - re-enabling FastAPI
    const useFastAPI = process.env.ENABLE_FASTAPI === 'true' || process.env.NODE_ENV === 'development'
    console.log(`[ALERTS] FastAPI enabled: ${useFastAPI} (ENABLE_FASTAPI=${process.env.ENABLE_FASTAPI}, NODE_ENV=${process.env.NODE_ENV})`)
    
    if (useFastAPI) {
      try {
        console.log(`[ALERTS] Attempting FastAPI for store ${storeId}`)
        
        // Phase 2: Use user JWT token for FastAPI authentication
        // Get user's session with access token
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          // Phase 2 Step 4: Get both alerts and AI recommendations in parallel
          const [fastApiResponse, aiRecommendations] = await Promise.allSettled([
            fastApiClient.getStoreAlertsWithUserToken(
              storeId, 
              session.access_token,
              {
                threshold,
                urgency: urgencyLevel || undefined,
                category: category || undefined,
                limit
              }
            ),
            fastApiClient.getAIRecommendationsWithUserToken(
              storeId,
              session.access_token,
              {
                category: category || undefined,
                limit: 10 // Get top 10 AI recommendations
              }
            )
          ])

          // Handle alerts response
          if (fastApiResponse.status === 'rejected') {
            throw fastApiResponse.reason
          }
          
          console.log(`[ALERTS] FastAPI success: ${fastApiResponse.value.total_count} alerts`)
          console.log(`[ALERTS] Raw FastAPI response:`, JSON.stringify(fastApiResponse.value, null, 2))
          console.log(`[ALERTS] FastAPI alerts array:`, fastApiResponse.value.alerts)
          console.log(`[ALERTS] FastAPI alerts length:`, fastApiResponse.value.alerts?.length || 0)
          
          // Map FastAPI alerts to Next.js format for compatibility
          const enhancedAlerts = fastApiResponse.value.alerts.map(mapFastAPIAlertToEnhanced)
          console.log(`[ALERTS] Enhanced alerts after mapping:`, enhancedAlerts.length)
          console.log(`[ALERTS] First enhanced alert sample:`, enhancedAlerts[0] ? JSON.stringify(enhancedAlerts[0], null, 2) : 'No alerts')
          
          // Apply the same filtering logic as the original code
          let filteredAlerts = enhancedAlerts
          
          if (urgencyLevel) {
            console.log(`[ALERTS] Filtering by urgency level: ${urgencyLevel}`)
            filteredAlerts = filteredAlerts.filter(alert => alert.urgency_level === urgencyLevel)
            console.log(`[ALERTS] After urgency filter: ${filteredAlerts.length} alerts`)
          }
          
          if (category) {
            console.log(`[ALERTS] Filtering by category: ${category}`)
            filteredAlerts = filteredAlerts.filter(alert =>
              alert.category.toLowerCase().includes(category.toLowerCase())
            )
            console.log(`[ALERTS] After category filter: ${filteredAlerts.length} alerts`)
          }
          
          // Sort by priority score (same as original)
          filteredAlerts.sort((a, b) => {
            if (b.priority_score !== a.priority_score) {
              return b.priority_score - a.priority_score
            }
            return a.days_to_expiry - b.days_to_expiry
          })
          console.log(`[ALERTS] After sorting: ${filteredAlerts.length} alerts`)
          
          // Apply limit
          const beforeLimit = filteredAlerts.length
          filteredAlerts = filteredAlerts.slice(0, limit)
          console.log(`[ALERTS] After limit (${limit}): ${filteredAlerts.length} alerts (was ${beforeLimit})`)
          
          // Calculate summary statistics (same format as original)
          const summary = {
            total_alerts: filteredAlerts.length,
            critical_count: filteredAlerts.filter(a => a.urgency_level === 'critical').length,
            high_count: filteredAlerts.filter(a => a.urgency_level === 'high').length,
            medium_count: filteredAlerts.filter(a => a.urgency_level === 'medium').length,
            low_count: filteredAlerts.filter(a => a.urgency_level === 'low').length,
            total_potential_loss: filteredAlerts.reduce((sum, alert) => sum + alert.potential_loss, 0),
            categories_affected: [...new Set(filteredAlerts.map(a => a.category))].length,
            avg_days_to_expiry: filteredAlerts.length > 0
              ? Math.round(filteredAlerts.reduce((sum, a) => sum + a.days_to_expiry, 0) / filteredAlerts.length)
              : 0,
            expired_items: filteredAlerts.filter(a => a.days_to_expiry < 0).length,
          }

          // Handle AI recommendations (graceful degradation)
          const recommendations = aiRecommendations.status === 'fulfilled' 
            ? aiRecommendations.value.recommendations || []
            : []
          
          if (aiRecommendations.status === 'rejected') {
            console.warn('[ALERTS] AI recommendations failed:', aiRecommendations.reason)
          }
          
          const finalResponse = {
            alerts: filteredAlerts,
            summary,
            filters: {
              store_id: storeId,
              threshold,
              urgency_level: urgencyLevel,
              category,
              limit,
            },
            source: 'fastapi', // Indicate the source for debugging
            ai_insights: fastApiResponse.value.ai_insights || undefined,
            ai_recommendations: recommendations.length > 0 ? recommendations : undefined, // NEW: AI-powered recommendations
            ai_summary: recommendations.length > 0 ? {
              total_recommendations: recommendations.length,
              categories_recommended: [...new Set(recommendations.map((r: any) => r.category).filter(Boolean))].length,
              priority_actions: recommendations.filter((r: any) => r.priority === 'high').length,
            } : undefined
          }
          
          console.log(`[ALERTS] Final response being sent to frontend:`)
          console.log(`[ALERTS] - alerts.length: ${finalResponse.alerts.length}`)
          console.log(`[ALERTS] - summary.total_alerts: ${finalResponse.summary.total_alerts}`)
          console.log(`[ALERTS] - summary.critical_count: ${finalResponse.summary.critical_count}`)
          console.log(`[ALERTS] - summary.high_count: ${finalResponse.summary.high_count}`)
          console.log(`[ALERTS] - source: ${finalResponse.source}`)
          console.log(`[ALERTS] - ai_insights available: ${!!finalResponse.ai_insights}`)
          console.log(`[ALERTS] - ai_recommendations available: ${!!finalResponse.ai_recommendations}`)
          console.log(`[ALERTS] Complete final response:`, JSON.stringify(finalResponse, null, 2))
          
          return NextResponse.json(finalResponse)
        } else {
          console.warn('[ALERTS] No user session or access token available for FastAPI')
        }
      } catch (fastApiError) {
        console.warn('[ALERTS] FastAPI with user JWT failed, using Supabase fallback:', fastApiError)
        // Continue to Supabase fallback below
      }
    }
    
    // Original Supabase implementation (fallback)
    console.log(`[ALERTS] Using Supabase fallback for store ${storeId}`)
    console.log(`[ALERTS] Supabase fallback parameters:`)
    console.log(`[ALERTS] - storeId: ${storeId}`)
    console.log(`[ALERTS] - threshold: ${threshold}`)
    console.log(`[ALERTS] - urgencyLevel: ${urgencyLevel}`)
    console.log(`[ALERTS] - category: ${category}`)
    console.log(`[ALERTS] - limit: ${limit}`)
    
    const alerts = await getStoreAlerts(supabase, storeId, threshold)
    console.log(`[ALERTS] Raw Supabase alerts received: ${alerts.length} items`)
    console.log(`[ALERTS] First Supabase alert sample:`, alerts[0] ? JSON.stringify(alerts[0], null, 2) : 'No alerts')

    // Enhance alerts with calculated fields
    const enhancedAlerts = alerts.map((alert: AlertData) => {
      const daysToExpiry = Math.floor(
        (new Date(alert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
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

    const supabaseFinalResponse = {
      alerts: filteredAlerts,
      summary,
      filters: {
        store_id: storeId,
        threshold,
        urgency_level: urgencyLevel,
        category,
        limit,
      },
      source: 'supabase', // Indicate the source for debugging
    }
    
    console.log(`[ALERTS] Supabase fallback final response:`)
    console.log(`[ALERTS] - alerts.length: ${supabaseFinalResponse.alerts.length}`)
    console.log(`[ALERTS] - summary.total_alerts: ${supabaseFinalResponse.summary.total_alerts}`)
    console.log(`[ALERTS] - summary.critical_count: ${supabaseFinalResponse.summary.critical_count}`)
    console.log(`[ALERTS] - summary.high_count: ${supabaseFinalResponse.summary.high_count}`)
    console.log(`[ALERTS] - source: ${supabaseFinalResponse.source}`)
    console.log(`[ALERTS] Complete Supabase final response:`, JSON.stringify(supabaseFinalResponse, null, 2))
    
    return NextResponse.json(supabaseFinalResponse)
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
        product_id
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (error) throw error

    if (!batches || batches.length === 0) {
      return []
    }

    // Get batch IDs and product IDs for lookups
    const batchIds = batches.map(batch => batch.batch_id)
    const productIds = [...new Set(batches.map(batch => batch.product_id).filter(Boolean))]

    // Get scoring data separately from scoring schema
    const { data: scoringData, error: scoringError } = await supabase
      .schema('scoring')
      .from('product_scores')
      .select('batch_id, composite_score, recommendation, calculated_at, urgency_level')
      .eq('store_id', storeId)
      .in('batch_id', batchIds)

    // Get product data separately
    const { data: productData, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select('product_id, sku, name, brand, unit_type, category_id')
      .in('product_id', productIds)

    if (scoringError) {
      console.warn('[getStoreAlerts] Error fetching scoring data:', scoringError)
    }

    if (productError) {
      console.warn('[getStoreAlerts] Error fetching product data:', productError)
    }

    // Create maps for quick lookup
    const scoringMap = new Map()
    scoringData?.forEach((score: ScoringData) => {
      scoringMap.set(score.batch_id, score)
    })

    const productMap = new Map()
    productData?.forEach(
      (product: {
        product_id: string
        sku?: string
        name?: string
        brand?: string
        unit_type?: string
        category_id?: string
      }) => {
        productMap.set(product.product_id, product)
      },
    )

    // Filter by threshold and format data
    const alerts =
      batches
        ?.map(
          (batch: {
            batch_id: string
            batch_number: string
            current_quantity: number
            selling_price: number
            cost_price: number
            expiry_date: string
            location_code: string
            supplier: string
            product_id: string
          }) => {
            const scoring = scoringMap.get(batch.batch_id)
            const product = productMap.get(batch.product_id)
            return {
              batch_id: batch.batch_id,
              batch_number: batch.batch_number,
              current_quantity: batch.current_quantity,
              selling_price: batch.selling_price,
              cost_price: batch.cost_price,
              expiry_date: batch.expiry_date,
              location_code: batch.location_code,
              supplier: batch.supplier,
              sku: product?.sku || 'Unknown',
              product_name: product?.name || 'Unknown Product',
              category: product?.category_id || 'Unknown',
              brand: product?.brand || '',
              unit_type: product?.unit_type || 'pcs',
              composite_score: scoring?.composite_score || 0,
              recommendation: scoring?.recommendation,
              calculated_at: scoring?.calculated_at,
              urgency_level: scoring?.urgency_level,
            }
          },
        )
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
