// lib/queries/query-keys.ts
import type { ProductFilters } from './products'
import type { UserFilters } from './users'
import type { BatchFilters } from './batches'
import type { StoreUserFilters } from './store-users'

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

  // Store-aware product queries (now using normalized schema with store_products junction table)
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    // Store-specific queries - these query through the store_products junction table
    byStore: (storeId: string) => [...queryKeys.products.all, 'byStore', storeId] as const,
    list: (storeId: string, filters: ProductFilters) =>
      [...queryKeys.products.byStore(storeId), 'list', { filters }] as const,
    infinite: (storeId: string, filters: ProductFilters) =>
      [...queryKeys.products.byStore(storeId), 'infinite', { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Product lookup and recognition queries
  productLookup: {
    all: ['productLookup'] as const,
    byBarcode: (barcode: string) => [...queryKeys.productLookup.all, barcode] as const,
    search: (query: string) => [...queryKeys.productLookup.all, 'search', query] as const,
    cache: () => [...queryKeys.productLookup.all, 'cache'] as const,
    verification: (barcode: string) =>
      [...queryKeys.productLookup.all, 'verification', barcode] as const,
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

  // Store users queries
  storeUsers: {
    all: ['storeUsers'] as const,
    byStore: (storeId: string) => [...queryKeys.storeUsers.all, 'byStore', storeId] as const,
    list: (storeId: string, filters: StoreUserFilters) =>
      [...queryKeys.storeUsers.byStore(storeId), 'list', { filters }] as const,
    infinite: (storeId: string, filters: StoreUserFilters) =>
      [...queryKeys.storeUsers.byStore(storeId), 'infinite', { filters }] as const,
    detail: (storeId: string, userId: string) =>
      [...queryKeys.storeUsers.byStore(storeId), 'detail', userId] as const,

    // Convenience queries for specific roles
    owners: (storeId: string) =>
      [...queryKeys.storeUsers.byStore(storeId), 'role', 'owner'] as const,
    managers: (storeId: string) =>
      [...queryKeys.storeUsers.byStore(storeId), 'role', 'manager'] as const,
    employees: (storeId: string) =>
      [...queryKeys.storeUsers.byStore(storeId), 'role', 'employee'] as const,
    pinEnabled: (storeId: string) =>
      [...queryKeys.storeUsers.byStore(storeId), 'pinEnabled'] as const,
  },

  // Updated user queries to support new auth.users structure
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) => [...queryKeys.users.lists(), { filters }] as const,
    infinite: (filters: UserFilters) =>
      [...queryKeys.users.lists(), 'infinite', { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,

    // New queries for PIN authentication system
    pinRequired: () => [...queryKeys.users.all, 'pinRequired'] as const,
    pinLocked: () => [...queryKeys.users.all, 'pinLocked'] as const,

    // Role-specific queries
    roles: (userId: string) => [...queryKeys.users.detail(userId), 'roles'] as const,
    hasRole: (userId: string, role: string) =>
      [...queryKeys.users.detail(userId), 'hasRole', role] as const,
    withRoles: (userId: string) => [...queryKeys.users.detail(userId), 'withRoles'] as const,

    // User management queries
    byRole: (role: string) => [...queryKeys.users.all, 'byRole', role] as const,
    active: () => [...queryKeys.users.all, 'active'] as const,
    inactive: () => [...queryKeys.users.all, 'inactive'] as const,
  },

  // PIN delivery tracking queries (new with migration)
  pinDeliveries: {
    all: ['pinDeliveries'] as const,
    byUser: (userId: string) => [...queryKeys.pinDeliveries.all, 'byUser', userId] as const,
    byStore: (storeId: string) => [...queryKeys.pinDeliveries.all, 'byStore', storeId] as const,
    pending: () => [...queryKeys.pinDeliveries.all, 'pending'] as const,
    delivered: () => [...queryKeys.pinDeliveries.all, 'delivered'] as const,
  },

  // Authentication-related queries (enhanced with store role support)
  auth: {
    currentUser: () => ['currentUser'] as const,
    currentUserRoles: () => ['currentUser', 'roles'] as const,
    currentUserPermissions: () => ['currentUser', 'permissions'] as const,
    currentUserStoreRole: (storeId: string) => ['currentUser', 'storeRole', storeId] as const,
    session: () => ['auth', 'session'] as const,
  },

  // Scanning workflow queries (for caching OCR results, etc.)
  scanning: {
    all: ['scanning'] as const,
    ocr: () => [...queryKeys.scanning.all, 'ocr'] as const,
    ocrResult: (imageHash: string) => [...queryKeys.scanning.ocr(), imageHash] as const,
    batchCreation: () => [...queryKeys.scanning.all, 'batchCreation'] as const,
  },

  // Inventory submission workflow queries
  inventorySubmission: {
    all: ['inventorySubmission'] as const,
    single: () => [...queryKeys.inventorySubmission.all, 'single'] as const,
    batch: () => [...queryKeys.inventorySubmission.all, 'batch'] as const,
    history: (storeId: string) =>
      [...queryKeys.inventorySubmission.all, 'history', storeId] as const,
  },


  // Urgent alerts queries for dashboard
  urgentAlerts: {
    all: ['urgentAlerts'] as const,
    byStore: (storeId: string) => [...queryKeys.urgentAlerts.all, 'byStore', storeId] as const,

  // Dashboard KPI queries
  dashboardKPIs: {
    all: ['dashboardKPIs'] as const,
    byStore: (storeId: string) => [...queryKeys.dashboardKPIs.all, 'byStore', storeId] as const,
    inventory: (storeId: string) =>
      [...queryKeys.dashboardKPIs.byStore(storeId), 'inventory'] as const,
    sales: (storeId: string) => [...queryKeys.dashboardKPIs.byStore(storeId), 'sales'] as const,
    donations: (storeId: string) =>
      [...queryKeys.dashboardKPIs.byStore(storeId), 'donations'] as const,
    waste: (storeId: string) => [...queryKeys.dashboardKPIs.byStore(storeId), 'waste'] as const,
  },
} as const

// Type helpers for query key validation
export type QueryKey = typeof queryKeys
export type UserQueryKeys = typeof queryKeys.users
export type ProductQueryKeys = typeof queryKeys.products
export type ProductLookupQueryKeys = typeof queryKeys.productLookup
export type BatchQueryKeys = typeof queryKeys.batches
export type StoreQueryKeys = typeof queryKeys.stores
export type StoreUserQueryKeys = typeof queryKeys.storeUsers
export type AuthQueryKeys = typeof queryKeys.auth
export type ScanningQueryKeys = typeof queryKeys.scanning
export type InventorySubmissionQueryKeys = typeof queryKeys.inventorySubmission
