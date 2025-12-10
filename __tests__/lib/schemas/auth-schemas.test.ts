/**
 * Tests for auth validation schemas
 *
 * These tests verify:
 * - Email validation (security issue #1)
 * - Password validation rules
 * - Password confirmation matching
 */

import { signUpSchema } from '@/lib/schemas/auth-schemas'

describe('signUpSchema', () => {
  describe('email validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'name+tag@company.org',
        'user123@test-domain.com',
      ]

      for (const email of validEmails) {
        const result = signUpSchema.safeParse({
          email,
          password: 'password123',
          repeatPassword: 'password123',
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid email addresses (XSS protection)', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user space@example.com',
        '<script>alert("xss")</script>@example.com',
        'javascript:alert(1)@example.com',
        '',
      ]

      for (const email of invalidEmails) {
        const result = signUpSchema.safeParse({
          email,
          password: 'password123',
          repeatPassword: 'password123',
        })
        expect(result.success).toBe(false)
      }
    })

    it('should reject emails that are too long', () => {
      const longEmail = `${'a'.repeat(250)}@example.com`
      const result = signUpSchema.safeParse({
        email: longEmail,
        password: 'password123',
        repeatPassword: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should require email field', () => {
      const result = signUpSchema.safeParse({
        email: '',
        password: 'password123',
        repeatPassword: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email is required')
      }
    })
  })

  describe('password validation', () => {
    it('should accept passwords with minimum length', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: '123456',
        repeatPassword: '123456',
      })
      expect(result.success).toBe(true)
    })

    it('should reject passwords shorter than 6 characters', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
        repeatPassword: '12345',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 6 characters')
      }
    })

    it('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(73)
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: longPassword,
        repeatPassword: longPassword,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('too long')
      }
    })
  })

  describe('password confirmation', () => {
    it('should accept when passwords match', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        repeatPassword: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject when passwords do not match', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        repeatPassword: 'different123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })

    it('should require repeat password field', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        repeatPassword: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('confirm your password')
      }
    })
  })

  describe('complete form validation', () => {
    it('should accept valid complete form', () => {
      const result = signUpSchema.safeParse({
        email: 'user@example.com',
        password: 'securePassword123',
        repeatPassword: 'securePassword123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.password).toBe('securePassword123')
        expect(result.data.repeatPassword).toBe('securePassword123')
      }
    })
  })
})
