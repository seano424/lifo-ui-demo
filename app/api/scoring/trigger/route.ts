// app/api/scoring/trigger/route.ts

import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, triggeredBy } = body

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const startTime = Date.now()

    // Call the new FastAPI background scoring endpoint
    // No need to write the data, the new endpoint does it for us
    // Just trigger the bulk scoring process

    const result = await fetch(
      `${process.env.FASTAPI_URL}/api/v1/scoring/batch/${storeId}/bulk`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: AbortSignal.timeout(30000), // Allow 30 seconds for background scoring
      }
    )

    if (!result.ok) {
      const errorText = await result.text()
      throw new Error(`FastAPI scoring failed: ${result.status} - ${errorText}`)
    }

    const scoringResult = await result.json()
    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Background scoring triggered successfully',
      result: scoringResult,
      metadata: {
        triggeredBy: triggeredBy || 'unknown',
        apiCallTime: processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to trigger scoring',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
