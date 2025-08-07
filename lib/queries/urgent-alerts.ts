// lib/queries/urgent-alerts.ts

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

// Type from the database view
type ExpiringBatchRow = Database['inventory']['Views']['expiring_batches']['Row']

// Extended type with proper urgency level enum
export type ExpiringBatch = Omit<ExpiringBatchRow, 'urgency_level'> & {
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
  const supabase = createClient()

  // First, get all batches for the store to get their IDs
  const { data: storeBatches, error: batchError } = await supabase
    .schema('inventory')
    .from('batches')
    .select('batch_id')
    .eq('store_id', storeId)

  if (batchError) {
    console.error('[fetchUrgentAlerts] Error fetching store batches:', batchError)
    throw batchError
  }

  const batchIds = storeBatches?.map(b => b.batch_id) || []

  // If no batches for this store, return empty results
  if (batchIds.length === 0) {
    return {
      criticalCount: 0,
      urgentCount: 0,
      totalCount: 0,
      items: [],
    }
  }

  // Query the expiring_batches view filtering by batch IDs
  const { data, error } = await supabase
    .schema('inventory')
    .from('expiring_batches')
    .select('*')
    .in('batch_id', batchIds)
    .in('urgency_level', ['Critical', 'Urgent'])
    .order('days_to_expiry', { ascending: true })

  if (error) {
    console.error('[fetchUrgentAlerts] Error fetching urgent alerts:', error)
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
}

// Helper function to generate the alert message
export function getAlertMessage(
  criticalCount: number,
  urgentCount: number,
): {
  message: string
  severity: 'critical' | 'urgent' | 'safe'
} {
  if (criticalCount > 0) {
    const itemWord = criticalCount === 1 ? 'ITEM' : 'ITEMS'
    const timeframe = criticalCount === 1 ? 'TOMORROW' : 'IN THE NEXT 3 DAYS'
    return {
      message: `URGENT: ${criticalCount} ${itemWord} EXPIRING ${timeframe}`,
      severity: 'critical',
    }
  }

  if (urgentCount > 0) {
    const itemWord = urgentCount === 1 ? 'ITEM' : 'ITEMS'
    return {
      message: `${urgentCount} ${itemWord} EXPIRING THIS WEEK`,
      severity: 'urgent',
    }
  }

  return {
    message: 'ALL ITEMS WITHIN SAFE EXPIRY DATES',
    severity: 'safe',
  }
}
