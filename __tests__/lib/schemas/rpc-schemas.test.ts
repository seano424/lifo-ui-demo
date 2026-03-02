/**
 * Tests for RPC response Zod schemas
 *
 * Covers runtime validation of Supabase RPC return types,
 * particularly edge cases where the DB returns null for optional fields.
 */

import { BatchTrackingSetupResponseSchema } from '@/lib/validation/rpc-schemas'

const baseResponse = {
  category_settings: [],
  product_override_count: 0,
  tracked_product_count: 0,
  automated_product_count: 0,
}

describe('BatchTrackingSetupResponseSchema', () => {
  describe('config.setup_completed_at', () => {
    it('accepts a string value', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: {
          enabled: true,
          setup_completed: true,
          setup_completed_at: '2024-01-01T00:00:00Z',
        },
      })
      expect(result.success).toBe(true)
    })

    it('accepts null (fresh store, setup not started)', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: { enabled: false, setup_completed: false, setup_completed_at: null },
      })
      expect(result.success).toBe(true)
    })

    it('accepts undefined (field absent from JSON)', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: { enabled: false, setup_completed: false },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('config.product_selection_mode', () => {
    it('accepts valid enum values', () => {
      for (const mode of ['all', 'by_category', 'individual'] as const) {
        const result = BatchTrackingSetupResponseSchema.safeParse({
          ...baseResponse,
          config: { enabled: true, setup_completed: true, product_selection_mode: mode },
        })
        expect(result.success).toBe(true)
      }
    })

    it('accepts null (fresh store, mode not yet chosen)', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: { enabled: false, setup_completed: false, product_selection_mode: null },
      })
      expect(result.success).toBe(true)
    })

    it('accepts undefined (field absent from JSON)', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: { enabled: false, setup_completed: false },
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid enum values', () => {
      const result = BatchTrackingSetupResponseSchema.safeParse({
        ...baseResponse,
        config: { enabled: false, setup_completed: false, product_selection_mode: 'unknown' },
      })
      expect(result.success).toBe(false)
    })
  })
})
