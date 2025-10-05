// app/api/scoring/trigger/route.ts

import { type NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, triggeredBy } = body

    logger.log('scoring-trigger', 'Received scoring trigger request', { storeId, triggeredBy })

    if (!storeId) {
      logger.error('scoring-trigger', 'Missing store ID in request')
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const startTime = Date.now()

    // Call FastAPI scoring endpoint - it handles scoring AND database writes
    const fastapiUrl = process.env.FASTAPI_URL
    const fullUrl = `${fastapiUrl}/api/v1/scoring/batch/${storeId}/bulk`

    logger.log('scoring-trigger', 'Calling FastAPI endpoint', {
      url: fullUrl,
      fastapiUrl,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    const result = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(200000), // Allow 200 seconds for background scoring for now
    })

    logger.log('scoring-trigger', 'FastAPI response received', {
      status: result.status,
      ok: result.ok,
    })

    if (!result.ok) {
      const errorText = await result.text()
      logger.error('scoring-trigger', 'FastAPI scoring failed', {
        status: result.status,
        errorText,
      })
      throw new Error(`FastAPI scoring failed: ${result.status} - ${errorText}`)
    }

    const scoringResult = await result.json()
    const processingTime = Date.now() - startTime

    logger.log('scoring-trigger', 'Scoring completed successfully', {
      processingTime,
      batchesProcessed: scoringResult.processed || 0,
      highPriorityCount: scoringResult.high_priority_count || 0,
    })

    return NextResponse.json({
      success: true,
      message: 'Scoring triggered successfully',
      result: scoringResult,
      metadata: {
        triggeredBy: triggeredBy || 'unknown',
        apiCallTime: processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('scoring-trigger', 'Failed to trigger scoring', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Failed to trigger scoring',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
