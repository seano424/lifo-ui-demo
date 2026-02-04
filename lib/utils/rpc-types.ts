import { logger } from './logger'
import { z } from 'zod'

/**
 * Type assertion helpers for Supabase RPC function results
 *
 * Supabase RPC functions return JSONB data typed as `Json` (a union of primitives and objects).
 * We need to assert these to our specific types. The double cast (`as unknown as T`) is intentional
 * and necessary because TypeScript's type system cannot verify that the database JSONB matches our types.
 *
 * This module provides both basic type assertions and runtime-validated versions:
 * 1. assertRpcResult/assertRpcArray - Basic type assertions (backward compatible)
 * 2. validateRpcResult/validateRpcArray - Runtime validation with Zod schemas
 * 3. safeValidateRpcResult/safeValidateRpcArray - Non-throwing validation
 */

// ============================================
// Basic Type Assertions (Backward Compatible)
// ============================================

/**
 * Assert that an RPC result matches the expected type.
 * Use this for RPC functions that return JSONB data.
 *
 * **Note:** This does NOT perform runtime validation. For validated results,
 * use `validateRpcResult` or `safeValidateRpcResult`.
 *
 * @param data - The data returned from the Supabase RPC call
 * @returns The data typed as T
 *
 * @example
 * const result = assertRpcResult<DraftBatchesSummary>(data)
 */
export function assertRpcResult<T>(data: unknown): T {
  // Add basic null/undefined check for better error messages
  if (data === null || data === undefined) {
    throw new Error('RPC result is null or undefined')
  }

  // Validate it's an object (most RPC results are objects)
  if (typeof data !== 'object') {
    logger.warn('rpc-types', 'RPC result is not an object', {
      type: typeof data,
      data,
    })
  }

  return data as T
}

/**
 * Assert that an RPC array result matches the expected type.
 * Use this for RPC functions that return JSONB arrays.
 *
 * **Note:** This does NOT perform runtime validation. For validated results,
 * use `validateRpcArray` or `safeValidateRpcArray`.
 *
 * @param data - The data returned from the Supabase RPC call
 * @returns The data typed as T[]
 *
 * @example
 * const results = assertRpcArray<ProductWithDraftBatches>(data)
 */
export function assertRpcArray<T>(data: unknown): T[] {
  // Return empty array for null/undefined
  if (data === null || data === undefined) {
    return []
  }

  // Validate it's actually an array
  if (!Array.isArray(data)) {
    logger.warn('rpc-types', 'RPC result is not an array, coercing to empty array', {
      type: typeof data,
      data,
    })
    return []
  }

  return data as T[]
}

// ============================================
// Runtime Validation with Zod (Recommended)
// ============================================

/**
 * Validate RPC result with runtime Zod schema validation.
 * Throws an error if validation fails.
 *
 * @param data - The data returned from the Supabase RPC call
 * @param schema - Zod schema to validate against
 * @param context - Optional context for error logging
 * @returns The validated and typed data
 *
 * @example
 * const schema = z.object({
 *   success: z.boolean(),
 *   total_count: z.number(),
 * })
 * const result = validateRpcResult(data, schema, 'fetchBatchSummary')
 */
export function validateRpcResult<T>(data: unknown, schema: z.ZodSchema<T>, context?: string): T {
  try {
    return schema.parse(data)
  } catch (error) {
    logger.error('rpc-types', 'RPC validation failed', {
      context,
      error: error instanceof z.ZodError ? error.errors : error,
      data,
    })
    throw new Error(
      `RPC result validation failed${context ? ` (${context})` : ''}: ${
        error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : String(error)
      }`,
    )
  }
}

/**
 * Validate RPC array result with runtime Zod schema validation.
 * Throws an error if validation fails.
 *
 * @param data - The data returned from the Supabase RPC call
 * @param itemSchema - Zod schema for array items
 * @param context - Optional context for error logging
 * @returns The validated and typed array
 *
 * @example
 * const itemSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 * })
 * const results = validateRpcArray(data, itemSchema, 'fetchProducts')
 */
export function validateRpcArray<T>(
  data: unknown,
  itemSchema: z.ZodSchema<T>,
  context?: string,
): T[] {
  const arraySchema = z.array(itemSchema)
  return validateRpcResult(data, arraySchema, context)
}

// ============================================
// Safe Validation (Non-Throwing)
// ============================================

export interface ValidationSuccess<T> {
  success: true
  data: T
}

export interface ValidationFailure {
  success: false
  error: string
  errors?: z.ZodError['errors']
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

/**
 * Safely validate RPC result with runtime Zod schema validation.
 * Returns a result object instead of throwing.
 *
 * @param data - The data returned from the Supabase RPC call
 * @param schema - Zod schema to validate against
 * @param context - Optional context for error logging
 * @returns Validation result with success flag
 *
 * @example
 * const schema = z.object({ success: z.boolean() })
 * const result = safeValidateRpcResult(data, schema)
 * if (result.success) {
 *   console.log(result.data.success)
 * } else {
 *   console.error(result.error)
 * }
 */
export function safeValidateRpcResult<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context?: string,
): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  logger.warn('rpc-types', 'RPC validation failed (safe)', {
    context,
    errors: result.error.errors,
    data,
  })

  return {
    success: false,
    error: result.error.errors.map(e => e.message).join(', '),
    errors: result.error.errors,
  }
}

/**
 * Safely validate RPC array result with runtime Zod schema validation.
 * Returns a result object instead of throwing.
 *
 * @param data - The data returned from the Supabase RPC call
 * @param itemSchema - Zod schema for array items
 * @param context - Optional context for error logging
 * @returns Validation result with success flag
 *
 * @example
 * const itemSchema = z.object({ id: z.string() })
 * const result = safeValidateRpcArray(data, itemSchema)
 * if (result.success) {
 *   result.data.forEach(item => console.log(item.id))
 * }
 */
export function safeValidateRpcArray<T>(
  data: unknown,
  itemSchema: z.ZodSchema<T>,
  context?: string,
): ValidationResult<T[]> {
  const arraySchema = z.array(itemSchema)
  return safeValidateRpcResult(data, arraySchema, context)
}

// ============================================
// Helper Functions for Common Patterns
// ============================================

/**
 * Create a validated RPC wrapper that automatically validates results.
 * Useful for creating type-safe RPC callers with minimal boilerplate.
 *
 * @param schema - Zod schema to validate RPC results
 * @param context - Context for error logging
 * @returns Function that wraps RPC result with validation
 *
 * @example
 * const getBatchSummary = createValidatedRpc(
 *   z.object({ total_count: z.number() }),
 *   'getBatchSummary'
 * )
 *
 * const { data, error } = await supabase.rpc('get_batch_summary')
 * const result = getBatchSummary(data) // Validated!
 */
export function createValidatedRpc<T>(schema: z.ZodSchema<T>, context: string) {
  return (data: unknown): T => validateRpcResult(data, schema, context)
}

/**
 * Create a validated RPC array wrapper.
 *
 * @param itemSchema - Zod schema for array items
 * @param context - Context for error logging
 * @returns Function that wraps RPC array result with validation
 */
export function createValidatedRpcArray<T>(itemSchema: z.ZodSchema<T>, context: string) {
  return (data: unknown): T[] => validateRpcArray(data, itemSchema, context)
}
