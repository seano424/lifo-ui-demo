// app/api/webhooks/store-created-scoring/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook handler for setting up automated scoring when a store is created
 *
 * Triggered by: Supabase webhook on business.stores INSERT
 *
 * Payload format:
 * {
 *   "type": "INSERT",
 *   "table": "stores",
 *   "schema": "business",
 *   "record": { store_id: string, store_name: string, ... },
 *   "old_record": null
 * }
 */

const FASTAPI_BASE_URL =
  process.env.FASTAPI_URL || 'https://lifo-ai-api-staging-d5tjh.ondigitalocean.app'
const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

interface StoreCreatedPayload {
  type: 'INSERT'
  table: 'stores'
  schema: 'business'
  record: {
    store_id: string
    store_name: string
    timezone?: string
    [key: string]: unknown
  }
  old_record: null
}

interface ScoringScheduleRequest {
  store_id: string
  schedule_type: 'cron'
  cron_expression: string
  interval_hours: number
  force_recalculate: boolean
  timezone: string
  enabled: boolean
}

interface ScoringScheduleResponse {
  schedule_id?: string
  store_id: string
  schedule_type: string
  cron_expression: string
  enabled: boolean
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature
    const signature = request.headers.get('x-supabase-signature')

    if (!signature || !WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check FastAPI key is configured
    if (!FASTAPI_API_KEY) {
      console.error('FASTAPI_API_KEY not configured')
      return NextResponse.json({ error: 'FastAPI authentication not configured' }, { status: 500 })
    }

    // TODO: Implement signature verification
    // For now, we'll rely on Supabase's network security

    // 2. Parse webhook payload
    const payload: StoreCreatedPayload = await request.json()

    console.log('Received store creation webhook:', {
      store_id: payload.record.store_id,
      store_name: payload.record.store_name,
    })

    // 3. Validate payload structure
    if (payload.type !== 'INSERT' || payload.schema !== 'business' || payload.table !== 'stores') {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { store_id, timezone = 'UTC' } = payload.record

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id in payload' }, { status: 400 })
    }

    // 4. Prepare scoring schedule request
    const scheduleRequest: ScoringScheduleRequest = {
      store_id,
      schedule_type: 'cron',
      cron_expression: '0 */4 * * *', // Every 4 hours
      interval_hours: 4,
      force_recalculate: false,
      timezone,
      enabled: true,
    }

    // 5. Call FastAPI to set up scoring
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/automated-scoring/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FastAPI requires Bearer token authentication
        Authorization: `Bearer ${FASTAPI_API_KEY}`,
      },
      body: JSON.stringify(scheduleRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FastAPI scoring setup failed:', {
        status: response.status,
        error: errorText,
        store_id,
      })

      // Log failure but don't block - we can retry manually
      await logScoringSetupFailure(store_id, errorText)

      return NextResponse.json(
        {
          error: 'Failed to setup scoring',
          details: errorText,
          store_id,
        },
        { status: response.status },
      )
    }

    const result = await response.json()

    console.log('Scoring setup successful:', {
      store_id,
      schedule: result,
    })

    // 6. Log success
    await logScoringSetupSuccess(store_id, result)

    return NextResponse.json({
      success: true,
      store_id,
      schedule: result,
      message: 'Automated scoring enabled successfully',
    })
  } catch (error) {
    console.error('Error in store-created-scoring webhook:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Helper: Log scoring setup success
async function logScoringSetupSuccess(storeId: string, scheduleData: ScoringScheduleResponse) {
  try {
    const supabase = await createClient()

    await supabase.from('webhook_logs').insert({
      webhook_type: 'store_scoring_setup',
      store_id: storeId,
      status: 'success',
      payload: { schedule: scheduleData },
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to log scoring setup success:', error)
    // Don't throw - logging failure shouldn't break the webhook
  }
}

// Helper: Log scoring setup failure
async function logScoringSetupFailure(storeId: string, errorMessage: string) {
  try {
    const supabase = await createClient()

    await supabase.from('webhook_logs').insert({
      webhook_type: 'store_scoring_setup',
      store_id: storeId,
      status: 'failed',
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to log scoring setup failure:', error)
    // Don't throw - logging failure shouldn't break the webhook
  }
}
