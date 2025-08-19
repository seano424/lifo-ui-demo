import type { SupportedLanguage } from './user'

export interface CompleteUserProfile {
  user: {
    id: string
    email: string
    phone: string | null
    created_at: string
    updated_at: string
    email_verified: boolean
    phone_verified: boolean
    
    // Metadata fields
    username: string
    full_name: string
    is_active: boolean
    avatar_url: string
    language_preference: SupportedLanguage
    last_login: string
    
    // PIN-related fields
    pin_hash: string
    pin_set_at: string
    pin_attempts: number
    requires_pin: boolean
    pin_expires_at: string
    pin_locked_until: string
    pin_delivery_method: string
    migrated_from_user_mgmt: boolean
    
    // Raw metadata for compatibility
    raw_user_meta_data: Record<string, unknown>
  }
  
  user_stores: UserStoreAccess[]
  
  current_store: CurrentStoreContext | null
  
  global_roles: string[]
  
  permission_summary: PermissionSummary | null
  
  metadata: {
    query_timestamp: string
    has_store_access: boolean
    total_stores: number
    requested_store_id: string | null
    has_current_store_access: boolean | null
  }
}

export interface UserStoreAccess {
  store_id: string
  store_name: string
  store_address: string | null
  store_phone: string | null
  store_email: string | null
  timezone: string
  is_active: boolean
  role_in_store: 'owner' | 'manager' | 'employee' | 'staff'
  permissions: Record<string, boolean>
  is_active_in_store: boolean
  can_use_pin_auth: boolean
  pin_access_level: 'basic' | 'elevated' | 'admin'
  joined_at: string
}

export interface CurrentStoreContext {
  store_id: string
  store_name: string
  timezone: string
  store_is_active: boolean
  role_in_store: 'owner' | 'manager' | 'employee' | 'staff'
  permissions: Record<string, boolean>
  is_active_in_store: boolean
  can_use_pin_auth: boolean
  pin_access_level: 'basic' | 'elevated' | 'admin'
}

export interface PermissionSummary {
  is_owner: boolean
  is_manager: boolean
  is_employee: boolean
  can_manage_users: boolean
  can_view_analytics: boolean
  can_apply_discounts: boolean
  can_scan_products: boolean
  can_upload_inventory: boolean
  can_manage_settings: boolean
}

// Type guards for safe access
export function hasStoreAccess(profile: CompleteUserProfile): boolean {
  return profile.metadata.has_store_access
}

export function hasCurrentStoreAccess(profile: CompleteUserProfile): boolean {
  return profile.metadata.has_current_store_access === true
}

export function getCurrentStore(profile: CompleteUserProfile): CurrentStoreContext | null {
  return hasCurrentStoreAccess(profile) ? profile.current_store : null
}

export function getPermissions(profile: CompleteUserProfile): PermissionSummary | null {
  return hasCurrentStoreAccess(profile) ? profile.permission_summary : null
}

export function isPinLocked(profile: CompleteUserProfile): boolean {
  if (!profile.user.pin_locked_until) return false
  return new Date() < new Date(profile.user.pin_locked_until)
}

export function hasGlobalRole(profile: CompleteUserProfile, role: string): boolean {
  return profile.global_roles.includes(role)
}

export function isUserActive(profile: CompleteUserProfile): boolean {
  return profile.user.is_active
}

export function getUserLanguage(profile: CompleteUserProfile): SupportedLanguage {
  return profile.user.language_preference
}