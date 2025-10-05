/**
 * Tests for useStoreUsers hooks
 *
 * This hook has several parts we need to test:
 * 1. useStoreUsers - infinite query for listing users
 * 2. useStoreUser - single user query
 * 3. useStoreUserActions - mutations (add, update, remove)
 * 4. Convenience hooks (useStoreOwners, useStoreManagers, etc.)
 *
 * Testing Strategy:
 * - Mock the query functions from lib/queries/store-users
 * - Mock the store context (activeStoreId)
 * - Test loading states, data fetching, mutations
 * - Test optimistic updates and error rollback
 */

import { renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import {
  useStoreUsers,
  useStoreUser,
  useStoreUserActions,
  useStoreOwners,
  useStoreManagers,
  useStoreEmployees,
} from '@/hooks/use-store-users'
import { createWrapper } from '@/__tests__/setup/test-utils'
import * as storeUsersQueries from '@/lib/queries/store-users'
import * as storeContext from '@/lib/stores/store-context'

// Mock the toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

// Mock the query functions
jest.mock('@/lib/queries/store-users')

// Mock the store context
jest.mock('@/lib/stores/store-context')

const mockFetchStoreUsersPage = storeUsersQueries.fetchStoreUsersPage as jest.Mock
const mockFetchStoreUserById = storeUsersQueries.fetchStoreUserById as jest.Mock
const mockUpdateStoreUser = storeUsersQueries.updateStoreUser as jest.Mock
const mockRemoveUserFromStore = storeUsersQueries.removeUserFromStore as jest.Mock
const mockAddUserToStore = storeUsersQueries.addUserToStore as jest.Mock
const mockUseActiveStoreId = storeContext.useActiveStoreId as jest.Mock

describe('useStoreUsers hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: user has an active store
    mockUseActiveStoreId.mockReturnValue('store-123')
  })

  describe('useStoreUsers', () => {
    it('fetches store users successfully', async () => {
      const mockUsers = [
        {
          user_id: 'user-1',
          store_id: 'store-123',
          role_in_store: 'manager',
          is_active: true,
        },
        {
          user_id: 'user-2',
          store_id: 'store-123',
          role_in_store: 'employee',
          is_active: true,
        },
      ]

      mockFetchStoreUsersPage.mockResolvedValue({
        data: mockUsers,
        count: 2,
        nextPage: undefined,
      })

      const { result } = renderHook(() => useStoreUsers(), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toHaveLength(2)
      expect(result.current.count).toBe(2)
      expect(result.current.hasMore).toBe(false)
      expect(mockFetchStoreUsersPage).toHaveBeenCalledWith(
        'store-123',
        { page: 0, pageSize: 20 },
        {},
      )
    })

    it('applies filters correctly', async () => {
      mockFetchStoreUsersPage.mockResolvedValue({
        data: [{ user_id: 'owner-1', role_in_store: 'owner' }],
        count: 1,
        nextPage: undefined,
      })

      const filters = { role_in_store: 'owner' as const }

      renderHook(() => useStoreUsers(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockFetchStoreUsersPage).toHaveBeenCalledWith(
          'store-123',
          { page: 0, pageSize: 20 },
          filters,
        )
      })
    })

    it('disables query when no active store', async () => {
      mockUseActiveStoreId.mockReturnValue(null)

      const { result } = renderHook(() => useStoreUsers(), {
        wrapper: createWrapper(),
      })

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toEqual([])
      expect(mockFetchStoreUsersPage).not.toHaveBeenCalled()
    })

    it('handles pagination with nextPage', async () => {
      const firstPageUsers = [{ user_id: 'user-1', role_in_store: 'employee' }]
      const secondPageUsers = [{ user_id: 'user-2', role_in_store: 'employee' }]

      // First page has nextPage
      mockFetchStoreUsersPage
        .mockResolvedValueOnce({
          data: firstPageUsers,
          count: 2,
          nextPage: 1,
        })
        .mockResolvedValueOnce({
          data: secondPageUsers,
          count: 2,
          nextPage: undefined,
        })

      const { result } = renderHook(() => useStoreUsers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.hasMore).toBe(true)
      expect(result.current.data).toHaveLength(1)

      // Fetch next page
      result.current.fetchNextPage()

      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))

      expect(result.current.data).toHaveLength(2)
      expect(result.current.hasMore).toBe(false)
    })

    it('handles fetch errors', async () => {
      mockFetchStoreUsersPage.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useStoreUsers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
      expect(result.current.data).toEqual([])
    })
  })

  describe('useStoreUser', () => {
    it('fetches single user successfully', async () => {
      const mockUser = {
        user_id: 'user-1',
        store_id: 'store-123',
        role_in_store: 'manager',
        is_active: true,
      }

      mockFetchStoreUserById.mockResolvedValue(mockUser)

      const { result } = renderHook(() => useStoreUser('user-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toEqual(mockUser)
      expect(mockFetchStoreUserById).toHaveBeenCalledWith('store-123', 'user-1')
    })

    it('disables query when no userId provided', async () => {
      const { result } = renderHook(() => useStoreUser(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockFetchStoreUserById).not.toHaveBeenCalled()
    })

    it('disables query when no active store', async () => {
      mockUseActiveStoreId.mockReturnValue(null)

      const { result } = renderHook(() => useStoreUser('user-1'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockFetchStoreUserById).not.toHaveBeenCalled()
    })
  })

  describe('useStoreOwners', () => {
    it('fetches only owners', async () => {
      // useStoreOwners uses client-side filtering, so it fetches all users
      mockFetchStoreUsersPage.mockResolvedValue({
        data: [
          { user_id: 'owner-1', role_in_store: 'owner' },
          { user_id: 'manager-1', role_in_store: 'manager' },
        ],
        count: 2,
        nextPage: undefined,
      })

      const { result } = renderHook(() => useStoreOwners(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockFetchStoreUsersPage).toHaveBeenCalledWith(
          'store-123',
          { page: 0, pageSize: 100 },
          {},
        )
      })

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Client-side filtering should only return owners
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].role_in_store).toBe('owner')
    })
  })

  describe('useStoreManagers', () => {
    it('fetches only managers', async () => {
      // useStoreManagers uses client-side filtering, so it fetches all users
      mockFetchStoreUsersPage.mockResolvedValue({
        data: [
          { user_id: 'manager-1', role_in_store: 'manager' },
          { user_id: 'employee-1', role_in_store: 'employee' },
        ],
        count: 2,
        nextPage: undefined,
      })

      const { result } = renderHook(() => useStoreManagers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockFetchStoreUsersPage).toHaveBeenCalledWith(
          'store-123',
          { page: 0, pageSize: 100 },
          {},
        )
      })

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Client-side filtering should only return managers
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].role_in_store).toBe('manager')
    })
  })

  describe('useStoreEmployees', () => {
    it('fetches only employees', async () => {
      // useStoreEmployees uses client-side filtering, so it fetches all users
      mockFetchStoreUsersPage.mockResolvedValue({
        data: [
          { user_id: 'employee-1', role_in_store: 'employee' },
          { user_id: 'owner-1', role_in_store: 'owner' },
        ],
        count: 2,
        nextPage: undefined,
      })

      const { result } = renderHook(() => useStoreEmployees(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockFetchStoreUsersPage).toHaveBeenCalledWith(
          'store-123',
          { page: 0, pageSize: 100 },
          {},
        )
      })

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Client-side filtering should only return employees
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].role_in_store).toBe('employee')
    })
  })

  describe('useStoreUserActions', () => {
    describe('updateStoreUser', () => {
      it('updates user successfully', async () => {
        const updatedUser = {
          user_id: 'user-1',
          store_id: 'store-123',
          role_in_store: 'manager',
          is_active: true,
        }

        mockUpdateStoreUser.mockResolvedValue(updatedUser)

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.updateStoreUser({
          userId: 'user-1',
          updates: { role_in_store: 'manager' },
        })

        await waitFor(() => expect(result.current.isUpdating).toBe(false))

        expect(mockUpdateStoreUser).toHaveBeenCalledWith('store-123', 'user-1', {
          role_in_store: 'manager',
        })
        expect(toast.success).toHaveBeenCalledWith('User updated successfully')
      })

      it('handles update errors', async () => {
        mockUpdateStoreUser.mockRejectedValue(new Error('Update failed'))

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.updateStoreUser({
          userId: 'user-1',
          updates: { role_in_store: 'manager' },
        })

        await waitFor(() => expect(result.current.isUpdating).toBe(false))

        expect(toast.error).toHaveBeenCalledWith('Failed to update user: Update failed')
      })

      it('uses convenience method changeUserRole', async () => {
        mockUpdateStoreUser.mockResolvedValue({})

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.changeUserRole('user-1', 'owner')

        await waitFor(() => expect(result.current.isUpdating).toBe(false))

        expect(mockUpdateStoreUser).toHaveBeenCalledWith('store-123', 'user-1', {
          role_in_store: 'owner',
        })
      })

      it('uses convenience method toggleUserActiveStatus', async () => {
        mockUpdateStoreUser.mockResolvedValue({})

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.toggleUserActiveStatus('user-1', false)

        await waitFor(() => expect(result.current.isUpdating).toBe(false))

        expect(mockUpdateStoreUser).toHaveBeenCalledWith('store-123', 'user-1', {
          is_active: false,
        })
      })

      it('uses convenience method enablePinAuth', async () => {
        mockUpdateStoreUser.mockResolvedValue({})

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.enablePinAuth('user-1', true)

        await waitFor(() => expect(result.current.isUpdating).toBe(false))

        expect(mockUpdateStoreUser).toHaveBeenCalledWith('store-123', 'user-1', {
          can_use_pin_auth: true,
        })
      })
    })

    describe('addUserToStore', () => {
      it('adds user successfully', async () => {
        const newUser = {
          user_id: 'user-2',
          store_id: 'store-123',
          role_in_store: 'employee',
        }

        mockAddUserToStore.mockResolvedValue(newUser)

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.addUser('user-2', 'employee')

        await waitFor(() => expect(result.current.isAdding).toBe(false))

        expect(mockAddUserToStore).toHaveBeenCalledWith(
          'store-123',
          'user-2',
          'employee',
          undefined,
        )
        expect(toast.success).toHaveBeenCalledWith('User added to store successfully')
      })

      it('handles add user errors', async () => {
        mockAddUserToStore.mockRejectedValue(new Error('User already exists'))

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.addUser('user-2', 'employee')

        await waitFor(() => expect(result.current.isAdding).toBe(false))

        expect(toast.error).toHaveBeenCalledWith('Failed to add user to store: User already exists')
      })
    })

    describe('removeUserFromStore', () => {
      it('removes user successfully', async () => {
        mockRemoveUserFromStore.mockResolvedValue(undefined)

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.removeUser('user-1')

        await waitFor(() => expect(result.current.isRemoving).toBe(false))

        expect(mockRemoveUserFromStore).toHaveBeenCalledWith('store-123', 'user-1')
        expect(toast.success).toHaveBeenCalledWith('User removed from store')
      })

      it('handles remove user errors', async () => {
        mockRemoveUserFromStore.mockRejectedValue(new Error('Cannot remove owner'))

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.removeUser('user-1')

        await waitFor(() => expect(result.current.isRemoving).toBe(false))

        expect(toast.error).toHaveBeenCalledWith('Failed to remove user: Cannot remove owner')
      })

      it('handles RPC permission errors', async () => {
        mockRemoveUserFromStore.mockRejectedValue(
          new Error('Insufficient permissions to manage this user'),
        )

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.removeUser('user-1')

        await waitFor(() => expect(result.current.isRemoving).toBe(false))

        expect(toast.error).toHaveBeenCalledWith(
          'Failed to remove user: Insufficient permissions to manage this user',
        )
      })

      it('handles RPC user not found errors', async () => {
        mockRemoveUserFromStore.mockRejectedValue(new Error('User not found in store'))

        const { result } = renderHook(() => useStoreUserActions(), {
          wrapper: createWrapper(),
        })

        result.current.removeUser('user-1')

        await waitFor(() => expect(result.current.isRemoving).toBe(false))

        expect(toast.error).toHaveBeenCalledWith('Failed to remove user: User not found in store')
      })
    })

    it('throws error when no active store for mutations', async () => {
      mockUseActiveStoreId.mockReturnValue(null)

      const { result } = renderHook(() => useStoreUserActions(), {
        wrapper: createWrapper(),
      })

      result.current.addUser('user-2', 'employee')

      await waitFor(() => expect(result.current.isAdding).toBe(false))

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Store ID is required'))
    })

    it('returns current storeId', () => {
      const { result } = renderHook(() => useStoreUserActions(), {
        wrapper: createWrapper(),
      })

      expect(result.current.storeId).toBe('store-123')
    })
  })
})
