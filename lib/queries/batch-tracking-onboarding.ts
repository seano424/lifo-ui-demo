/**
 * React Query hooks for Batch Tracking Onboarding Wizard
 *
 * These hooks interact with the following RPC functions:
 * - get_categories_with_tracking_settings: Fetch categories with tracking config
 * - get_products_for_tracking_setup: Paginated products with tracking settings
 * - save_batch_tracking_setup: Save complete onboarding configuration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { queryKeys } from './query-keys'
import type {
  CategoryWithTrackingSettings,
  ProductWithTrackingSettings,
  SaveBatchTrackingSetupResponse,
} from '@/types/rpc-returns'
import {
  CategoryWithTrackingSettingsSchema,
  ProductWithTrackingSettingsSchema,
  SaveBatchTrackingSetupResponseSchema,
} from '@/lib/validation/rpc-schemas'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ProductFilters {
  categoryId?: string | null
  searchTerm?: string | null
  onlyTracked?: boolean | null
  pageSize?: number
  offset?: number
}

export interface SaveBatchTrackingSetupParams {
  storeId: string
  config: {
    enabled: boolean
    setup_completed: boolean
    setup_completed_at: string
    product_selection_mode: 'all' | 'by_category' | 'individual'
    selected_category_ids: string[]
    selected_product_ids: string[]
  }
  categorySettings: Array<{
    category_id: string
    is_tracked: boolean
    auto_create_batches: boolean
    default_shelf_life_days: number | null
  }>
  productOverrides: Array<{
    product_id: string
    shelf_life_override_days: number | null
    auto_create_batches: boolean | null
  }>
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Get batch tracking setup configuration for a store
 *
 * @param storeId - The store ID to fetch config for
 * @returns Query result with batch tracking config including setup_completed status
 */
export function useBatchTrackingSetup(storeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.batchTrackingOnboarding.config(storeId),
    queryFn: async () => {
      const context = 'useBatchTrackingSetup'

      logger.log(context, 'Fetching batch tracking setup', { storeId })

      const { data, error } = await supabase.rpc('get_batch_tracking_setup', {
        p_store_id: storeId,
      })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch batch tracking setup: ${error.message}`)
      }

      const typedData = data as unknown as
        | import('@/types/rpc-returns').BatchTrackingSetupResponse
        | null

      logger.log(context, 'Batch tracking setup fetched successfully', {
        storeId,
        setupCompleted: typedData?.config?.setup_completed,
      })

      return typedData
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!storeId,
  })
}

/**
 * Fetch categories with their tracking settings and product counts
 *
 * @param storeId - The store ID to fetch categories for
 * @returns Query result with array of CategoryWithTrackingSettings
 */
export function useCategoriesWithTrackingSettings(storeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.batchTrackingOnboarding.categories(storeId),
    queryFn: async () => {
      const context = 'useCategoriesWithTrackingSettings'

      logger.log(context, 'Fetching categories with tracking settings', { storeId })

      const { data, error } = await supabase.rpc('get_categories_with_tracking_settings', {
        p_store_id: storeId,
      })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      // Validate response with Zod schema
      const validated = (data || []).map((item, index) => {
        try {
          return CategoryWithTrackingSettingsSchema.parse(item)
        } catch (validationError) {
          logger.error(context, 'Validation error', {
            index,
            item,
            error: validationError,
          })
          throw new Error(`Invalid category data at index ${index}`)
        }
      })

      logger.log(context, 'Categories fetched successfully', {
        storeId,
        count: validated.length,
      })

      return validated as CategoryWithTrackingSettings[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!storeId,
  })
}

/**
 * Fetch products for tracking setup with pagination and filters
 *
 * @param storeId - The store ID to fetch products for
 * @param filters - Optional filters for category, search, tracking status, pagination
 * @returns Query result with array of ProductWithTrackingSettings
 */
export function useProductsForTrackingSetup(storeId: string, filters: ProductFilters = {}) {
  const supabase = createClient()

  const {
    categoryId = null,
    searchTerm = null,
    onlyTracked = null,
    pageSize = 20,
    offset = 0,
  } = filters

  return useQuery({
    queryKey: queryKeys.batchTrackingOnboarding.products(storeId, {
      categoryId,
      searchTerm,
      onlyTracked,
      pageSize,
      offset,
    }),
    queryFn: async () => {
      const context = 'useProductsForTrackingSetup'

      logger.log(context, 'Fetching products for tracking setup', {
        storeId,
        categoryId,
        searchTerm,
        onlyTracked,
        pageSize,
        offset,
      })

      const { data, error } = await supabase.rpc('get_products_for_tracking_setup', {
        p_store_id: storeId,
        p_category_id: categoryId ?? undefined,
        p_search_term: searchTerm ?? undefined,
        p_only_tracked: onlyTracked ?? undefined,
        p_page_size: pageSize,
        p_offset: offset,
      })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
          filters,
        })
        throw new Error(`Failed to fetch products: ${error.message}`)
      }

      // Validate response with Zod schema
      const validated = (data || []).map((item, index) => {
        try {
          return ProductWithTrackingSettingsSchema.parse(item)
        } catch (validationError) {
          logger.error(context, 'Validation error', {
            index,
            item,
            error: validationError,
          })
          throw new Error(`Invalid product data at index ${index}`)
        }
      })

      logger.log(context, 'Products fetched successfully', {
        storeId,
        count: validated.length,
        totalCount: validated[0]?.total_count || 0,
      })

      return validated as ProductWithTrackingSettings[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!storeId,
  })
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Save batch tracking setup mutation
 *
 * Saves the complete onboarding configuration including:
 * - Store batch tracking config
 * - Category tracking settings
 * - Product overrides
 *
 * @returns Mutation object with mutateAsync function
 */
export function useSaveBatchTrackingSetup() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SaveBatchTrackingSetupParams) => {
      const context = 'useSaveBatchTrackingSetup'

      logger.log(context, 'Saving batch tracking setup', {
        storeId: params.storeId,
        categoryCount: params.categorySettings.length,
        productOverrideCount: params.productOverrides.length,
        mode: params.config.product_selection_mode,
      })

      const { data, error } = await supabase.rpc('save_batch_tracking_setup', {
        p_store_id: params.storeId,
        p_config: params.config,
        p_category_settings: params.categorySettings,
        p_product_overrides: params.productOverrides,
      })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId: params.storeId,
        })
        throw new Error(`Failed to save batch tracking setup: ${error.message}`)
      }

      // Validate response with Zod schema
      let validated: SaveBatchTrackingSetupResponse
      try {
        validated = SaveBatchTrackingSetupResponseSchema.parse(data)
      } catch (validationError) {
        logger.error(context, 'Validation error', {
          data,
          error: validationError,
        })
        throw new Error('Invalid response from save operation')
      }

      logger.log(context, 'Batch tracking setup saved successfully', {
        storeId: params.storeId,
        categoriesUpdated: validated.categories_updated,
        productsUpdated: validated.products_updated,
      })

      return validated
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.batchTrackingOnboarding.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.batchTrackingOnboarding.categories(variables.storeId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.batchTrackingOnboarding.products(variables.storeId, {}),
      })

      logger.log('useSaveBatchTrackingSetup', 'Queries invalidated after successful save', {
        storeId: variables.storeId,
      })
    },
  })
}
