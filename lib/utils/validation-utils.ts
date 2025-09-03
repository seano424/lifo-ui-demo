/**
 * Enhanced validation utilities for form fields
 */
import { z } from 'zod'

/**
 * Postal code validation patterns by country
 */
const POSTAL_CODE_PATTERNS = {
  France: /^\d{5}$/,
  Netherlands: /^\d{4}\s?[A-Z]{2}$/i,
  Germany: /^\d{5}$/,
  Belgium: /^\d{4}$/,
  Spain: /^\d{5}$/,
  Italy: /^\d{5}$/,
  'United Kingdom': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
} as const

/**
 * Phone number validation patterns by country
 * These are simplified patterns - in production, consider using libphonenumber
 */
const PHONE_PATTERNS = {
  France: /^(?:\+33|0)[1-9](?:[0-9]{8})$/,
  Netherlands: /^(?:\+31|0)[1-9](?:[0-9]{8})$/,
  Germany: /^(?:\+49|0)[1-9](?:[0-9]{9,11})$/,
  Belgium: /^(?:\+32|0)[1-9](?:[0-9]{7,8})$/,
  Spain: /^(?:\+34|[6-9])(?:[0-9]{8})$/,
  Italy: /^(?:\+39|3)(?:[0-9]{9,10})$/,
  'United Kingdom': /^(?:\+44|0)[1-9](?:[0-9]{9,10})$/,
  UK: /^(?:\+44|0)[1-9](?:[0-9]{9,10})$/,
} as const

/**
 * Create a postal code validator for a specific country
 */
export function createPostalCodeValidator(country?: string | null) {
  return z
    .string()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code too long')
    .refine(
      value => {
        if (!country || !value) return true

        const pattern = POSTAL_CODE_PATTERNS[country as keyof typeof POSTAL_CODE_PATTERNS]
        if (!pattern) return true // Allow if no pattern defined for country

        return pattern.test(value.trim())
      },
      val => ({
        message: `Invalid postal code format for ${country}`,
      }),
    )
}

/**
 * Create a phone number validator for a specific country
 */
export function createPhoneValidator(country?: string | null) {
  return z
    .string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number too long')
    .refine(
      value => {
        if (!country || !value) return true

        const pattern = PHONE_PATTERNS[country as keyof typeof PHONE_PATTERNS]
        if (!pattern) {
          // Fallback to basic international format
          return /^\+?[1-9]\d{7,14}$/.test(value.replace(/\s/g, ''))
        }

        return pattern.test(value.replace(/\s/g, ''))
      },
      val => ({
        message: `Invalid phone number format for ${country}`,
      }),
    )
}

/**
 * Enhanced email validator with additional checks
 */
export function createEmailValidator() {
  return z
    .string()
    .email('Invalid email address')
    .max(254, 'Email address too long') // RFC 5321 limit
    .refine(email => {
      // Additional checks for common typos
      const domain = email.split('@')[1]
      if (!domain) return false

      // Check for common domain typos
      const commonTypos = ['gmail.co', 'yahoo.co', 'hotmail.co', 'outlook.co']
      return !commonTypos.includes(domain.toLowerCase())
    }, 'Please check your email address for typos')
}

/**
 * Enhanced website URL validator
 */
export function createWebsiteValidator() {
  return z
    .string()
    .url('Invalid website URL')
    .max(2048, 'URL too long')
    .refine(url => {
      try {
        const parsed = new URL(url)
        // Must be http or https
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    }, 'Website must be a valid HTTP or HTTPS URL')
}

/**
 * Store name validator with enhanced rules
 */
export function createStoreNameValidator() {
  return z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name too long')
    .refine(name => {
      // Must contain at least one letter
      return /[a-zA-ZÀ-ÿ]/.test(name)
    }, 'Store name must contain at least one letter')
    .refine(name => {
      // No excessive special characters
      const specialCharCount = (name.match(/[^a-zA-ZÀ-ÿ0-9\s\-&'.,]/g) || []).length
      return specialCharCount <= 3
    }, 'Store name contains too many special characters')
}
