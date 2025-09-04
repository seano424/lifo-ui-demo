import { z } from 'zod'
import {
  createEmailValidator,
  createPhoneValidator,
  createPostalCodeValidator,
  createStoreNameValidator,
  createWebsiteValidator,
} from '@/lib/utils/validation-utils'
import type { Database } from '@/types/supabase'

// Get the allowed store types from your database schema check constraint
type StoreType = Database['business']['Enums']['store_type_enum']

// Manually define the allowed values as a runtime array, type-checked against StoreType
export const STORE_TYPES = [
  'supermarket',
  'convenience',
  'restaurant',
  'bakery',
  'butcher',
  'organic',
] as const satisfies readonly StoreType[]

// Basic schema for forms where country is not yet known
export const storeFormSchema = z.object({
  store_name: createStoreNameValidator(),
  store_type: z.enum(STORE_TYPES, {
    required_error: 'Please select a store type',
  }),
  address: z.string().min(5, 'Address must be at least 5 characters').nullable(),
  city: z.string().min(2, 'City is required').nullable(),
  postal_code: z
    .string()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code too long')
    .nullable(),
  country: z.string().min(2, 'Country is required').nullable(),
  business_name: z.string().max(100, 'Business name too long').optional().nullable(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number too long')
    .optional()
    .or(z.literal('')),

  // Google Places specific (optional)
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  googlePlaceId: z.string().optional(),
})

// Enhanced schema factory for dynamic validation based on country
export function createEnhancedStoreFormSchema(country?: string | null) {
  return z.object({
    store_name: createStoreNameValidator(),
    store_type: z.enum(STORE_TYPES, {
      required_error: 'Please select a store type',
    }),
    address: z.string().min(5, 'Address must be at least 5 characters').nullable(),
    city: z.string().min(2, 'City is required').nullable(),
    postal_code: country ? createPostalCodeValidator(country).nullable() : z.string().nullable(),
    country: z.string().min(2, 'Country is required').nullable(),
    business_name: z.string().max(100, 'Business name too long').optional().nullable(),
    phone: country
      ? createPhoneValidator(country).optional().or(z.literal(''))
      : z.string().optional().or(z.literal('')),

    // Additional fields for enhanced validation
    email: createEmailValidator().optional().or(z.literal('')),
    website_url: createWebsiteValidator().optional().or(z.literal('')),

    // Google Places specific (optional)
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    googlePlaceId: z.string().optional(),
  })
}

export type StoreFormData = z.infer<typeof storeFormSchema>

// Type for the database insert (using Supabase generated types)
export type StoreInsert = Database['business']['Tables']['stores']['Insert']
export type Store = Database['business']['Tables']['stores']['Row']

// Business check request schema
export const businessCheckSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

export type BusinessCheckRequest = z.infer<typeof businessCheckSchema>

// Store type labels for UI display
export const STORE_TYPE_LABELS: Record<(typeof STORE_TYPES)[number], string> = {
  supermarket: 'Supermarket',
  convenience: 'Convenience Store',
  restaurant: 'Restaurant',
  bakery: 'Bakery',
  butcher: 'Butcher',
  organic: 'Organic Store',
}

// Helper function to convert form data to database insert format
export function convertFormDataToStoreInsert(
  formData: StoreFormData,
  storeCode: string,
  ownerId?: string,
): StoreInsert {
  return {
    store_name: formData.store_name,
    store_code: storeCode,
    business_name: formData.business_name || formData.store_name,
    address: formData.address,
    city: formData.city,
    postal_code: formData.postal_code,
    country: formData.country || 'France',
    store_type: formData.store_type,
    timezone: getTimezoneForCountry(formData.country || 'France'),
    owner_id: ownerId || null,
    is_active: true,
    onboarding_completed: false,
  }
}

// Helper function to get timezone based on country
function getTimezoneForCountry(country: string): string {
  const timezoneMap: Record<string, string> = {
    France: 'Europe/Paris',
    Netherlands: 'Europe/Amsterdam',
    Germany: 'Europe/Berlin',
    Spain: 'Europe/Madrid',
    Italy: 'Europe/Rome',
    Belgium: 'Europe/Brussels',
    'United Kingdom': 'Europe/London',
    UK: 'Europe/London',
  }

  return timezoneMap[country] || 'Europe/Paris'
}
