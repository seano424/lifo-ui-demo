// lib/queries/urgent-alerts.ts

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

// Type from the database view
type ExpiringBatchRow = Database['inventory']['Views']['batch_expiry_status']['Row']

// Extended type with proper urgency level enum
export type ExpiringBatch = ExpiringBatchRow & {
  urgency_level: 'Critical' | 'Urgent' | 'Warning' | null
}

export type UrgentAlertData = {
  criticalCount: number
  urgentCount: number
  totalCount: number
  items: ExpiringBatch[]
}

// Fetch urgent alerts for a specific store
export async function fetchUrgentAlerts(storeId: string): Promise<UrgentAlertData> {
  return withPerformanceTracking(
    'lib/queries/urgent-alerts',
    'fetchUrgentAlerts',
    { storeId },
    async () => {
      const supabase = createClient()

      // First, get all batches for the store to get their IDs
      const { data: storeBatches, error: batchError } = await supabase
        .schema('inventory')
        .from('batches')
        .select('batch_id')
        .eq('store_id', storeId)

      if (batchError) {
        logger.queryWarn('lib/queries/urgent-alerts', 'Error fetching store batches', {
          error: batchError.message,
          code: batchError.code,
          storeId,
        })
        throw batchError
      }

      const batchIds = storeBatches?.map(b => b.batch_id) || []

      // If no batches for this store, return empty results
      if (batchIds.length === 0) {
        logger.log('lib/queries/urgent-alerts', 'No batches found for store', { storeId })
        return {
          criticalCount: 0,
          urgentCount: 0,
          totalCount: 0,
          items: [],
        }
      }

      // Query the batch_expiry_status view filtering by batch IDs
      const { data, error } = await supabase
        .schema('inventory')
        .from('batch_expiry_status')
        .select('*')
        .in('batch_id', batchIds)
        .in('urgency_level', ['Critical', 'Urgent'])
        .order('days_to_expiry', { ascending: true })

      if (error) {
        logger.queryWarn('lib/queries/urgent-alerts', 'Error fetching urgent alerts', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw error
      }

      // Cast data to our extended type with proper urgency level enum
      const typedData = (data as ExpiringBatch[]) || []

      // Categorize items by urgency level
      const criticalItems = typedData.filter(item => item.urgency_level === 'Critical')
      const urgentItems = typedData.filter(item => item.urgency_level === 'Urgent')

      return {
        criticalCount: criticalItems.length,
        urgentCount: urgentItems.length,
        totalCount: typedData.length,
        items: typedData,
      }
    },
  )
}

// Helper function to generate the alert message
export function getAlertMessage(
  criticalCount: number,
  urgentCount: number,
): {
  message: string
  severity: 'urgent' | 'safe'
} {
  if (criticalCount > 0) {
    const itemWord = criticalCount === 1 ? 'item' : 'items'
    const timeframe = criticalCount === 1 ? 'tomorrow' : 'in the next 3 days'
    return {
      message: `Urgent: ${criticalCount} ${itemWord} expiring ${timeframe}`,
      severity: 'urgent',
    }
  }

  if (urgentCount > 0) {
    const itemWord = urgentCount === 1 ? 'item' : 'items'
    return {
      message: `${urgentCount} ${itemWord} expiring this week`,
      severity: 'urgent',
    }
  }

  return {
    message: 'All items within safe expiry dates',
    severity: 'safe',
  }
}
