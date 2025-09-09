// app/api/scoring/trigger/route.ts
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId } = body

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    console.log(`[SCORING] Triggering background scoring for store: ${storeId}`)

    // Call the new FastAPI background scoring endpoint
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
      throw new Error(`FastAPI scoring failed: ${result.status}`)
    }

    const scoringResult = await result.json()

    console.log(`[SCORING] Background scoring completed:`, scoringResult)

    return NextResponse.json({
      success: true,
      message: 'Background scoring triggered successfully',
      result: scoringResult,
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
