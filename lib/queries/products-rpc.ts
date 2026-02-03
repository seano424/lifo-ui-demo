// lib/queries/products-rpc.ts
// Optimized RPC-based product queries for improved performance
// Performance gains: 70-96% faster than query builder approach (based on batches-rpc pattern)

import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import type { Product, ProductFilters, ProductsPageParam } from './products'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Optimized paginated products query with store-specific data and batch aggregations
 * Replaces: fetchProductsPage (eliminates multi-query + client-side aggregation)
 * Performance: 700-1600ms → 100-300ms (target 80-85% faster)
 */
export async function fetchProductsPageRPC(
  { page, pageSize }: ProductsPageParam,
  filters: ProductFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: Product[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()
  const context = 'fetchProductsPageRPC'

  return withPerformanceTracking(
    context,
    'Fetch products page via RPC',
    {
      page,
      pageSize,
      storeId: filters.storeId,
      filterCount: Object.keys(filters).length,
    },
    async () => {
      if (!filters.storeId) {
        logger.error(context, 'Store ID required', { page, pageSize })
        throw new Error('Store ID is required for fetching products')
      }

      const { data, error } = await supabase.schema('inventory').rpc('get_products_paginated', {
        p_store_id: filters.storeId,
        p_category_code: filters.category ?? undefined,
        p_brand: filters.brand ?? undefined,
        p_search: filters.search ?? undefined,
        p_sort_field: filters.sort?.field || 'created_at',
        p_sort_direction: filters.sort?.direction || 'desc',
        p_page_size: pageSize,
        p_page_offset: page * pageSize,
      })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId: filters.storeId,
          page,
          pageSize,
        })
        throw new Error(`Failed to fetch products page: ${error.message}`)
      }

      // RPC returns array of rows with all data already joined and aggregated
      // biome-ignore lint/suspicious/noExplicitAny: RPC returns dynamic JSON structure
      const rows = (data || []) as any[]
      const totalCount = rows[0]?.total_count || 0

      // Transform RPC rows to Product structure
      // Spread all row fields first, then override with specific mappings
      const products: Product[] = rows.map(row => ({
        ...row, // Spread all BaseProduct fields from RPC

        // Store-specific fields (override if present)
        store_cost_price: row.store_cost_price,
        store_selling_price: row.store_selling_price,
        store_is_active: row.store_is_active,
        store_sku: row.store_sku,
        supplier_code: row.supplier_code,

        // Category fields (override if present)
        category_code: row.category_code,
        category_display_name: row.category_display_name,
        category_display_name_fr: row.category_display_name_fr,

        // Aggregated batch data (from RPC - no client-side aggregation needed!)
        total_stock: row.total_stock,
        active_batches_count: row.active_batches_count,
        avg_days_to_expiry: null, // Future: can be added to RPC
      }))

      logger.log(context, 'Products fetched successfully via RPC', {
        storeId: filters.storeId,
        page,
        productCount: products.length,
        totalCount,
      })

      return {
        data: products,
        count: totalCount,
        nextPage: totalCount > (page + 1) * pageSize ? page + 1 : undefined,
      }
    },
  )
}
