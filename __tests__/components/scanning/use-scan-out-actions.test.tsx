/**
 * Tests for scan-out actions hook
 *
 * These tests demonstrate:
 * - Testing React Query hooks with renderHook
 * - Testing React Query mutations
 * - Mocking Supabase RPC calls
 * - Testing pure logic functions from hooks
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useScanOutActions } from '@/components/scanning/scan-out/use-scan-out-actions'
import { createWrapper } from '@/__tests__/setup/test-utils'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client')

const mockSupabase = {
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('useScanOutActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('matchBatchByExpiry', () => {
    it('finds exact expiry date match', () => {
      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = [
        {
          batch_id: '1',
          batch_number: 'B001',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-12-31',
          current_quantity: 10,
          available_quantity: 10,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A1',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
        {
          batch_id: '2',
          batch_number: 'B002',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-11-15',
          current_quantity: 5,
          available_quantity: 5,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A2',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
      ]

      const matched = result.current.matchBatchByExpiry(batches, '2024-11-15')

      expect(matched).not.toBeNull()
      expect(matched?.batch_id).toBe('2')
      expect(matched?.expiry_date).toBe('2024-11-15')
    })

    it('finds closest match within 7 days when no exact match', () => {
      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = [
        {
          batch_id: '1',
          batch_number: 'B001',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-12-31',
          current_quantity: 10,
          available_quantity: 10,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A1',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
        {
          batch_id: '2',
          batch_number: 'B002',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-12-05', // 3 days away from search
          current_quantity: 5,
          available_quantity: 5,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A2',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
      ]

      const matched = result.current.matchBatchByExpiry(batches, '2024-12-08')

      expect(matched).not.toBeNull()
      expect(matched?.batch_id).toBe('2')
    })

    it('returns null when no batches within 7 day tolerance', () => {
      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = [
        {
          batch_id: '1',
          batch_number: 'B001',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-12-31',
          current_quantity: 10,
          available_quantity: 10,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A1',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
      ]

      // Searching for a date 30 days away - should be outside tolerance
      const matched = result.current.matchBatchByExpiry(batches, '2024-11-01')

      expect(matched).toBeNull()
    })

    it('returns null for empty batch array', () => {
      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const matched = result.current.matchBatchByExpiry([], '2024-12-31')

      expect(matched).toBeNull()
    })

    it('returns null for invalid date format', () => {
      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = [
        {
          batch_id: '1',
          batch_number: 'B001',
          product_id: 'p1',
          store_id: 's1',
          expiry_date: '2024-12-31',
          current_quantity: 10,
          available_quantity: 10,
          cost_price: 5,
          selling_price: 10,
          location_code: 'A1',
          status: 'active',
          created_at: '2024-01-01',
          products: {
            product_name: 'Test Product',
            brand_name: 'Test Brand',
            barcode: '123456',
          },
        },
      ]

      const matched = result.current.matchBatchByExpiry(batches, 'invalid-date')

      expect(matched).toBeNull()
    })
  })

  describe('findAvailableBatches', () => {
    it('fetches and transforms batches from RPC call', async () => {
      const mockRPCResponse = [
        {
          batch_id: 'batch-1',
          batch_number: 'B001',
          product_id: 'product-1',
          store_id: 'store-1',
          expiry_date: '2024-12-31',
          current_quantity: 10,
          available_quantity: 8,
          cost_price: 5.0,
          selling_price: 10.0,
          location_code: 'A1',
          status: 'active',
          created_at: '2024-01-01',
          product_name: 'Apple Juice',
          brand_name: 'Fresh Co',
          product_barcode: '123456789',
          category_name: 'Beverages',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockRPCResponse,
        error: null,
      })

      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = await result.current.findAvailableBatches('123456789', 'store-1')

      expect(batches).toHaveLength(1)
      expect(batches[0].batch_id).toBe('batch-1')
      expect(batches[0].products.product_name).toBe('Apple Juice')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_available_batches_by_barcode', {
        barcode_param: '123456789',
        store_id_param: 'store-1',
      })
    })

    it('returns empty array when no batches found', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      const batches = await result.current.findAvailableBatches('999999', 'store-1')

      expect(batches).toHaveLength(0)
    })

    it('throws error when RPC call fails', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.findAvailableBatches('123456', 'store-1')).rejects.toThrow(
        'Failed to fetch available inventory',
      )
    })
  })

  describe('checkoutMutation', () => {
    it('processes checkout successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      })

      mockSupabase.rpc
        .mockResolvedValueOnce({
          // check_store_access
          data: [{ user_id: 'user-1', role_in_store: 'owner', is_active: true }],
          error: null,
        })
        .mockResolvedValueOnce({
          // update_batch_quantity
          data: [{ success: true, new_quantity: 5, error_message: null }],
          error: null,
        })

      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      result.current.submitCheckout([
        {
          batchId: 'batch-1',
          quantityRemoved: 5,
          reason: 'sale',
          storeId: 'store-1',
        },
      ])

      await waitFor(() => expect(result.current.isSubmittingCheckout).toBe(false))

      expect(result.current.checkoutResult).toBeDefined()
      expect(result.current.checkoutResult?.success).toBe(true)
      expect(result.current.checkoutResult?.successCount).toBe(1)
    })

    it('handles authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const { result } = renderHook(() => useScanOutActions(), {
        wrapper: createWrapper(),
      })

      result.current.submitCheckout([
        {
          batchId: 'batch-1',
          quantityRemoved: 5,
          reason: 'sale',
          storeId: 'store-1',
        },
      ])

      await waitFor(() => expect(result.current.isSubmittingCheckout).toBe(false))

      expect(result.current.checkoutError).toBeDefined()
      expect(result.current.checkoutError?.message).toContain('not authenticated')
    })
  })
})