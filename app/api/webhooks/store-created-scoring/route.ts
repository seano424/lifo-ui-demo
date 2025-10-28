// app/api/webhooks/store-created-scoring/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import crypto from 'node:crypto'

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

// Zod schema for runtime payload validation
const StoreCreatedPayloadSchema = z.object({
  type: z.literal('INSERT'),
  table: z.literal('stores'),
  schema: z.literal('business'),
  record: z.object({
    store_id: z.string().uuid(),
    store_name: z.string(),
    timezone: z.string().optional(),
  }),
  old_record: z.null(),
})

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

// Zod schema for API response validation
const ScoringScheduleResponseSchema = z.object({
  schedule_id: z.string().optional(),
  store_id: z.string().uuid(),
  schedule_type: z.string(),
  cron_expression: z.string(),
  enabled: z.boolean(),
})

interface ScoringScheduleResponse {
  schedule_id?: string
  store_id: string
  schedule_type: string
  cron_expression: string
  enabled: boolean
  [key: string]: unknown
}

/**
 * Verify webhook signature using HMAC-SHA256
 * This prevents unauthorized actors from triggering the webhook
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  const expectedSignature = hmac.digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    )
  } catch {
    // If signatures are different lengths, timingSafeEqual throws
    return false
  }
}

export async function POST(request: NextRequest) {
  let storeId: string | undefined

  try {
    // 1. Verify webhook signature
    const signature = request.headers.get('x-supabase-signature')

    if (!signature || !WEBHOOK_SECRET) {
      logger.error('webhook:store-scoring', 'Missing webhook signature or secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check FastAPI key is configured
    if (!FASTAPI_API_KEY) {
      logger.error('webhook:store-scoring', 'FASTAPI_API_KEY not configured')
      return NextResponse.json({ error: 'FastAPI authentication not configured' }, { status: 500 })
    }

    // Get raw request body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature using HMAC
    const isValidSignature = verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)

    if (!isValidSignature) {
      logger.error('webhook:store-scoring', 'Invalid webhook signature')
      return NextResponse.json({ error: 'Unauthorized - Invalid signature' }, { status: 401 })
    }

    // 2. Parse and validate webhook payload
    let payload: StoreCreatedPayload
    try {
      const parsedBody = JSON.parse(rawBody)
      const validationResult = StoreCreatedPayloadSchema.safeParse(parsedBody)

      if (!validationResult.success) {
        logger.error('webhook:store-scoring', 'Invalid webhook payload structure', {
          errors: validationResult.error.errors,
        })
        return NextResponse.json(
          {
            error: 'Invalid webhook payload',
            details: validationResult.error.errors,
          },
          { status: 400 },
        )
      }

      payload = parsedBody
    } catch (parseError) {
      logger.error('webhook:store-scoring', 'Failed to parse webhook payload', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      })
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    storeId = payload.record.store_id
    const { timezone = 'UTC' } = payload.record

    logger.log('webhook:store-scoring', 'Received store creation webhook', {
      store_id: storeId,
      store_name: payload.record.store_name,
      timezone,
    })

    // 3. Prepare scoring schedule request
    const scheduleRequest: ScoringScheduleRequest = {
      store_id: storeId,
      schedule_type: 'cron',
      cron_expression: '0 */4 * * *', // Every 4 hours
      interval_hours: 4,
      force_recalculate: false,
      timezone,
      enabled: true,
    }

    // 4. Call FastAPI to set up scoring with timeout
    logger.log('webhook:store-scoring', 'Calling FastAPI to setup scoring schedule', {
      store_id: storeId,
      url: `${FASTAPI_BASE_URL}/api/v1/automated-scoring/schedules`,
    })

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/automated-scoring/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This endpoint uses FASTAPI_API_KEY (not SUPABASE_SERVICE_ROLE_KEY)
        // because it's calling the FastAPI backend which has its own authentication
        // Other endpoints in this app may use the Supabase service role key
        Authorization: `Bearer ${FASTAPI_API_KEY}`,
      },
      body: JSON.stringify(scheduleRequest),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('webhook:store-scoring', 'FastAPI scoring setup failed', {
        status: response.status,
        error: errorText,
        store_id: storeId,
      })

      // Log failure but don't block - we can retry manually
      await logScoringSetupFailure(storeId, errorText)

      return NextResponse.json(
        {
          error: 'Failed to setup scoring',
          details: errorText,
          store_id: storeId,
        },
        { status: response.status },
      )
    }

    // 5. Parse and validate API response
    const rawResult = await response.json()
    const validationResult = ScoringScheduleResponseSchema.safeParse(rawResult)

    if (!validationResult.success) {
      logger.error('webhook:store-scoring', 'Invalid API response format', {
        errors: validationResult.error.errors,
        rawResult,
      })
      // Still log success since the API call worked, just warn about response format
      await logScoringSetupSuccess(storeId, rawResult)
    } else {
      logger.log('webhook:store-scoring', 'Scoring setup successful', {
        store_id: storeId,
        schedule: validationResult.data,
      })
      // 6. Log success
      await logScoringSetupSuccess(storeId, validationResult.data)
    }

    return NextResponse.json({
      success: true,
      store_id: storeId,
      schedule: rawResult,
      message: 'Automated scoring enabled successfully',
    })
  } catch (error) {
    logger.error('webhook:store-scoring', 'Error in store-created-scoring webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      store_id: storeId,
    })

    // Attempt to log the error if we have a store_id
    if (storeId) {
      await logScoringSetupFailure(
        storeId,
        error instanceof Error ? error.message : 'Unknown error',
      ).catch(logError => {
        logger.error('webhook:store-scoring', 'Failed to log error to database', {
          error: logError instanceof Error ? logError.message : 'Unknown error',
        })
      })
    }

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
    // Use admin client for webhook operations (no user context)
    const supabase = createAdminClient()

    const { error } = await supabase.from('webhook_logs').insert({
      webhook_type: 'store_scoring_setup',
      store_id: storeId,
      status: 'success',
      payload: { schedule: scheduleData },
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('webhook:store-scoring', 'Failed to insert success log to database', {
        error: error.message,
        store_id: storeId,
      })
    }
  } catch (error) {
    logger.error('webhook:store-scoring', 'Failed to log scoring setup success', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - logging failure shouldn't break the webhook
  }
}

// Helper: Log scoring setup failure
async function logScoringSetupFailure(storeId: string, errorMessage: string) {
  try {
    // Use admin client for webhook operations (no user context)
    const supabase = createAdminClient()

    const { error } = await supabase.from('webhook_logs').insert({
      webhook_type: 'store_scoring_setup',
      store_id: storeId,
      status: 'failed',
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.error('webhook:store-scoring', 'Failed to insert failure log to database', {
        error: error.message,
        store_id: storeId,
      })
    }
  } catch (error) {
    logger.error('webhook:store-scoring', 'Failed to log scoring setup failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - logging failure shouldn't break the webhook
  }
}
