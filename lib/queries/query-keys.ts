// lib/queries/query-keys.ts
import type { ProductFilters } from './products'
import type { UserFilters } from './users'
import type { BatchFilters } from './batches'

export const queryKeys = {
  // Store-related queries
  stores: {
    all: ['stores'] as const,
    userStores: (userId: string) => [...queryKeys.stores.all, 'userStores', userId] as const,
    detail: (storeId: string) => [...queryKeys.stores.all, 'detail', storeId] as const,
  },

  // User preferences
  userPreferences: {
    all: ['userPreferences'] as const,
    detail: (userId: string) => [...queryKeys.userPreferences.all, userId] as const,
  },

  // Store-aware product queries
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    // Store-specific queries
    byStore: (storeId: string) => [...queryKeys.products.all, 'byStore', storeId] as const,
    list: (storeId: string, filters: ProductFilters) =>
      [...queryKeys.products.byStore(storeId), 'list', { filters }] as const,
    infinite: (storeId: string, filters: ProductFilters) =>
      [...queryKeys.products.byStore(storeId), 'infinite', { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Store-aware batch queries
  batches: {
    all: ['batches'] as const,
    lists: () => [...queryKeys.batches.all, 'list'] as const,
    // Store-specific queries
    byStore: (storeId: string) => [...queryKeys.batches.all, 'byStore', storeId] as const,
    list: (storeId: string, filters: BatchFilters) =>
      [...queryKeys.batches.byStore(storeId), 'list', { filters }] as const,
    infinite: (storeId: string, filters: BatchFilters) =>
      [...queryKeys.batches.byStore(storeId), 'infinite', { filters }] as const,
    details: () => [...queryKeys.batches.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.batches.details(), id] as const,
    byProduct: (storeId: string, productId: string) =>
      [...queryKeys.batches.byStore(storeId), 'byProduct', productId] as const,
  },

  // User queries (unchanged)
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) => [...queryKeys.users.lists(), { filters }] as const,
    infinite: (filters: UserFilters) =>
      [...queryKeys.users.lists(), 'infinite', { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
} as const
