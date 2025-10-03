import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type StoreInsights = {
  store_id: string
  store_name: string
  insights: {
    expiring_soon: {
      count: number
      description: string
    }
    ready_for_discount: {
      count: number
      description: string
    }
    perfect_for_donation: {
      count: number
      description: string
    }
    high_urgency: {
      count: number
      description: string
    }
    summary: {
      total_active_batches: number
      total_actionable_items: number
      action_required_percentage: number
    }
  }
}

export type ActionableBatch = {
  batch_id: string
  product_name: string
  category: string
  expiry_date: string
  current_quantity: number
  selling_price: number
  days_until_expiry: number
  urgency_level: 'urgent' | 'discount' | 'watch' | 'normal'
  recommended_action: 'discount_20_percent' | 'donate' | 'urgent_action' | 'monitor'
  ai_score: number | null
  ai_recommended_action: string | null
}

export type ActionableBatchesResponse = {
  store_id: string
  actionable_batches: ActionableBatch[]
  summary: {
    total_actionable_batches: number
    urgent_count: number
    discount_count: number
    donation_count: number
  }
}

// Get high-level store insights
export async function fetchStoreInsights(
  storeId: string,
  serverClient?: ServerClient,
): Promise<StoreInsights> {
  return withPerformanceTracking(
    'lib/queries/store-insights',
    'fetchStoreInsights',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('get_store_insights', {
        target_store_id: storeId,
      })

      if (error) {
        logger.error('lib/queries/store-insights', 'Error fetching store insights', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch store insights: ${error.message}`)
      }

      logger.log('lib/queries/store-insights', 'Successfully fetched store insights', { storeId })
      return data as StoreInsights
    },
  )
}

// Get detailed actionable batches
export async function fetchActionableBatches(
  storeId: string,
  serverClient?: ServerClient,
): Promise<ActionableBatchesResponse> {
  return withPerformanceTracking(
    'lib/queries/store-insights',
    'fetchActionableBatches',
    { storeId },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('get_actionable_batches', {
        input_store_id: storeId,
      })

      if (error) {
        logger.error('lib/queries/store-insights', 'Error fetching actionable batches', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch actionable batches: ${error.message}`)
      }

      logger.log('lib/queries/store-insights', 'Successfully fetched actionable batches', {
        storeId,
      })
      return data as ActionableBatchesResponse
    },
  )
}

// Get insights for all stores (admin view)
export async function fetchAllStoresInsights(
  serverClient?: ServerClient,
): Promise<StoreInsights[]> {
  const supabase = serverClient || createClient()

  // First get all active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('store_id, store_name')
    .eq('is_active', true)
    .order('store_name')

  if (storesError) {
    throw new Error(`Failed to fetch stores: ${storesError.message}`)
  }

  if (!stores || stores.length === 0) {
    return []
  }

  // Get insights for each store
  const insightsPromises = stores.map((store: { store_id: string; store_name: string }) =>
    fetchStoreInsights(store.store_id, serverClient),
  )

  const insights = await Promise.allSettled(insightsPromises)

  return insights
    .filter(
      (result): result is PromiseFulfilledResult<StoreInsights> => result.status === 'fulfilled',
    )
    .map(result => result.value)
}
