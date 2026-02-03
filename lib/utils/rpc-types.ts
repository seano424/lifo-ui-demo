/**
 * Type assertion helpers for Supabase RPC function results
 *
 * Supabase RPC functions return JSONB data typed as `Json` (a union of primitives and objects).
 * We need to assert these to our specific types. The double cast (`as unknown as T`) is intentional
 * and necessary because TypeScript's type system cannot verify that the database JSONB matches our types.
 *
 * This is safer than direct type assertions because:
 * 1. It's explicit that we're doing a conversion
 * 2. The function name makes it clear this is for RPC results
 * 3. It's centralized so we can add runtime validation later if needed
 */

/**
 * Assert that an RPC result matches the expected type.
 * Use this for RPC functions that return JSONB data.
 *
 * @param data - The data returned from the Supabase RPC call
 * @returns The data typed as T
 *
 * @example
 * const result = assertRpcResult<DraftBatchesSummary>(data)
 */
export function assertRpcResult<T>(data: unknown): T {
  return data as T
}

/**
 * Assert that an RPC array result matches the expected type.
 * Use this for RPC functions that return JSONB arrays.
 *
 * @param data - The data returned from the Supabase RPC call
 * @returns The data typed as T[]
 *
 * @example
 * const results = assertRpcArray<ProductWithDraftBatches>(data)
 */
export function assertRpcArray<T>(data: unknown): T[] {
  return (data || []) as T[]
}
