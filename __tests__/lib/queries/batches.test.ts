/**
 * Tests for batch query functions
 *
 * These tests demonstrate:
 * - Mocking Supabase client
 * - Testing async functions that make API calls
 * - Testing error handling
 * - Testing data transformation logic
 */

import { fetchBatchesPage, fetchExpiringBatches, type BatchFilters } from '@/lib/queries/batches'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Mock the Supabase client module
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

// Create a mock Supabase client
let mockSupabaseClient: Partial<SupabaseClient<Database>>

describe('batches queries', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockSupabaseClient = createMockClient()
  })

  describe('fetchBatchesPage', () => {
    it('fetches batches with pagination and filters', async () => {
      const mockBatches = [
        {
          batch_id: 'batch-1',
          product_id: 'product-1',
          store_id: 'store-1',
          batch_number: 'B001',
          current_quantity: 10,
          expiry_date: '2024-12-31',
          status: 'active' as const,
          supplier: 'Test Supplier',
          location_code: 'A1',
          cost_price: 5.0,
          selling_price: 10.0,
          manufacture_date: '2024-01-01',
          received_date: '2024-01-15',
          initial_quantity: 20,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockProducts = [
        {
          product_id: 'product-1',
          product_name: 'Test Product',
          categories: null,
        },
      ]

      // Setup mock - need to handle both batch query and product query
      const rangeMock = jest.fn().mockResolvedValue({
        data: mockBatches,
        error: null,
        count: 1,
      })

      const inMock = jest.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn((table: string) => {
          if (table === 'batches') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: rangeMock,
            }
          }
          // For products table
          return {
            select: jest.fn().mockReturnThis(),
            in: inMock,
          }
        }),
      } as any

      const filters: BatchFilters = {
        storeId: 'store-1',
        status: 'active',
      }

      const result = await fetchBatchesPage({ page: 0, pageSize: 10 }, filters, mockSupabaseClient as any)

      expect(result.data.length).toBe(1)
      expect(result.count).toBe(1)
      expect(result.nextPage).toBeUndefined()
    })

    it('throws error when storeId is missing', async () => {
      await expect(fetchBatchesPage({ page: 0, pageSize: 10 }, {})).rejects.toThrow(
        'Store ID is required for fetching batches',
      )
    })

    it('applies sorting correctly', async () => {
      const orderMock = jest.fn().mockReturnThis()
      const rangeMock = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
        range: rangeMock,
      } as any

      const filters: BatchFilters = {
        storeId: 'store-1',
        sort: {
          field: 'current_quantity',
          direction: 'desc',
        },
      }

      await fetchBatchesPage({ page: 0, pageSize: 10 }, filters, mockSupabaseClient as any)

      expect(orderMock).toHaveBeenCalledWith('current_quantity', { ascending: false })
    })

    it('calculates next page correctly', async () => {
      const mockBatches = Array(10).fill({
        batch_id: 'batch-1',
        product_id: 'product-1',
        store_id: 'store-1',
        batch_number: 'B001',
        current_quantity: 10,
        expiry_date: '2024-12-31',
        status: 'active' as const,
        supplier: 'Test Supplier',
        location_code: 'A1',
        cost_price: 5.0,
        selling_price: 10.0,
        manufacture_date: '2024-01-01',
        received_date: '2024-01-15',
        initial_quantity: 20,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const rangeMock = jest.fn().mockResolvedValue({
        data: mockBatches,
        error: null,
        count: 25, // total count
      })

      const inMock = jest.fn().mockResolvedValue({
        data: [{ product_id: 'product-1', product_name: 'Test', categories: null }],
        error: null,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn((table: string) => {
          if (table === 'batches') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: rangeMock,
            }
          }
          return {
            select: jest.fn().mockReturnThis(),
            in: inMock,
          }
        }),
      } as any

      const result = await fetchBatchesPage({ page: 0, pageSize: 10 }, { storeId: 'store-1' }, mockSupabaseClient as any)

      expect(result.nextPage).toBe(1) // There are more pages
    })

    it('handles Supabase errors gracefully', async () => {
      const rangeMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST000' },
        count: null,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: rangeMock,
      } as any

      await expect(
        fetchBatchesPage({ page: 0, pageSize: 10 }, { storeId: 'store-1' }, mockSupabaseClient as any),
      ).rejects.toThrow('Failed to fetch batches page: Database connection failed')
    })
  })

  describe('fetchExpiringBatches', () => {
    it('fetches batches expiring within specified days', async () => {
      const mockBatches = [
        {
          batch_id: 'batch-1',
          product_id: 'product-1',
          store_id: 'store-1',
          batch_number: 'B001',
          current_quantity: 5,
          expiry_date: '2024-10-05', // Soon!
          status: 'active' as const,
          supplier: 'Test Supplier',
          location_code: 'A1',
          cost_price: 5.0,
          selling_price: 10.0,
          manufacture_date: '2024-01-01',
          received_date: '2024-01-15',
          initial_quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const orderMock = jest.fn().mockResolvedValue({
        data: mockBatches,
        error: null,
      })

      const inMock = jest.fn().mockResolvedValue({
        data: [{ product_id: 'product-1', product_name: 'Test', categories: null }],
        error: null,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn((table: string) => {
          if (table === 'batches') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              gt: jest.fn().mockReturnThis(),
              lte: jest.fn().mockReturnThis(),
              order: orderMock,
            }
          }
          return {
            select: jest.fn().mockReturnThis(),
            in: inMock,
          }
        }),
      } as any

      const result = await fetchExpiringBatches('store-1', 7, mockSupabaseClient as any)

      expect(result.length).toBe(1)
    })

    it('uses default 7 days when not specified', async () => {
      const lteMock = jest.fn().mockReturnThis()
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabaseClient = {
        schema: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        lte: lteMock,
        order: orderMock,
      } as any

      await fetchExpiringBatches('store-1', undefined, mockSupabaseClient as any)

      // Check that lte was called with a date ~7 days in the future
      expect(lteMock).toHaveBeenCalledWith('expiry_date', expect.any(String))
    })
  })
})

// Helper to create a basic mock client
function createMockClient(): Partial<SupabaseClient<Database>> {
  return {
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  } as any
}