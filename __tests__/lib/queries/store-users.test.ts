/**
 * Tests for store-users query functions
 *
 * Tests the new RPC-based implementation for removeUserFromStore
 * that uses the SECURITY DEFINER function to bypass RLS restrictions
 */

import { removeUserFromStore } from '@/lib/queries/store-users'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client')

// Mock the logger to avoid console output in tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('removeUserFromStore', () => {
  let mockRpc: jest.Mock
  let mockSupabaseClient: ReturnType<typeof createClient>

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock RPC function
    mockRpc = jest.fn()

    // Mock Supabase client
    mockSupabaseClient = {
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createClient>

    mockCreateClient.mockReturnValue(mockSupabaseClient)
  })

  it('calls remove_user_from_store RPC with correct parameters', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, message: 'User removed successfully' },
      error: null,
    })

    await removeUserFromStore('store-123', 'user-456')

    expect(mockRpc).toHaveBeenCalledWith('remove_user_from_store', {
      p_store_id: 'store-123',
      p_target_user_id: 'user-456',
    })
  })

  it('successfully removes user when RPC returns success', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        message: 'User removed successfully',
        removed_user_id: 'user-456',
        removed_user_role: 'staff',
        removed_by: 'admin-123',
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'user-456')).resolves.not.toThrow()
  })

  it('throws error when RPC returns Supabase error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'RPC function not found',
        code: '42883',
        details: 'Function remove_user_from_store does not exist',
        hint: 'Check function name',
      },
    })

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow(
      'Failed to remove user from store: RPC function not found',
    )
  })

  it('throws error when RPC returns success: false (permission denied)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'Insufficient permissions to manage this user',
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow(
      'Insufficient permissions to manage this user',
    )
  })

  it('throws error when RPC returns success: false (user not found)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'User not found in store',
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow(
      'User not found in store',
    )
  })

  it('throws error when RPC returns success: false (cannot remove owner)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'Cannot remove the store owner',
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'owner-123')).rejects.toThrow(
      'Cannot remove the store owner',
    )
  })

  it('throws error when RPC returns success: false (self-removal)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'Cannot remove yourself from the store',
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow(
      'Cannot remove yourself from the store',
    )
  })

  it('handles unexpected errors gracefully', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'))

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow('Network error')
  })

  it('throws generic error when RPC returns success: false without error message', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
      },
      error: null,
    })

    await expect(removeUserFromStore('store-123', 'user-456')).rejects.toThrow(
      'Failed to remove user from store',
    )
  })
})
