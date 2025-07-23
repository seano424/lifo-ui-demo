import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StoreBasicInfo } from './queries/store-settings'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Type for store data with nullable optional fields
type StoreWithNullableFields = {
  store_id: string
  store_name: string
  store_code: string
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  // Optional fields converted to nullable
  address: string | null
  business_name: string | null
  city: string | null
  country: string | null
  cover_image_url: string | null
  default_markup_percent: number | null
  description: string | null
  email: string | null
  latitude: number | null
  logo_url: string | null
  longitude: number | null
  owner_id: string | null
  phone: string | null
  postal_code: string | null
  size_category: string | null
  store_type: 'supermarket' | 'convenience' | 'restaurant' | 'bakery' | 'butcher' | 'organic' | null
  timezone: string | null
  waste_reduction_target_percent: number | null
  website_url: string | null
}

// Type conversion utilities for store data
export function convertStoreBasicInfoToStore(basicInfo: StoreBasicInfo): StoreWithNullableFields {
  return {
    store_id: basicInfo.store_id,
    store_name: basicInfo.store_name,
    store_code: basicInfo.store_code,
    is_active: basicInfo.is_active,
    onboarding_completed: basicInfo.onboarding_completed,
    created_at: basicInfo.created_at,
    updated_at: basicInfo.updated_at,
    // Convert optional fields to nullable fields to match Store type
    address: basicInfo.address ?? null,
    business_name: basicInfo.business_name ?? null,
    city: basicInfo.city ?? null,
    country: basicInfo.country ?? null,
    cover_image_url: basicInfo.cover_image_url ?? null,
    default_markup_percent: basicInfo.default_markup_percent ?? null,
    description: basicInfo.description ?? null,
    email: basicInfo.email ?? null,
    latitude: basicInfo.latitude ?? null,
    logo_url: basicInfo.logo_url ?? null,
    longitude: basicInfo.longitude ?? null,
    owner_id: basicInfo.owner_id ?? null,
    phone: basicInfo.phone ?? null,
    postal_code: basicInfo.postal_code ?? null,
    size_category: basicInfo.size_category ?? null,
    store_type: basicInfo.store_type ?? null,
    timezone: basicInfo.timezone ?? null,
    waste_reduction_target_percent: basicInfo.waste_reduction_target_percent ?? null,
    website_url: basicInfo.website_url ?? null,
  }
}
