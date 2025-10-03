import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Mock Supabase client for testing
 * This creates a minimal mock that you can extend in your tests
 */
export function createMockSupabaseClient() {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    schema: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  }

  return mockClient as typeof mockClient & Partial<SupabaseClient<Database>>
}

/**
 * Mock the Supabase client module
 * Call this at the top of test files that import createClient
 */
export function mockSupabaseClient() {
  jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => createMockSupabaseClient()),
  }))
}

/**
 * Helper to mock successful Supabase responses
 */
export function mockSupabaseSuccess<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  }
}

/**
 * Helper to mock Supabase errors
 */
export function mockSupabaseError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || 'PGRST000',
      details: '',
      hint: '',
    },
    count: null,
    status: 400,
    statusText: 'Bad Request',
  }
}
