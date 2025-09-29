/**
 * Tests for validation utilities
 *
 * These tests demonstrate:
 * - Testing pure utility functions (easiest type of test)
 * - Testing with different inputs and edge cases
 * - Testing Zod validators
 */

import {
  createPostalCodeValidator,
  createPhoneValidator,
  createEmailValidator,
  createWebsiteValidator,
  createStoreNameValidator,
} from '@/lib/utils/validation-utils'

describe('validation-utils', () => {
  describe('createPostalCodeValidator', () => {
    it('validates French postal codes correctly', () => {
      const validator = createPostalCodeValidator('France')

      // Valid French postal codes
      expect(validator.safeParse('75001').success).toBe(true)
      expect(validator.safeParse('69007').success).toBe(true)

      // Invalid French postal codes
      expect(validator.safeParse('7500').success).toBe(false) // too short
      expect(validator.safeParse('750011').success).toBe(false) // too long
      expect(validator.safeParse('ABCDE').success).toBe(false) // letters
    })

    it('validates UK postal codes correctly', () => {
      const validator = createPostalCodeValidator('United Kingdom')

      // Valid UK postal codes
      expect(validator.safeParse('SW1A 1AA').success).toBe(true)
      expect(validator.safeParse('M1 1AE').success).toBe(true)
      expect(validator.safeParse('B33 8TH').success).toBe(true)

      // Invalid UK postal codes
      expect(validator.safeParse('12345').success).toBe(false)
      expect(validator.safeParse('INVALID').success).toBe(false)
    })

    it('allows any format when country is unknown', () => {
      const validator = createPostalCodeValidator('Unknown Country')

      // Should pass validation when no pattern is defined
      expect(validator.safeParse('12345').success).toBe(true)
      expect(validator.safeParse('ABC-123').success).toBe(true)
    })

    it('requires a postal code', () => {
      const validator = createPostalCodeValidator('France')

      const result = validator.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Postal code is required')
      }
    })
  })

  describe('createPhoneValidator', () => {
    it('validates French phone numbers correctly', () => {
      const validator = createPhoneValidator('France')

      // Valid formats
      expect(validator.safeParse('+33612345678').success).toBe(true)
      expect(validator.safeParse('0612345678').success).toBe(true)

      // Invalid formats
      expect(validator.safeParse('123').success).toBe(false)
      expect(validator.safeParse('+33012345678').success).toBe(false) // can't start with 0 after country code
    })

    it('uses fallback validation for unknown countries', () => {
      const validator = createPhoneValidator('Mars')

      // Should use basic international format
      expect(validator.safeParse('+15551234567').success).toBe(true)
      expect(validator.safeParse('123').success).toBe(false) // too short
    })
  })

  describe('createEmailValidator', () => {
    it('validates correct email addresses', () => {
      const validator = createEmailValidator()

      expect(validator.safeParse('user@example.com').success).toBe(true)
      expect(validator.safeParse('test.user+tag@domain.co.uk').success).toBe(true)
    })

    it('rejects invalid email formats', () => {
      const validator = createEmailValidator()

      expect(validator.safeParse('notanemail').success).toBe(false)
      expect(validator.safeParse('@example.com').success).toBe(false)
      expect(validator.safeParse('user@').success).toBe(false)
    })

    it('detects common domain typos', () => {
      const validator = createEmailValidator()

      // These should fail due to typo detection
      expect(validator.safeParse('user@gmail.co').success).toBe(false)
      expect(validator.safeParse('user@yahoo.co').success).toBe(false)

      // Correct versions should pass
      expect(validator.safeParse('user@gmail.com').success).toBe(true)
      expect(validator.safeParse('user@yahoo.com').success).toBe(true)
    })

    it('enforces RFC 5321 email length limit', () => {
      const validator = createEmailValidator()
      const longEmail = `${'a'.repeat(250)}@example.com`

      expect(validator.safeParse(longEmail).success).toBe(false)
    })
  })

  describe('createWebsiteValidator', () => {
    it('validates correct URLs', () => {
      const validator = createWebsiteValidator()

      expect(validator.safeParse('https://example.com').success).toBe(true)
      expect(validator.safeParse('http://subdomain.example.com').success).toBe(true)
      expect(validator.safeParse('https://example.com/path?query=1').success).toBe(true)
    })

    it('rejects non-HTTP(S) protocols', () => {
      const validator = createWebsiteValidator()

      expect(validator.safeParse('ftp://example.com').success).toBe(false)
      expect(validator.safeParse('file:///path/to/file').success).toBe(false)
    })

    it('rejects invalid URLs', () => {
      const validator = createWebsiteValidator()

      expect(validator.safeParse('not a url').success).toBe(false)
      expect(validator.safeParse('example.com').success).toBe(false) // missing protocol
    })
  })

  describe('createStoreNameValidator', () => {
    it('validates correct store names', () => {
      const validator = createStoreNameValidator()

      expect(validator.safeParse('Carrefour').success).toBe(true)
      expect(validator.safeParse("Trader Joe's").success).toBe(true)
      expect(validator.safeParse('Café René').success).toBe(true)
      expect(validator.safeParse('7-Eleven').success).toBe(true)
    })

    it('requires at least one letter', () => {
      const validator = createStoreNameValidator()

      expect(validator.safeParse('Store 123').success).toBe(true)
      expect(validator.safeParse('123').success).toBe(false) // no letters
    })

    it('rejects names that are too short or too long', () => {
      const validator = createStoreNameValidator()

      expect(validator.safeParse('A').success).toBe(false) // too short
      expect(validator.safeParse('a'.repeat(101)).success).toBe(false) // too long
      expect(validator.safeParse('AB').success).toBe(true) // just right
    })

    it('rejects excessive special characters', () => {
      const validator = createStoreNameValidator()

      expect(validator.safeParse('Store!!!@@##$$').success).toBe(false)
      expect(validator.safeParse("Store's & Co.").success).toBe(true) // reasonable amount
    })
  })
})