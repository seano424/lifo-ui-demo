import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Type conversion utilities for store data
export function convertStoreBasicInfoToStore(basicInfo: any): any {
  return {
    ...basicInfo,
    // Convert optional fields to nullable fields to match Store type
    address: basicInfo.address ?? null,
    business_name: basicInfo.business_name ?? null,
    city: basicInfo.city ?? null,
    country: basicInfo.country ?? null,
    cover_image_url: basicInfo.cover_image_url ?? null,
    created_at: basicInfo.created_at ?? null,
    default_markup_percent: basicInfo.default_markup_percent ?? null,
    description: basicInfo.description ?? null,
    email: basicInfo.email ?? null,
    is_active: basicInfo.is_active ?? null,
    latitude: basicInfo.latitude ?? null,
    logo_url: basicInfo.logo_url ?? null,
    longitude: basicInfo.longitude ?? null,
    onboarding_completed: basicInfo.onboarding_completed ?? null,
    owner_id: basicInfo.owner_id ?? null,
    phone: basicInfo.phone ?? null,
    postal_code: basicInfo.postal_code ?? null,
    size_category: basicInfo.size_category ?? null,
    store_type: basicInfo.store_type ?? null,
    timezone: basicInfo.timezone ?? null,
    updated_at: basicInfo.updated_at ?? null,
    waste_reduction_target_percent: basicInfo.waste_reduction_target_percent ?? null,
    website_url: basicInfo.website_url ?? null,
  }
}
