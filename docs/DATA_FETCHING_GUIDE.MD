# LIFO Data Fetching & CRUD Implementation Guide

## TL;DR - Adding a New Feature

Need to add a new table? Follow this 4-step pattern:

### 1. **Raw Query Functions** (`lib/queries/[table].ts`)

```typescript
export async function fetchSuppliersPage({ page, pageSize }, filters = {}, serverClient) {
  const supabase = serverClient || createClient()
  let query = supabase.schema('inventory').from('suppliers').select('*', { count: 'exact' })

  // Apply filters
  if (filters.active_only) query = query.eq('is_active', true)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data: data || [], count: count || 0, nextPage: /* pagination logic */ }
}
```

### 2. **Query Keys** (`lib/queries/query-keys.ts`)

```typescript
export const queryKeys = {
  suppliers: {
    all: ['suppliers'] as const,
    infinite: filters => ['suppliers', 'infinite', { filters }] as const,
    detail: id => ['suppliers', 'detail', id] as const,
  },
}
```

### 3. **React Hook** (`hooks/use-suppliers.ts`)

```typescript
export function useSuppliers(filters = {}, pageSize = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.suppliers.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchSuppliersPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
  })

  const data = result.data?.pages.flatMap(page => page.data) ?? []
  return { data, fetchNextPage: result.fetchNextPage, hasMore: result.hasNextPage, ...result }
}
```

### 4. **Use in Component**

```typescript
export function SupplierList() {
  const { data, fetchNextPage, hasMore } = useSuppliers()
  return (
    <div>
      {data.map(supplier => <SupplierCard key={supplier.id} supplier={supplier} />)}
      {hasMore && <LoadMoreButton onClick={fetchNextPage} />}
    </div>
  )
}
```

**That's it!** Your new feature has infinite scroll, server prefetching, caching, and optimistic updates.

---

## Architecture Deep Dive

### Design Principles

#### 🎯 **Separation of Concerns**

```
📁 lib/queries/     → Pure data fetching (no React)
📁 hooks/           → React Query integration + mutations
📁 components/      → UI only (no direct data calls)
```

#### ⚡ **Server + Client Hydration**

```
Server Component (prefetch) → Client Component (continue) → User Action (update)
        ↓                            ↓                           ↓
   First page loaded              Infinite scroll            Optimistic update
```

#### 🔄 **Consistent API**

Every table follows identical patterns. Once you learn one, you know them all.

---

## File Structure & Organization

```
lib/
├── queries/                    # Raw Supabase operations
│   ├── query-keys.ts          # Centralized cache keys
│   ├── products.ts            # Product CRUD + pagination
│   ├── users.ts               # User management
│   ├── batches.ts             # Batch tracking
│   └── suppliers.ts           # Example new table
├── supabase/
│   ├── client.ts              # Browser client (anon key)
│   └── server.ts              # Server client (service key)
└── react-query/
    ├── client.ts              # Query client config
    ├── provider.tsx           # App wrapper
    └── prefetch.ts            # Server prefetch utils

hooks/
├── use-products.ts            # Product hooks + actions
├── use-users.ts               # User hooks + actions
├── use-batches.ts             # Batch hooks + actions
└── use-suppliers.ts           # Example new feature
```

### Why This Structure Works

- **lib/queries/**: Pure functions, easy to test, server/client compatible
- **hooks/**: React-specific logic, mutations, cache management
- **Shared Query Keys**: Server prefetch and client hooks use identical cache keys
- **Schema Support**: Works across multiple Supabase schemas (`inventory`, `user_mgmt`, `scoring`)

---

## Implementation Patterns

### 1. Query Keys Pattern

**Purpose**: Single source of truth for all cache keys

```typescript
// lib/queries/query-keys.ts
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    infinite: (filters: ProductFilters) =>
      [...queryKeys.products.lists(), 'infinite', { filters }] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
  batches: {
    all: ['batches'] as const,
    infinite: (filters: BatchFilters) => ['batches', 'infinite', { filters }] as const,
    byProduct: (productId: string) => ['batches', 'product', productId] as const,
    expiring: (days: number) => ['batches', 'expiring', days] as const,
  },
} as const
```

**Critical**: Server prefetch, client hooks, and cache invalidation MUST use identical keys.

### 2. Raw Query Functions Pattern

**Purpose**: Database operations with no React dependencies

```typescript
// lib/queries/products.ts
import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'

export type ProductFilters = {
  storeId?: string
  category?: string
  expiringOnly?: boolean
  searchTerm?: string
}

export type ProductsPageParam = {
  page: number
  pageSize: number
}

// READ: Paginated products with filters
export async function fetchProductsPage(
  { page, pageSize }: ProductsPageParam,
  filters: ProductFilters = {},
  serverClient?: ReturnType<typeof createServerClient>,
) {
  const supabase = serverClient || createClient()

  let query = supabase
    .schema('inventory')
    .from('products')
    .select(
      `
      *,
      batches:inventory.batches(*)
    `,
      { count: 'exact' },
    )

  // Apply filters dynamically
  if (filters.storeId) {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  if (filters.expiringOnly) {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    query = query.lt('expiration_date', threeDaysFromNow)
  }

  if (filters.searchTerm) {
    query = query.ilike('name', `%${filters.searchTerm}%`)
  }

  // Execute with pagination
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) {
    console.error('Failed to fetch products:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  return {
    data: data || [],
    count: count || 0,
    nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
  }
}

// CREATE: Add new product
export async function createProduct(
  productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) {
    console.error('Failed to create product:', error)
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return data
}

// UPDATE: Modify existing product
export async function updateProduct(id: string, updates: Partial<Product>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update product:', error)
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return data
}

// DELETE: Remove product
export async function deleteProduct(id: string) {
  const supabase = createClient()

  const { error } = await supabase.schema('inventory').from('products').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete product:', error)
    throw new Error(`Failed to delete product: ${error.message}`)
  }
}
```

**Key Features**:

- ✅ **Server/Client Compatible**: Optional `serverClient` parameter
- ✅ **Type Safe**: Uses generated Supabase types
- ✅ **Error Handling**: Consistent logging and user-friendly errors
- ✅ **Flexible Filtering**: Dynamic query building
- ✅ **Pagination Logic**: Built-in next page calculation

### 3. React Query Hooks Pattern

**Purpose**: React integration with caching, mutations, and optimistic updates

```typescript
// hooks/use-products.ts
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchProductsPage,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductFilters,
} from '@/lib/queries/products'
import { toast } from 'sonner'

// INFINITE SCROLL: Main product list
export function useProducts(filters: ProductFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.products.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchProductsPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Flatten pages into single array for easy rendering
  const data = result.data?.pages.flatMap(page => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? 0,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  }
}

// SINGLE ITEM: Product details
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  })
}

// CONVENIENCE HOOKS: Common filter combinations
export function useExpiringProducts(storeId: string, days: number = 3) {
  return useProducts({
    storeId,
    expiringOnly: true,
  })
}

export function useStoreProducts(storeId: string, category?: string) {
  return useProducts({
    storeId,
    category,
  })
}

// MUTATIONS: Create, update, delete with optimistic updates
export function useProductActions() {
  const queryClient = useQueryClient()

  // CREATE: Add new product
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: newProduct => {
      // Add to lists cache
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      // Add to detail cache
      queryClient.setQueryData(queryKeys.products.detail(newProduct.id), newProduct)
      toast.success('Product created successfully')
    },
    onError: error => {
      console.error('Create product error:', error)
      toast.error('Failed to create product')
    },
  })

  // UPDATE: Modify with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      updateProduct(id, updates),

    // OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) })

      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(id))

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.products.detail(id), (old: any) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      return { previousProduct, id }
    },

    // ROLLBACK: Revert on error
    onError: (error, { id }, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(queryKeys.products.detail(context.id), context.previousProduct)
      }
      console.error('Update product error:', error)
      toast.error('Failed to update product')
    },

    // REFETCH: Ensure consistency
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    },

    onSuccess: () => {
      toast.success('Product updated successfully')
    },
  })

  // DELETE: Remove product
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, deletedId) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      toast.success('Product deleted successfully')
    },
    onError: error => {
      console.error('Delete product error:', error)
      toast.error('Failed to delete product')
    },
  })

  // BUSINESS LOGIC: Convenience methods for common actions
  const markAsDiscounted = (id: string, discountPercentage: number) =>
    updateMutation.mutate({
      id,
      updates: {
        status: 'discounted',
        discount_percentage: discountPercentage,
        discounted_at: new Date().toISOString(),
      },
    })

  const markAsDonated = (id: string, donationDetails: any) =>
    updateMutation.mutate({
      id,
      updates: {
        status: 'donated',
        donation_details: donationDetails,
        donated_at: new Date().toISOString(),
      },
    })

  const markAsExpired = (id: string) =>
    updateMutation.mutate({
      id,
      updates: {
        status: 'expired',
        expired_at: new Date().toISOString(),
      },
    })

  return {
    // Raw mutations
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,

    // Business logic
    markAsDiscounted,
    markAsDonated,
    markAsExpired,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

**Key Features**:

- ✅ **Infinite Scroll**: Built-in pagination
- ✅ **Optimistic Updates**: Instant UI feedback
- ✅ **Error Handling**: Automatic rollback on failure
- ✅ **Business Logic**: Domain-specific convenience methods
- ✅ **Cache Management**: Smart invalidation strategies

---

## Server-Side Prefetching

### Server Component Pattern

```typescript
// app/(dashboard)/products/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchProductsPage } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'
import { createServerClient } from '@/lib/supabase/server'
import { ProductsList } from './products-list'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  const { queryClient } = await createPrefetchedQuery()
  const supabase = await createServerClient()

  // Build filters from URL params
  const filters = {
    category: searchParams.category,
    searchTerm: searchParams.search,
  }

  // Prefetch first page with same query key as client
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.infinite(filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchProductsPage({ page: pageParam, pageSize: 20 }, filters, supabase),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <ProductFilters />
        </div>

        <ProductsList filters={filters} />
      </div>
    </HydrationBoundary>
  )
}
```

### Client Component Pattern

```typescript
// app/(dashboard)/products/products-list.tsx
'use client'

import { useProducts, useProductActions } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { ProductCard } from './product-card'
import { LoadingSpinner } from '@/components/ui/loading'

export function ProductsList({ filters = {} }: { filters?: ProductFilters }) {
  // Data is immediately available from server prefetch!
  const {
    data,
    fetchNextPage,
    hasMore,
    isLoading,
    isFetching,
    isFetchingNextPage
  } = useProducts(filters)

  const { markAsDiscounted, markAsDonated, isUpdating } = useProductActions()

  // Handle initial loading state
  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Product Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDiscount={(percentage) => markAsDiscounted(product.id, percentage)}
            onDonate={(details) => markAsDonated(product.id, details)}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              'Load More Products'
            )}
          </Button>
        </div>
      )}

      {/* Background fetching indicator */}
      {isFetching && !isFetchingNextPage && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">
          Updating...
        </div>
      )}
    </div>
  )
}
```

---

## Data Flow Example: Complete User Journey

Let's trace through a complete user interaction to see how all the pieces work together:

### 1. **User Visits Products Page**

```typescript
// Server Component runs first
export default async function ProductsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const supabase = await createServerClient()

  // Prefetch first 20 products server-side
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.infinite({}),
    queryFn: ({ pageParam = 0 }) => fetchProductsPage({ page: 0, pageSize: 20 }, {}, supabase),
    initialPageParam: 0,
  })

  // HTML is sent to browser with data already loaded
  return <HydrationBoundary><ProductsList /></HydrationBoundary>
}
```

### 2. **Client Hydrates with Data**

```typescript
// Client component renders immediately with server data
export function ProductsList() {
  const { data, fetchNextPage, hasMore } = useProducts()
  // data contains 20 products immediately - no loading spinner!

  return (
    <div>
      {data.map(product => <ProductCard key={product.id} product={product} />)}
      {hasMore && <LoadMoreButton onClick={fetchNextPage} />}
    </div>
  )
}
```

### 3. **User Scrolls and Loads More**

```typescript
// User clicks "Load More" - fetches next 20 products
const { fetchNextPage } = useProducts()
// fetchNextPage() calls fetchProductsPage({ page: 1, pageSize: 20 })
// React Query automatically appends new data to existing list
```

### 4. **User Marks Product as Discounted**

```typescript
// User clicks discount button
const { markAsDiscounted } = useProductActions()
markAsDiscounted('prod_123', 25)

// This triggers optimistic update:
// 1. UI updates instantly (product shows as discounted)
// 2. API call happens in background
// 3. If error occurs, UI automatically reverts
// 4. Cache is invalidated to ensure consistency
```

### 5. **Another User Sees Update Immediately**

```typescript
// Other devices see the change via cache invalidation
// React Query refetches in background when cache is invalidated
// Fresh data appears without user action
```

**Result**: Instant UI updates, seamless infinite scroll, automatic error handling, and multi-device consistency!

---

## Common Patterns & Examples

### Filtering Products by Category

```typescript
// In your component
const { data: dairyProducts } = useProducts({ category: 'dairy' })
const { data: expiringProducts } = useExpiringProducts(storeId)

// URLs automatically work with filters
// /products?category=dairy → filters are applied server-side and client-side
```

### Batch Operations

```typescript
// Multiple updates with loading states
const { updateProduct, isUpdating } = useProductActions()

const markMultipleAsDiscounted = async (productIds: string[]) => {
  for (const id of productIds) {
    await updateProduct({ id, updates: { status: 'discounted' } })
  }
}

// UI shows loading state automatically
if (isUpdating) return <LoadingSpinner />
```

### Real-time Updates (Future)

```typescript
// When we add real-time subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('products')
    .on('postgres_changes', { event: '*', schema: 'inventory', table: 'products' }, payload => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

---

## Error Handling Strategies

### Query Error Handling

```typescript
// In your component
const { data, error, isError } = useProducts()

if (isError) {
  return <ErrorMessage error={error} retry={() => refetch()} />
}

// Error boundaries catch unhandled errors
export function ProductsErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong loading products</div>}
      onError={(error) => console.error('Products error:', error)}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### Mutation Error Handling

```typescript
// Automatic error handling in hooks
const updateMutation = useMutation({
  mutationFn: updateProduct,
  onError: (error, variables, context) => {
    // Automatic rollback
    if (context?.previousData) {
      queryClient.setQueryData(context.queryKey, context.previousData)
    }
    // User feedback
    toast.error(`Failed to update product: ${error.message}`)
    // Error logging
    console.error('Update failed:', error, variables)
  },
})
```

### Network Error Recovery

```typescript
// React Query automatically retries failed requests
// Configure retry logic in query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false
        // Retry network errors up to 3 times
        return failureCount < 3
      },
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})
```

---

## Performance Optimization

### Cache Management

```typescript
// Smart cache invalidation
const updateMutation = useMutation({
  mutationFn: updateProduct,
  onSuccess: (updatedProduct, { id }) => {
    // Update specific item cache
    queryClient.setQueryData(queryKeys.products.detail(id), updatedProduct)

    // Invalidate lists that might include this product
    queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })

    // Don't invalidate unrelated caches
    // queryClient.invalidateQueries({ queryKey: queryKeys.users.all })  ❌
  },
})
```

### Prefetching Strategies

```typescript
// Prefetch related data on hover
const { prefetchQuery } = useQueryClient()

const handleProductHover = (productId: string) => {
  prefetchQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => fetchProductById(productId),
    staleTime: 60 * 1000, // Cache for 1 minute
  })
}

// Prefetch next page before user needs it
const { fetchNextPage, hasMore } = useProducts()

useEffect(() => {
  const handleScroll = () => {
    const scrollPosition = window.scrollY + window.innerHeight
    const documentHeight = document.documentElement.offsetHeight

    // Prefetch when user is 80% down the page
    if (scrollPosition > documentHeight * 0.8 && hasMore) {
      fetchNextPage()
    }
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [fetchNextPage, hasMore])
```

---

## Testing Patterns

### Testing Query Functions

```typescript
// lib/queries/__tests__/products.test.ts
import { fetchProductsPage } from '../products'
import { createMockSupabase } from '@/lib/test-utils'

describe('fetchProductsPage', () => {
  it('should fetch products with filters', async () => {
    const mockSupabase = createMockSupabase({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [{ id: '1', name: 'Test Product' }],
        count: 1,
        error: null,
      }),
    })

    const result = await fetchProductsPage(
      { page: 0, pageSize: 20 },
      { category: 'dairy' },
      mockSupabase,
    )

    expect(result.data).toHaveLength(1)
    expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'dairy')
  })
})
```

### Testing React Hooks

```typescript
// hooks/__tests__/use-products.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts } from '../use-products'
import { createTestQueryClient } from '@/lib/test-utils'

const wrapper = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('useProducts', () => {
  it('should fetch and return products', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
  })
})
```

---

## Troubleshooting Guide

### Common Issues

**Issue**: "Cannot read property 'pages' of undefined"

```typescript
// ❌ Problem: Not handling loading state
const { data } = useProducts()
return data.map(product => <ProductCard product={product} />)

// ✅ Solution: Handle loading and empty states
const { data, isLoading } = useProducts()
if (isLoading) return <LoadingSpinner />
return data.map(product => <ProductCard product={product} />)
```

**Issue**: "Query key mismatch between server and client"

```typescript
// ❌ Problem: Different query keys
// Server: queryKeys.products.list({})
// Client: queryKeys.products.infinite({})

// ✅ Solution: Use identical keys
// Both: queryKeys.products.infinite({})
```

**Issue**: "Stale data after mutations"

```typescript
// ❌ Problem: Not invalidating cache
const updateMutation = useMutation({
  mutationFn: updateProduct,
  // onSuccess missing
})

// ✅ Solution: Invalidate relevant queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
}
```

### Debugging Tips

```typescript
// Enable React Query DevTools in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function ReactQueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

---

## Migration Guide: Adding Real-time

When we're ready to add real-time subscriptions:

### 1. Update Query Client

```typescript
// lib/react-query/subscriptions.ts
export function setupRealtimeSubscriptions(queryClient: QueryClient) {
  const supabase = createClient()

  // Products table changes
  supabase
    .channel('products')
    .on('postgres_changes', { event: '*', schema: 'inventory', table: 'products' }, payload => {
      if (payload.eventType === 'UPDATE') {
        // Update specific product cache
        queryClient.setQueryData(queryKeys.products.detail(payload.new.id), payload.new)
        // Invalidate product lists
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      }
    })
    .subscribe()
}
```

### 2. Update Provider

```typescript
// lib/react-query/provider.tsx
export function ReactQueryProvider({ children }) {
  const [queryClient] = useState(() => createQueryClient())

  useEffect(() => {
    setupRealtimeSubscriptions(queryClient)
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

### 3. No Component Changes Needed!

The existing `useProducts()` hooks automatically benefit from real-time updates through cache invalidation.

---

_This architecture provides a scalable, performant foundation for LIFO's real-time inventory management needs while maintaining excellent developer experience._
