// app/api/scoring/trigger/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, triggeredBy, debug } = body

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const startTime = Date.now()
    console.log(`[SCORING] 🎯 Triggering background scoring for store: ${storeId}`)
    console.log(`[SCORING] 📋 Triggered by: ${triggeredBy || 'unknown'}`)
    console.log(`[SCORING] 🔍 Debug mode: ${debug ? 'enabled' : 'disabled'}`)

    // Call the new FastAPI background scoring endpoint
    console.log(`[SCORING] 📡 Calling FastAPI endpoint: ${process.env.FASTAPI_URL}/api/v1/analytics/scoring/trigger/${storeId}`)
    
    const result = await fetch(
      `${process.env.FASTAPI_URL}/api/v1/analytics/scoring/trigger/${storeId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: AbortSignal.timeout(30000), // Allow 30 seconds for background scoring
      },
    )

    if (!result.ok) {
      const errorText = await result.text()
      console.error(`[SCORING] ❌ FastAPI scoring failed: ${result.status} - ${errorText}`)
      throw new Error(`FastAPI scoring failed: ${result.status} - ${errorText}`)
    }

    const scoringResult = await result.json()
    const processingTime = Date.now() - startTime

    console.log(`[SCORING] ✅ Background scoring completed:`, scoringResult)
    console.log(`[SCORING] ⏱️ Total API call time: ${processingTime}ms`)
    
    // 🔍 Debug: Log the detailed structure of what Python returns
    console.log(`[SCORING] 📊 Detailed Python response structure:`)
    console.log(`[SCORING] 📊 Keys:`, Object.keys(scoringResult))
    if (scoringResult.results && Array.isArray(scoringResult.results)) {
      console.log(`[SCORING] 📊 Results array length:`, scoringResult.results.length)
      if (scoringResult.results.length > 0) {
        console.log(`[SCORING] 📊 First result sample:`, JSON.stringify(scoringResult.results[0], null, 2))
      }
    }

    // 💾 WRITE TO SUPABASE: Save the scoring results from Python
    if (scoringResult.results && Array.isArray(scoringResult.results) && scoringResult.results.length > 0) {
      console.log(`[SCORING] 💾 Writing ${scoringResult.results.length} results to Supabase...`)
      
      try {
        // Initialize Supabase client with service role
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        // Prepare data for upsert
        const upsertData = scoringResult.results.map((result: any) => ({
          batch_id: result.batch_id,
          store_id: result.store_id,
          expiry_score: parseFloat(result.expiry_score),
          velocity_score: parseFloat(result.velocity_score),
          margin_score: parseFloat(result.margin_score),
          composite_score: parseFloat(result.composite_score),
          recommendation: result.recommendation,
          urgency_level: result.urgency_level,
          discount_percent: parseInt(result.discount_percent),
          reason: result.reason,
          ml_enhanced: Boolean(result.ml_enhanced),
          confidence_level: parseFloat(result.confidence_level),
          calculated_at: result.calculated_at || new Date().toISOString()
        }))

        console.log(`[SCORING] 💾 Upserting data sample:`, JSON.stringify(upsertData[0], null, 2))

        // Perform bulk upsert
        const { data, error } = await supabase
          .schema('scoring')
          .from('product_scores')
          .upsert(upsertData, { 
            onConflict: 'batch_id',
            ignoreDuplicates: false 
          })

        if (error) {
          console.error(`[SCORING] ❌ Supabase upsert failed:`, error)
          throw new Error(`Supabase upsert failed: ${error.message}`)
        }

        console.log(`[SCORING] ✅ Successfully wrote ${upsertData.length} scoring results to Supabase`)
        console.log(`[SCORING] 💾 Supabase response:`, data)

      } catch (supabaseError) {
        console.error(`[SCORING] ❌ Failed to write to Supabase:`, supabaseError)
        // Don't fail the entire operation, just log the error
      }
    } else {
      console.log(`[SCORING] ⚠️ No results to write to Supabase`)
    }

    return NextResponse.json({
      success: true,
      message: 'Background scoring triggered successfully',
      result: scoringResult,
      metadata: {
        triggeredBy: triggeredBy || 'unknown',
        apiCallTime: processingTime,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[SCORING] Failed to trigger background scoring:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger scoring',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
