'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { logger } from '@/lib/utils/logger'

/**
 * Special UUID for ad-hoc/temporary donation recipients
 * Used when recipient name is provided but not stored in DB
 * Actual recipient name stored in notes field
 */
export const ADHOC_RECIPIENT_UUID = '00000000-0000-0000-0000-000000000001'

/**
 * Donation recipient type from database
 */
export interface DonationRecipient {
  id: string
  name: string
  type:
    | 'food_bank'
    | 'soup_kitchen'
    | 'charity'
    | 'religious_org'
    | 'community_group'
    | 'animal_shelter'
    | 'school'
    | 'elderly_care'
    | 'homeless_shelter'
    | 'other'
    | 'adhoc'
  isAdhoc: boolean
  contactEmail?: string
  contactPhone?: string
  isCertified?: boolean
  certificationNotes?: string
  acceptsPickups?: boolean
  maxDistanceKm?: number
}

/**
 * Preset ad-hoc recipients for quick selection
 */
export const ADHOC_PRESETS = [
  { name: 'Employee', icon: '👤' },
  { name: 'Family & Friends', icon: '👨‍👩‍👧‍👦' },
  { name: 'Local School', icon: '🏫' },
  { name: 'Community Center', icon: '🏘️' },
] as const

/**
 * Fetch donation recipients from database
 */
async function fetchDonationRecipients(storeId: string): Promise<DonationRecipient[]> {
  const startTime = performance.now()
  logger.log('useDonationRecipients', 'Starting donation recipients query', { storeId })

  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('donation_recipients')
    .select(
      'recipient_id, name, recipient_type, contact_email, contact_phone, is_certified, certification_notes, accepts_pickups, max_distance_km',
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('name')

  const endTime = performance.now()

  if (error) {
    logger.error('useDonationRecipients', 'Failed to fetch recipients', { error, storeId })
    throw error
  }

  logger.log(
    'useDonationRecipients',
    `Recipients query completed in ${(endTime - startTime).toFixed(2)}ms`,
    {
      storeId,
      recipientCount: data?.length || 0,
      rawData: data,
      recipientNames: data?.map(r => r.name) || [],
    },
  )

  // Transform database records to our interface
  const transformed = (data || []).map(recipient => ({
    id: recipient.recipient_id,
    name: recipient.name,
    type: recipient.recipient_type as DonationRecipient['type'],
    isAdhoc: false,
    contactEmail: recipient.contact_email || undefined,
    contactPhone: recipient.contact_phone || undefined,
    isCertified: recipient.is_certified || false,
    certificationNotes: recipient.certification_notes || undefined,
    acceptsPickups: recipient.accepts_pickups || false,
    maxDistanceKm: recipient.max_distance_km || undefined,
  }))

  logger.log('useDonationRecipients', 'Transformed recipients', {
    count: transformed.length,
    names: transformed.map(r => r.name),
  })

  return transformed
}

/**
 * Data for creating a new donation recipient
 */
export interface CreateRecipientData {
  name: string
  type: DonationRecipient['type']
  contactEmail?: string
  contactPhone?: string
  isCertified?: boolean
  certificationNotes?: string
  acceptsPickups?: boolean
  maxDistanceKm?: number
}

/**
 * Create a new donation recipient in the database
 */
async function createDonationRecipient(
  storeId: string,
  recipientData: CreateRecipientData,
): Promise<DonationRecipient> {
  const startTime = performance.now()
  logger.log('useDonationRecipients', 'Creating new donation recipient', {
    storeId,
    recipientName: recipientData.name,
  })

  const supabase = createClient()

  // Get current user for created_by field
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User must be authenticated to create recipients')
  }

  // Insert the new recipient
  const { data, error } = await supabase
    .schema('inventory')
    .from('donation_recipients')
    .insert({
      store_id: storeId,
      name: recipientData.name,
      recipient_type: recipientData.type,
      contact_email: recipientData.contactEmail,
      contact_phone: recipientData.contactPhone,
      is_certified: recipientData.isCertified ?? false,
      certification_notes: recipientData.certificationNotes,
      accepts_pickups: recipientData.acceptsPickups ?? true,
      max_distance_km: recipientData.maxDistanceKm ?? 10,
      is_active: true,
      created_by: user.id,
    })
    .select(
      'recipient_id, name, recipient_type, contact_email, contact_phone, is_certified, certification_notes, accepts_pickups, max_distance_km',
    )
    .single()

  const endTime = performance.now()

  if (error) {
    logger.error('useDonationRecipients', 'Failed to create recipient', {
      error,
      storeId,
      recipientName: recipientData.name,
    })
    throw error
  }

  logger.log(
    'useDonationRecipients',
    `Recipient created successfully in ${(endTime - startTime).toFixed(2)}ms`,
    {
      storeId,
      recipientId: data.recipient_id,
      recipientName: data.name,
    },
  )

  // Transform to our interface
  return {
    id: data.recipient_id,
    name: data.name,
    type: data.recipient_type as DonationRecipient['type'],
    isAdhoc: false,
    contactEmail: data.contact_email || undefined,
    contactPhone: data.contact_phone || undefined,
    isCertified: data.is_certified || false,
    certificationNotes: data.certification_notes || undefined,
    acceptsPickups: data.accepts_pickups || false,
    maxDistanceKm: data.max_distance_km || undefined,
  }
}

/**
 * Hook for managing donation recipients (DB + ad-hoc)
 *
 * Provides:
 * - Database recipients (permanent records)
 * - Ad-hoc recipients (temporary, session-based)
 * - Recipient creation (permanent database records)
 * - Unified interface for both types
 * - Quick presets (Employee, Family & Friends, etc.)
 *
 * @param storeId - The store ID to fetch recipients for
 * @returns Object with recipients list, loading state, and helper functions
 *
 * @example
 * ```tsx
 * const { recipients, addAdhocRecipient, createRecipient, isLoading } = useDonationRecipients(storeId)
 *
 * // Add ad-hoc recipient (temporary)
 * addAdhocRecipient('Local Church')
 *
 * // Create permanent recipient in database
 * createRecipient({
 *   name: 'Testing',
 *   type: 'charity',
 *   contactEmail: 'test@example.com'
 * })
 *
 * // Use in donation action
 * executeDonate({
 *   recipientId: ADHOC_RECIPIENT_UUID,
 *   recipientName: 'Local Church',
 *   notes: 'Donated via ad-hoc recipient'
 * })
 * ```
 */
export function useDonationRecipients(storeId: string | undefined) {
  const queryClient = useQueryClient()

  // Track ad-hoc recipients in component state
  const [adhocRecipients, setAdhocRecipients] = useState<string[]>([])

  // Fetch database recipients
  const query = useQuery({
    queryKey: queryKeys.donations.recipients(storeId || ''),
    queryFn: () => {
      if (!storeId) {
        throw new Error('No store ID provided')
      }
      return fetchDonationRecipients(storeId)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - recipients don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  })

  // Mutation for creating new recipients
  const createMutation = useMutation({
    mutationFn: (recipientData: CreateRecipientData) => {
      if (!storeId) {
        throw new Error('No store ID provided')
      }
      logger.log('useDonationRecipients', 'Starting createDonationRecipient mutation', {
        storeId,
        recipientData,
      })
      return createDonationRecipient(storeId, recipientData)
    },
    onSuccess: async createdRecipient => {
      logger.log('useDonationRecipients', 'Mutation onSuccess - recipient created', {
        recipientId: createdRecipient.id,
        recipientName: createdRecipient.name,
        storeId,
      })

      // Invalidate and refetch recipients query
      const queryKey = queryKeys.donations.recipients(storeId || '')
      logger.log('useDonationRecipients', 'Invalidating query', { queryKey })

      await queryClient.invalidateQueries({
        queryKey,
      })

      logger.log('useDonationRecipients', 'Query invalidated, should refetch now')

      toast.success(`Recipient "${createdRecipient.name}" created successfully`)
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create recipient'
      logger.error('useDonationRecipients', 'Mutation onError - failed to create recipient', {
        error,
        errorMessage,
        storeId,
      })
      toast.error(errorMessage)
    },
  })

  // Add ad-hoc recipient to in-memory list
  const addAdhocRecipient = useCallback((recipientName: string) => {
    setAdhocRecipients(prev => {
      // Don't add duplicates
      if (prev.includes(recipientName)) {
        return prev
      }
      logger.log('useDonationRecipients', 'Added ad-hoc recipient', { recipientName })
      return [...prev, recipientName]
    })
  }, [])

  // Remove ad-hoc recipient from list
  const removeAdhocRecipient = useCallback((recipientName: string) => {
    setAdhocRecipients(prev => {
      logger.log('useDonationRecipients', 'Removed ad-hoc recipient', { recipientName })
      return prev.filter(name => name !== recipientName)
    })
  }, [])

  // Clear all ad-hoc recipients
  const clearAdhocRecipients = useCallback(() => {
    logger.log('useDonationRecipients', 'Cleared all ad-hoc recipients')
    setAdhocRecipients([])
  }, [])

  // Combine DB recipients + ad-hoc recipients
  const allRecipients = useMemo(() => {
    const dbRecipients = query.data || []

    // Convert ad-hoc names to recipient objects
    const adhocRecipientObjects: DonationRecipient[] = adhocRecipients.map(name => ({
      id: ADHOC_RECIPIENT_UUID,
      name,
      type: 'adhoc',
      isAdhoc: true,
    }))

    return [...dbRecipients, ...adhocRecipientObjects]
  }, [query.data, adhocRecipients])

  // Check if a recipient name is already in the ad-hoc list
  const hasAdhocRecipient = useCallback(
    (recipientName: string) => {
      return adhocRecipients.includes(recipientName)
    },
    [adhocRecipients],
  )

  return {
    // Combined list of all recipients (DB + ad-hoc)
    recipients: allRecipients,

    // Database recipients only
    dbRecipients: query.data || [],

    // Ad-hoc recipients only
    adhocRecipients: adhocRecipients.map(name => ({
      id: ADHOC_RECIPIENT_UUID,
      name,
      type: 'adhoc' as const,
      isAdhoc: true,
    })),

    // Loading and error states
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Database recipient creation
    createRecipient: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    // Ad-hoc recipient management
    addAdhocRecipient,
    removeAdhocRecipient,
    clearAdhocRecipients,
    hasAdhocRecipient,

    // Special UUID constant
    ADHOC_RECIPIENT_UUID,

    // Refetch function for manual refresh
    refetch: query.refetch,
  }
}

/**
 * Helper function to format recipient for display
 */
export function formatRecipientDisplay(recipient: DonationRecipient): string {
  if (recipient.isAdhoc) {
    return recipient.name
  }

  const typeLabel = recipient.type.replace('_', ' ')
  return `${recipient.name} (${typeLabel})`
}

/**
 * Helper function to check if recipient ID is ad-hoc
 */
export function isAdhocRecipient(recipientId: string): boolean {
  return recipientId === ADHOC_RECIPIENT_UUID
}
