# LIFO Data Fetching & CRUD Architecture Guide

## Overview

Our data architecture separates raw data fetching from React-specific logic, enabling server-side prefetching while maintaining clean, reusable patterns. This creates a seamless user experience with instant page loads and efficient infinite scroll.

## Architecture Principles

### 🎯 **Separation of Concerns**
- **Raw Queries** (`lib/queries/`) - Pure data fetching functions
- **React Hooks** (`hooks/`) - React Query integration with mutations
- **Components** - UI logic only, no direct data fetching

### ⚡ **Server + Client Hydration**
- **Server Components** prefetch first page
- **Client Components** seamlessly continue with infinite scroll
- **Same Query Keys** ensure perfect cache hydration

### 🔄 **Consistent Patterns**
- Every table follows the same structure
- Predictable API across all data operations
- Easy to scale and maintain

---

## File Structure

```
lib/
├── queries/                    # Raw Supabase queries (server/client agnostic)
│   ├── query-keys.ts          # Centralized query keys
│   ├── products.ts            # Product CRUD operations
│   ├── users.ts               # User CRUD operations
│   └── batches.ts             # Batch CRUD operations (future)
├── supabase/                  # Supabase clients
│   ├── client.ts              # Browser client
│   └── server.ts              # Server client (async)
└── react-query/               # React Query setup
    ├── client.ts              # Query client configuration
    ├── provider.tsx           # App-level provider
    └── prefetch.ts            # Server prefetch utilities

hooks/
├── use-products.ts            # Product hooks + mutations
├── use-users.ts               # User hooks + mutations
└── use-batches.ts             # Batch hooks + mutations (future)
```

---

## Implementation Pattern

### 1. Query Keys (`lib/queries/query-keys.ts`)

**Purpose**: Single source of truth for all query keys

```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    infinite: (filters: ProductFilters) => ['products', 'infinite', { filters }] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    infinite: (filters: UserFilters) => ['users', 'infinite', { filters }] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  }
}
```

**Why**: Ensures server prefetch, client hooks, and cache invalidation use identical keys

### 2. Raw Queries (`lib/queries/[table].ts`)

**Purpose**: Pure data fetching functions (no React dependencies)

```typescript
// Products example
export async function fetchProductsPage(
  { page, pageSize }: ProductsPageParam,
  filters: ProductFilters = {},
  serverClient?: ServerClient
): Promise<{ data: Product[]; count: number; nextPage?: number }> {
  const supabase = serverClient || createClient()
  
  let query = supabase.schema('inventory').from('products').select('*', { count: 'exact' })
  
  // Apply filters
  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  
  if (error) throw error
  
  return {
    data: data || [],
    count: count || 0,
    nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined
  }
}
```

**Includes**:
- ✅ Pagination logic
- ✅ Filter application  
- ✅ Server/client compatibility
- ✅ TypeScript types
- ✅ CRUD mutations (create, update, delete)

**Why**: 
- Shared between server prefetching and client hooks
- Testable without React
- Clean separation of data access logic

### 3. React Hooks (`hooks/use-[table].ts`)

**Purpose**: React Query integration with complete table management

```typescript
// Reading data
export function useProducts(filters: ProductFilters = {}, pageSize = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.products.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchProductsPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
  })

  // Flatten pages into single array
  const data = result.data?.pages.flatMap(page => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? 0,
    isLoading: result.isLoading,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    // ... other result properties
  }
}

// Writing data
export function useProductActions() {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateProduct(id, updates),
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) })
      const previousData = queryClient.getQueryData(queryKeys.products.detail(id))
      queryClient.setQueryData(queryKeys.products.detail(id), old => ({ ...old, ...updates }))
      return { previousData, id }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.products.detail(context.id), context.previousData)
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    }
  })

  return {
    updateProduct: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    // Convenience methods
    markAsDiscounted: (id, percentage) => updateMutation.mutate({
      id, 
      updates: { status: 'discounted', discount_percentage: percentage }
    })
  }
}
```

**Features**:
- ✅ Infinite scroll by default
- ✅ Optimistic updates
- ✅ Automatic cache invalidation
- ✅ Business logic methods
- ✅ Loading states
- ✅ Error handling

---

## Data Flow

### 1. Server Component (Prefetch)
```typescript
// app/products/page.tsx
export default async function ProductsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Prefetch first page
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.infinite({}),
    queryFn: ({ pageParam = 0 }) => 
      fetchProductsPage({ page: pageParam, pageSize: 20 }, {}, serverClient),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsList />
    </HydrationBoundary>
  )
}
```

### 2. Client Component (Hydration + Infinite Scroll)
```typescript
// app/products/products-list.tsx
'use client'
export function ProductsList() {
  const { data, fetchNextPage, hasMore } = useProducts()
  // Data is immediately available from server prefetch!
  
  return (
    <div>
      {data.map(product => <ProductCard key={product.id} product={product} />)}
      {hasMore && <LoadMoreButton onClick={fetchNextPage} />}
    </div>
  )
}
```

### 3. User Actions (Cache Updates)
```typescript
// User clicks "Update Product"
const { updateProduct } = useProductActions()
updateProduct({ id: 'prod_123', updates: { name: 'New Name' } })
// → UI updates instantly (optimistic)
// → Syncs with server in background
// → Cache invalidation ensures consistency
```

---

## Usage Examples

### Basic List with Infinite Scroll
```typescript
const { data, fetchNextPage, hasMore } = useProducts()
```

### Filtered Lists
```typescript
const { data } = useProducts({ category: 'dairy' })
const { data } = useUsers({ is_active: true })
```

### Single Item
```typescript
const { data: product } = useProduct(productId)
const { data: user } = useUser(userId)
```

### CRUD Operations
```typescript
const { updateProduct, isUpdating } = useProductActions()
const { createUser, activateUser } = useUserActions()
```

### Server Prefetching
```typescript
await queryClient.prefetchInfiniteQuery({
  queryKey: queryKeys.products.infinite(filters),
  queryFn: ({ pageParam }) => fetchProductsPage(params, filters, serverClient)
})
```

---

## Key Benefits

### ⚡ **Performance**
- **No loading spinners** - Data renders immediately from server
- **Efficient pagination** - Only fetch what's needed
- **Smart caching** - Background updates with stale-while-revalidate

### 🔄 **Real-time Feel**
- **Optimistic updates** - UI responds instantly
- **Background sync** - Server updates happen seamlessly
- **Automatic rollback** - Error handling with state recovery

### 📱 **Mobile-Friendly**
- **Retry logic** - Handles poor network connections
- **Efficient memory** - Pagination prevents memory bloat
- **Touch-friendly** - Smooth infinite scroll

### 🛠️ **Developer Experience**
- **Consistent API** - Same patterns across all tables
- **Type safety** - Full TypeScript integration
- **Easy testing** - Pure functions are easily testable
- **Predictable** - Clear separation of concerns

### 🚀 **Scalability**
- **Server-side rendering** - SEO and performance benefits
- **Cache management** - Automatic invalidation and updates
- **Multi-schema** - Works across all Supabase schemas

---

## Adding New Tables

To add a new table (e.g., `batches`):

1. **Create query file**: `lib/queries/batches.ts`
2. **Add query keys**: Update `lib/queries/query-keys.ts`
3. **Create hook**: `hooks/use-batches.ts`
4. **Follow patterns**: Use the same structure as products/users

The architecture scales automatically! 🎯

---

## Schema Support

Our architecture works seamlessly across multiple Supabase schemas:

- **`inventory`** - Products, batches, stock management
- **`user_mgmt`** - Users, roles, permissions
- **`scoring`** - Analytics, category weights
- **Future schemas** - Easy to add with same patterns

Each schema is accessed with `supabase.schema('schema_name').from('table')`

---

*This architecture provides the foundation for a scalable, performant inventory management system with excellent developer experience and user performance.*