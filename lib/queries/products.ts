// lib/queries/products.ts

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a product row
export type Product = Database['inventory']['Tables']['products']['Row']

// Type for a product filter (enhanced with better typing)
export type ProductFilters = {
  category?: Database['inventory']['Tables']['products']['Row']['category']
  brand?: string
  // Add more as needed
}

export type ProductsPageParam = {
  page: number
  pageSize: number
}

export async function fetchProducts(serverClient?: ServerClient): Promise<Product[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchProducts] Querying inventory.products with no filters')

  // Use schema.table format
  const { data, error } = await supabase.schema('inventory').from('products').select('*')

  console.log('[fetchProducts] Result:', { data, error })
  if (error) throw error
  return data as Product[]
}

export async function fetchProductsPage(
  { page, pageSize }: ProductsPageParam,
  filters: ProductFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: Product[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()

  // Fixed: Remove the await here since supabase is not a Promise
  let query = supabase.schema('inventory').from('products').select('*', { count: 'exact' })

  // Apply filters
  if (filters.category) {
    console.log('[fetchProductsPage] Applying filter:', filters)
    query = query.eq('category', filters.category)
  }

  if (filters.brand) {
    query = query.eq('brand', filters.brand)
  }

  const rangeFrom = page * pageSize
  const rangeTo = (page + 1) * pageSize - 1
  console.log('[fetchProductsPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  console.log('[fetchProductsPage] Supabase response:', { data, error, count })

  if (error) throw error

  return {
    data: (data as Product[]) || [],
    count: count || 0,
    nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
  }
}

// CRUD mutations for products
export async function createProduct(
  productData: Database['inventory']['Tables']['products']['Insert'],
): Promise<Product> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(
  productId: string,
  updates: Database['inventory']['Tables']['products']['Update'],
): Promise<Product> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('products')
    .update(updates)
    .eq('product_id', productId)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(productId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .schema('inventory')
    .from('products')
    .delete()
    .eq('product_id', productId)

  if (error) throw error
}

export async function fetchProductById(
  productId: string,
  serverClient?: ServerClient,
): Promise<Product> {
  const supabase = serverClient || createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('products')
    .select('*')
    .eq('product_id', productId)
    .single()

  if (error) throw error
  return data as Product
}
