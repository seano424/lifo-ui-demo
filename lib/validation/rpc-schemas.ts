/**
 * Zod schemas for Supabase RPC function return types
 *
 * These schemas provide runtime validation for RPC responses to catch:
 * - Database schema changes that don't match TypeScript types
 * - Unexpected null/undefined values
 * - Wrong data types (e.g., string instead of number)
 * - Missing required fields
 *
 * Usage:
 * ```typescript
 * import { validateRpcResult } from '@/lib/utils/rpc-types'
 * import { ExecuteDiscountResponseSchema } from '@/lib/validation/rpc-schemas'
 *
 * const { data, error } = await supabase.rpc('execute_discount_action', params)
 * if (error) throw error
 * const result = validateRpcResult(data, ExecuteDiscountResponseSchema, 'executeDiscount')
 * ```
 */

import { z } from 'zod'

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/** Sale timing options */
const SaleTimingSchema = z.enum(['just-now', 'today', 'yesterday', 'this-week', 'custom'])

// =============================================================================
// BATCH ACTION EXECUTION SCHEMAS
// =============================================================================

/**
 * Schema for execute_discount_action RPC response
 * Validates discount application results including pricing and quantity
 */
export const ExecuteDiscountResponseSchema = z.object({
  success: z.boolean(),
  action_id: z.string(),
  remaining_quantity: z.number(),
  potential_revenue: z.number(),
  discounted_price: z.number(),
})

/**
 * Schema for execute_donate_action RPC response
 * Validates donation results including value tracking
 */
export const ExecuteDonateResponseSchema = z.object({
  success: z.boolean(),
  action_id: z.string(),
  remaining_quantity: z.number(),
  original_value: z.number(),
  discount_applied: z.number().nullable(),
})

/**
 * Schema for execute_dispose_action RPC response
 * Validates disposal results including waste value tracking
 */
export const ExecuteDisposeResponseSchema = z.object({
  success: z.boolean(),
  action_id: z.string(),
  remaining_quantity: z.number(),
  waste_value: z.number(),
  discount_applied: z.number().nullable(),
})

/**
 * Schema for execute_sold_action RPC response
 * Validates sale recording including revenue and timing
 */
export const ExecuteSoldResponseSchema = z.object({
  success: z.boolean(),
  action_id: z.string(),
  remaining_quantity: z.number(),
  revenue_recovered: z.number(),
  discount_applied: z.number().nullable(),
  effective_price: z.number(),
  sale_timing: SaleTimingSchema,
  sale_occurred_at: z.string(),
})

/**
 * Schema for execute_dismiss_action RPC response
 * Validates dismissal of AI recommendations
 */
export const ExecuteDismissResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

/**
 * Schema for individual bulk action results
 * Discriminated union of all possible action responses
 */
const BulkActionResultItemSchema = z.union([
  ExecuteDiscountResponseSchema,
  ExecuteDonateResponseSchema,
  ExecuteDisposeResponseSchema,
  ExecuteSoldResponseSchema,
  z.object({
    success: z.literal(false),
    batch_id: z.string(),
    error: z.string(),
  }),
])

/**
 * Schema for execute_bulk_action RPC response
 * Validates bulk operations across multiple batches
 */
export const ExecuteBulkActionResponseSchema = z.object({
  success: z.boolean(),
  total_processed: z.number(),
  success_count: z.number(),
  error_count: z.number(),
  results: z.array(BulkActionResultItemSchema),
})

// =============================================================================
// DRAFT BATCH MANAGEMENT SCHEMAS
// =============================================================================

/**
 * Schema for single draft batch item
 */
const DraftBatchItemSchema = z.object({
  batch_id: z.string(),
  batch_number: z.string(),
  quantity: z.number(),
  received_date: z.string().nullable(),
  created_at: z.string(),
})

/**
 * Schema for category summary in draft batches
 */
const DraftBatchCategorySummarySchema = z.object({
  category_id: z.string().nullable(),
  category_code: z.string(),
  category_name: z.string(),
  product_count: z.number(),
  total_units: z.number(),
})

/**
 * Schema for get_draft_batches_summary RPC response
 * Validates draft batch summary with category breakdown
 */
export const DraftBatchesSummaryResponseSchema = z.object({
  success: z.boolean(),
  total_draft_batches: z.number(),
  total_units: z.number(),
  products_with_drafts: z.number(),
  oldest_draft_created_at: z.string().nullable(),
  by_category: z.array(DraftBatchCategorySummarySchema),
  error: z.string().optional(),
})

/**
 * Schema for get_draft_batches_by_product RPC response
 * Validates draft batches grouped by product
 */
export const DraftBatchesByProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  product_brand: z.string().nullable(),
  category_name: z.string(),
  typical_shelf_life_days: z.number().nullable(),
  draft_batch_count: z.number(),
  total_draft_quantity: z.number(),
  draft_batches: z.array(DraftBatchItemSchema),
  last_expiry_days: z.number().nullable(),
  last_batch_expiry_date: z.string().nullable(),
  total_count: z.number(),
})

/**
 * Schema for activate_draft_batch RPC response
 * Validates draft batch activation including split handling
 */
export const ActivateDraftBatchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  activated_batch_id: z.string().optional(),
  activated_quantity: z.number().optional(),
  expiry_date: z.string().optional(),
  was_split: z.boolean().optional(),
  was_ignored: z.boolean().optional(),
  remaining_draft_batch_id: z.string().nullable().optional(),
  remaining_draft_quantity: z.number().nullable().optional(),
})

/**
 * Schema for ignore_draft_batch RPC response
 * Validates draft batch ignore operation including split handling
 */
export const IgnoreDraftBatchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  ignored_batch_id: z.string().optional(),
  ignored_quantity: z.number().optional(),
  product_name: z.string().optional(),
  was_split: z.boolean().optional(),
  remaining_draft_batch_id: z.string().nullable().optional(),
  remaining_draft_quantity: z.number().nullable().optional(),
})

/**
 * Schema for single delivery result item
 */
const DeliveryResultItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  draft_batch_id: z.string(),
  suggested_expiry_days: z.number().nullable(),
  suggested_expiry_date: z.string().nullable(),
})

/**
 * Schema for log_delivery_create_drafts RPC response
 * Validates delivery logging results
 */
export const LogDeliveryResponseSchema = z.object({
  success: z.boolean(),
  total_items: z.number(),
  drafts_created: z.number(),
  items: z.array(DeliveryResultItemSchema),
  error: z.string().optional(),
})

/**
 * Schema for get_recent_delivery_products RPC response
 */
export const RecentDeliveryProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  last_delivery_quantity: z.number().nullable(),
  last_expiry_days: z.number().nullable(),
  total_delivery_count: z.number(),
})

// =============================================================================
// IGNORED BATCH MANAGEMENT SCHEMAS
// =============================================================================

/**
 * Schema for single ignored batch item
 */
const IgnoredBatchItemSchema = z.object({
  batch_id: z.string(),
  batch_number: z.string(),
  quantity: z.number(),
  received_date: z.string().nullable(),
  ignored_at: z.string(),
  created_at: z.string(),
})

/**
 * Schema for category summary in ignored batches
 */
const IgnoredBatchCategorySummarySchema = z.object({
  category_code: z.string(),
  category_name: z.string(),
  ignored_count: z.number(),
  total_quantity: z.number(),
})

/**
 * Schema for get_ignored_batches_summary RPC response
 */
export const IgnoredBatchesSummaryResponseSchema = z.object({
  total_ignored_batches: z.number(),
  total_units: z.number(),
  products_with_ignored: z.number(),
  by_category: z.array(IgnoredBatchCategorySummarySchema),
})

/**
 * Schema for get_ignored_batches_by_product RPC response
 */
export const IgnoredBatchesByProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  product_brand: z.string().nullable(),
  category_name: z.string(),
  typical_shelf_life_days: z.number().nullable(),
  ignored_batch_count: z.number(),
  total_ignored_quantity: z.number(),
  ignored_batches: z.array(IgnoredBatchItemSchema),
  total_count: z.number(),
})

/**
 * Schema for restore_ignored_batch RPC response
 */
export const RestoreIgnoredBatchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  restored_batch_id: z.string().optional(),
  restored_quantity: z.number().optional(),
  product_name: z.string().optional(),
})

// =============================================================================
// BATCH TRACKING ONBOARDING SCHEMAS
// =============================================================================

/**
 * Schema for get_categories_with_tracking_settings RPC response
 * Validates categories with their tracking and automation settings
 */
export const CategoryWithTrackingSettingsSchema = z.object({
  category_id: z.string(),
  category_code: z.string(),
  display_name_en: z.string(),
  display_name_fr: z.string(),
  typical_shelf_life_days: z.number().nullable(),
  is_tracked: z.boolean(),
  auto_create_batches: z.boolean(),
  default_shelf_life_days: z.number().nullable(),
  product_count: z.number(),
})

/**
 * Schema for get_products_for_tracking_setup RPC response
 * Validates products with their tracking settings and inheritance
 */
export const ProductWithTrackingSettingsSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  image_url: z.string().nullable(),
  category_id: z.string().nullable(),
  category_name: z.string().nullable(),
  typical_shelf_life_days: z.number().nullable(),
  is_tracked_for_batches: z.boolean(),
  shelf_life_override_days: z.number().nullable(),
  auto_create_batches: z.boolean().nullable(),
  inherited_auto_create: z.boolean(),
  inherited_shelf_life_days: z.number().nullable(),
  total_count: z.number(),
})

/**
 * Schema for save_batch_tracking_setup RPC response
 * Validates batch tracking setup save results
 */
export const SaveBatchTrackingSetupResponseSchema = z.object({
  success: z.boolean(),
  setup_completed: z.boolean(),
  categories_updated: z.number(),
  products_updated: z.number(),
})

// =============================================================================
// TYPE INFERENCE HELPERS
// =============================================================================

/**
 * Infer TypeScript types from Zod schemas
 * These should match the types in types/rpc-returns.ts
 */
export type ExecuteDiscountResponse = z.infer<typeof ExecuteDiscountResponseSchema>
export type ExecuteDonateResponse = z.infer<typeof ExecuteDonateResponseSchema>
export type ExecuteDisposeResponse = z.infer<typeof ExecuteDisposeResponseSchema>
export type ExecuteSoldResponse = z.infer<typeof ExecuteSoldResponseSchema>
export type ExecuteDismissResponse = z.infer<typeof ExecuteDismissResponseSchema>
export type ExecuteBulkActionResponse = z.infer<typeof ExecuteBulkActionResponseSchema>
export type DraftBatchesSummaryResponse = z.infer<typeof DraftBatchesSummaryResponseSchema>
export type DraftBatchesByProduct = z.infer<typeof DraftBatchesByProductSchema>
export type ActivateDraftBatchResponse = z.infer<typeof ActivateDraftBatchResponseSchema>
export type IgnoreDraftBatchResponse = z.infer<typeof IgnoreDraftBatchResponseSchema>
export type LogDeliveryResponse = z.infer<typeof LogDeliveryResponseSchema>
export type RecentDeliveryProduct = z.infer<typeof RecentDeliveryProductSchema>
export type IgnoredBatchesSummaryResponse = z.infer<typeof IgnoredBatchesSummaryResponseSchema>
export type IgnoredBatchesByProduct = z.infer<typeof IgnoredBatchesByProductSchema>
export type RestoreIgnoredBatchResponse = z.infer<typeof RestoreIgnoredBatchResponseSchema>
export type CategoryWithTrackingSettings = z.infer<typeof CategoryWithTrackingSettingsSchema>
export type ProductWithTrackingSettings = z.infer<typeof ProductWithTrackingSettingsSchema>
export type SaveBatchTrackingSetupResponse = z.infer<typeof SaveBatchTrackingSetupResponseSchema>
