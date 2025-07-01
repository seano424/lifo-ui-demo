// lib/queries/query-keys.ts

import type { ProductFilters } from './products'
import type { UserFilters } from './users'
import type { BatchFilters } from './batches'

export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.lists(), { filters }] as const,
    infinite: (filters: ProductFilters) =>
      [...queryKeys.products.lists(), 'infinite', { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) => [...queryKeys.users.lists(), { filters }] as const,
    infinite: (filters: UserFilters) =>
      [...queryKeys.users.lists(), 'infinite', { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  batches: {
    all: ['batches'] as const,
    lists: () => [...queryKeys.batches.all, 'list'] as const,
    list: (filters: BatchFilters) => [...queryKeys.batches.lists(), { filters }] as const,
    infinite: (filters: BatchFilters) =>
      [...queryKeys.batches.lists(), 'infinite', { filters }] as const,
    details: () => [...queryKeys.batches.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.batches.details(), id] as const,
    byProduct: (productId: string) => [...queryKeys.batches.all, 'byProduct', productId] as const,
  },
} as const
