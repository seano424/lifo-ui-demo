import { createClient } from '@/lib/supabase/client'

export interface DonationRecipient {
  recipient_id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  recipient_type: 'charity' | 'food_bank' | 'shelter' | 'community_center'
  is_certified: boolean
  certification_notes: string | null
  accepts_pickups: boolean
  max_distance_km: number | null
  store_id: string
  created_at: string | null
}

export interface DonationAction {
  action_id: string
  batch_id: string
  store_id: string
  recommended_action: string
  actual_action: string
  ai_score: number | null
  action_date: string | null
  quantity_affected: number | null
  notes: string | null
  original_value: number | null
  recovered_value: number | null
  donation_recipient_id: string | null
}

export interface DonationAnalytics {
  summary: {
    period_days: number
    total_actions: number
    donation_count: number
    total_donated_value: number
    total_recovered_value: number
    recommendation_accuracy_percent: number
  }
  action_breakdown: Record<string, number>
  donation_impact: {
    items_donated: number
    estimated_tax_benefit: number
    waste_prevented_value: number
  }
}

// Fetch donation recipients for a store
export async function fetchDonationRecipients(
  storeId: string,
  recipientType?: string,
  isActive: boolean = true
): Promise<{ recipients: DonationRecipient[]; total_count: number }> {
  const supabase = createClient()
  
  const params = new URLSearchParams({
    store_id: storeId,
    is_active: isActive.toString(),
  })
  
  if (recipientType) {
    params.append('recipient_type', recipientType)
  }
  
  const response = await fetch(`/api/v1/donation-queries/recipients?${params}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch donation recipients')
  }
  
  return response.json()
}

// Fetch donation actions/history
export async function fetchDonationActions(
  storeId: string,
  actionType?: string,
  days: number = 30,
  limit: number = 100
): Promise<{ actions: DonationAction[]; total_count: number; period_days: number }> {
  const supabase = createClient()
  
  const params = new URLSearchParams({
    store_id: storeId,
    days: days.toString(),
    limit: limit.toString(),
  })
  
  if (actionType) {
    params.append('action_type', actionType)
  }
  
  const response = await fetch(`/api/v1/donation-queries/actions?${params}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch donation actions')
  }
  
  return response.json()
}

// Fetch donation analytics
export async function fetchDonationAnalytics(
  storeId: string,
  days: number = 30
): Promise<DonationAnalytics> {
  const supabase = createClient()
  
  const params = new URLSearchParams({
    store_id: storeId,
    days: days.toString(),
  })
  
  const response = await fetch(`/api/v1/donation-queries/analytics/summary?${params}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch donation analytics')
  }
  
  return response.json()
}

// Check donation eligibility for a batch
export async function checkDonationEligibility(
  batchId: string,
  options: {
    current_temperature?: number
    packaging_condition?: 'good' | 'damaged' | 'opened'
    force_recalculate?: boolean
  } = {}
): Promise<{
  batch_id: string
  eligible_for_donation: boolean
  eligibility_status: string
  eu_compliance_score: number
  recommended_action: string
  safety_requirements: string[]
  regulatory_notes: string[]
  calculated_at: string
}> {
  const response = await fetch(`/api/v1/donations-simple/eligibility/${batchId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
  
  if (!response.ok) {
    throw new Error('Failed to check donation eligibility')
  }
  
  return response.json()
}

// Execute a donation action
export async function executeDonationAction(
  batchId: string,
  recipientId: string,
  notes?: string
): Promise<{
  success: boolean
  message: string
  action_id: string
  timestamp: string
}> {
  // This would integrate with your existing donation system
  // For now, we'll call the batch actions endpoint from donation_queries.py
  
  const response = await fetch(`/api/v1/donation-queries/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      batch_id: batchId,
      actual_action: 'donate',
      donation_recipient_id: recipientId,
      notes: notes || 'Donation executed via Store Insights dashboard',
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to execute donation action')
  }
  
  return response.json()
}