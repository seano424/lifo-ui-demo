// lib/types/user.ts - Enhanced User types with phone & language support

// Supported languages configuration
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  fr: 'Français',
  nl: 'Nederlands',
  de: 'Deutsch',
  es: 'Español',
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES

// Updated User type to match RPC function output
export type User = {
  id: string
  email: string
  created_at: string
  updated_at: string
  raw_user_meta_data: Record<string, unknown>

  // Existing metadata fields
  username: string
  full_name: string
  is_active: boolean
  avatar_url: string
  last_login: string
  pin_hash: string
  pin_set_at: string
  pin_attempts: number
  requires_pin: boolean
  email_verified: boolean
  phone_verified: boolean
  pin_expires_at: string
  pin_locked_until: string
  pin_delivery_method: string
  migrated_from_user_mgmt: boolean

  // 🆕 NEW FIELDS:
  phone?: string | null // From auth.users.phone column
  language_preference: SupportedLanguage // From metadata, defaults to 'en'
}

// Utility functions for language handling
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return Object.keys(SUPPORTED_LANGUAGES).includes(lang)
}

export const getLanguageDisplayName = (lang: SupportedLanguage): string => {
  return SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES.en
}

export const getDefaultLanguage = (): SupportedLanguage => 'en'

// Phone number validation utilities
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || phone.trim() === '') return true // Allow empty
  // Basic international phone number validation
  return /^[\+]?[0-9\s\-\(\)\.]+$/.test(phone)
}

export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return ''
  // Basic formatting - remove extra spaces and format consistently
  return phone.replace(/\s+/g, ' ').trim()
}

// Type for user updates
export type UserUpdate = {
  email?: string
  username?: string
  full_name?: string
  is_active?: boolean
  requires_pin?: boolean
  pin_hash?: string
  pin_attempts?: number
  pin_locked_until?: string | null
  pin_set_at?: string
  last_login?: string
  avatar_url?: string
  phone?: string | null // 🆕 Phone updates
  language_preference?: SupportedLanguage // 🆕 Language updates
}

// Type for user creation
export type UserCreate = {
  email: string
  password?: string
  username?: string
  full_name?: string
  is_active?: boolean
  requires_pin?: boolean
  pin_delivery_method?: string
  phone?: string | null // 🆕 Phone on creation
  language_preference?: SupportedLanguage // 🆕 Language on creation
}

// Language preference specific types
export type LanguageUpdateData = {
  language_preference: SupportedLanguage
}

export type PhoneUpdateData = {
  phone: string | null
}

// API response types for RPC functions
export type UpdatePhoneResponse = {
  success: boolean
  user_id: string
  phone: string | null
}

export type UpdateLanguageResponse = {
  success: boolean
  user_id: string
  language_preference: SupportedLanguage
}
