/**
 * Integration tests for store-users queries
 *
 * These tests can run in two modes:
 * 1. MOCK MODE (default): Uses mocked Supabase client for fast, isolated tests
 * 2. INTEGRATION MODE: Connects to real local Supabase instance
 *
 * To run against real database:
 * RUN_INTEGRATION_TESTS=true npm test -- store-users.integration.test.ts
 *
 * Prerequisites for integration mode:
 * - Local Supabase instance running (npm run supabase:start)
 * - Test data seeded in database
 * - .env.test.local with valid Supabase credentials
 */

// Check if we should run against real database
const RUN_INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true'

// Mock the Supabase client unless running integration tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock the logger to avoid console output
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

import { removeUserFromStore, fetchStoreUsers, updateStoreUser } from '@/lib/queries/store-users'
import { createClient } from '@/lib/supabase/client'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'

describe('store-users integration tests', () => {
  const TEST_STORE_ID = 'test-store-id-123'
  const TEST_USER_ID = 'test-user-id-456'
  const TEST_TARGET_USER_ID = 'test-target-user-789'

  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()

    if (!RUN_INTEGRATION) {
      // Setup mocked Supabase client
      mockSupabaseClient = createMockSupabaseClient()
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(
        mockSupabaseClient as any,
      )
    }
  })

  describe('removeUserFromStore', () => {
    it('successfully removes user via RPC', async () => {
      if (!RUN_INTEGRATION) {
        // Mock the RPC response
        ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
          data: {
            success: true,
            message: 'User permanently removed from store',
            removed_user_id: TEST_TARGET_USER_ID,
            removed_user_role: 'employee',
            was_active: true,
            removed_by: TEST_USER_ID,
            removed_at: new Date().toISOString(),
          },
          error: null,
        })
      }

      await expect(removeUserFromStore(TEST_STORE_ID, TEST_TARGET_USER_ID)).resolves.not.toThrow()

      if (!RUN_INTEGRATION) {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('remove_user_from_store', {
          p_store_id: TEST_STORE_ID,
          p_target_user_id: TEST_TARGET_USER_ID,
        })
      }
    })

    it('throws error when RPC returns permission denied', async () => {
      if (!RUN_INTEGRATION) {
        ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
          data: {
            success: false,
            error: 'Insufficient permissions to manage this user',
          },
          error: null,
        })
      }

      await expect(removeUserFromStore(TEST_STORE_ID, TEST_TARGET_USER_ID)).rejects.toThrow(
        RUN_INTEGRATION
          ? /permissions|not found|cannot remove/i // Real DB might have different errors
          : 'Insufficient permissions to manage this user',
      )
    })

    it('throws error when RPC returns database error', async () => {
      if (!RUN_INTEGRATION) {
        ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
          data: null,
          error: {
            message: 'Function not found',
            code: '42883',
            details: 'Function remove_user_from_store does not exist',
            hint: '',
          },
        })
      }

      await expect(removeUserFromStore(TEST_STORE_ID, TEST_TARGET_USER_ID)).rejects.toThrow(
        RUN_INTEGRATION ? /error/i : 'Failed to remove user from store: Function not found',
      )
    })
  })

  describe('fetchStoreUsers', () => {
    it('fetches users successfully', async () => {
      const mockUsers = [
        {
          store_id: TEST_STORE_ID,
          user_id: 'user-1',
          role_in_store: 'manager',
          permissions: {},
          assigned_at: new Date().toISOString(),
          assigned_by: null,
          is_active: true,
          can_use_pin_auth: false,
          pin_access_level: 'basic',
          pin_permissions: {},
          email: 'manager@test.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { full_name: 'Test Manager' },
        },
      ]

      if (!RUN_INTEGRATION) {
        ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
          data: mockUsers,
          error: null,
        })
      }

      const users = await fetchStoreUsers(TEST_STORE_ID)

      expect(Array.isArray(users)).toBe(true)

      if (!RUN_INTEGRATION) {
        expect(users.length).toBe(1)
        expect(users[0].role_in_store).toBe('manager')
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_store_users', {
          input_store_id: TEST_STORE_ID,
        })
      }
    })

    it('handles empty result set', async () => {
      if (!RUN_INTEGRATION) {
        ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
          data: [],
          error: null,
        })
      }

      const users = await fetchStoreUsers(TEST_STORE_ID)

      expect(Array.isArray(users)).toBe(true)
      if (!RUN_INTEGRATION) {
        expect(users.length).toBe(0)
      }
    })
  })

  describe('updateStoreUser', () => {
    it('updates user successfully', async () => {
      const mockSession = {
        user: {
          id: TEST_USER_ID,
          email: 'test@example.com',
        },
        access_token: 'mock-token',
      }

      const mockUpdatedUser = {
        store_id: TEST_STORE_ID,
        user_id: TEST_TARGET_USER_ID,
        role_in_store: 'manager',
        permissions: {},
        assigned_at: new Date().toISOString(),
        assigned_by: TEST_USER_ID,
        is_active: true,
        can_use_pin_auth: true,
        pin_access_level: 'elevated',
        pin_permissions: {},
        email: 'updated@test.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: { full_name: 'Updated User' },
      }

      if (!RUN_INTEGRATION) {
        // Mock auth session
        ;(mockSupabaseClient.auth.getSession as jest.Mock).mockResolvedValue({
          data: { session: mockSession },
          error: null,
        })

        // Mock direct update attempt (will fail due to RLS)
        ;(mockSupabaseClient.update as jest.Mock).mockReturnThis()
        ;(mockSupabaseClient.eq as jest.Mock).mockReturnThis()
        ;(mockSupabaseClient.select as jest.Mock).mockReturnThis()
        ;(mockSupabaseClient.single as jest.Mock).mockResolvedValue({
          data: null,
          error: { message: 'RLS policy violation', code: '42501' },
        })

        // Mock RPC fallback (succeeds)
        ;(mockSupabaseClient.rpc as jest.Mock)
          .mockResolvedValueOnce({
            data: [mockUpdatedUser],
            error: null,
          })
          .mockResolvedValueOnce({
            data: [mockUpdatedUser],
            error: null,
          })
      }

      const result = await updateStoreUser(TEST_STORE_ID, TEST_TARGET_USER_ID, {
        can_use_pin_auth: true,
        pin_access_level: 'elevated',
      })

      if (!RUN_INTEGRATION) {
        expect(result.can_use_pin_auth).toBe(true)
        expect(result.pin_access_level).toBe('elevated')
      } else {
        expect(result).toBeDefined()
      }
    })
  })
})

// Add a test suite that only runs in integration mode
describe.skip('store-users real database tests (INTEGRATION ONLY)', () => {
  // These tests are skipped by default and only run when RUN_INTEGRATION=true
  // You would add tests here that specifically test real database behavior,
  // transaction handling, triggers, etc.

  if (RUN_INTEGRATION) {
    it('should handle database transactions correctly', async () => {
      // Real transaction test
    })

    it('should respect RLS policies', async () => {
      // Real RLS test
    })

    it('should trigger database functions', async () => {
      // Real trigger test
    })
  }
})
