import type { BatchFilters } from './batches'
import type { ProductFilters } from './products'
import type { StoreUserFilters } from './store-users'
import type { TodoCompletionStatus, TodoFilters, TodoSection, TodoUrgencyLevel } from './todos-rpc'
import type { UserFilters } from './users'

export const queryKeys = {
  // Store-related queries
  stores: {
    all: ['stores'] as const,
    userStores: (userId: string) => [...queryKeys.stores.all, 'userStores', userId] as const,
    detail: (storeId: string) => [...queryKeys.stores.all, 'detail', storeId] as const,
  },

  // Enhanced Todos and RPC queries with flexible filtering support
  todos: {
    all: ['todos'] as const,

    // NEW: Flexible filtering query key - The main one you'll use
    withFilters: (storeId: string, filters: TodoFilters, pageSize: number) =>
      [...queryKeys.todos.all, 'filtered', { storeId, filters, pageSize }] as const,

    // Convenience keys for common filter patterns
    byStatus: (storeId: string, status: TodoCompletionStatus, pageSize: number) =>
      [...queryKeys.todos.all, 'by-status', { storeId, status, pageSize }] as const,

    byUrgency: (storeId: string, urgency: TodoUrgencyLevel[], pageSize: number) =>
      [...queryKeys.todos.all, 'by-urgency', { storeId, urgency, pageSize }] as const,

    // BACKWARD COMPATIBILITY: Keep old section-based keys during migration
    bySection: (storeId: string, section: TodoSection, pageSize: number) =>
      [...queryKeys.todos.all, 'section', { storeId, section, pageSize }] as const,

    // Dashboard queries
    summary: (storeId: string) => [...queryKeys.todos.all, 'summary', storeId] as const,

    dashboardSummary: (storeId: string) =>
      [...queryKeys.todos.all, 'dashboardSummary', storeId] as const,

    overview: (storeId: string) => [...queryKeys.todos.all, 'overview', storeId] as const,

    // Ultra-fast urgent count for sidebar badge (uses materialized view)
    urgentCount: (storeId: string) => [...queryKeys.todos.all, 'urgent-count', storeId] as const,

    // Tab counts for all filters (efficient count query without fetching full data)
    counts: (storeId: string, filters: TodoFilters) =>
      [...queryKeys.todos.all, 'counts', { storeId, filters }] as const,

    // Specific convenience keys for common combinations
    pending: (storeId: string, filters?: Partial<TodoFilters>, pageSize: number = 20) =>
      [...queryKeys.todos.all, 'pending', { storeId, filters, pageSize }] as const,

    inProgress: (storeId: string, filters?: Partial<TodoFilters>, pageSize: number = 20) =>
      [...queryKeys.todos.all, 'in-progress', { storeId, filters, pageSize }] as const,

    completed: (storeId: string, filters?: Partial<TodoFilters>, pageSize: number = 20) =>
      [...queryKeys.todos.all, 'completed', { storeId, filters, pageSize }] as const,

    urgent: (storeId: string, pageSize: number = 20) =>
      [...queryKeys.todos.all, 'urgent', { storeId, pageSize }] as const,

    expiring: (storeId: string, daysMax: number, pageSize: number = 20) =>
      [...queryKeys.todos.all, 'expiring', { storeId, daysMax, pageSize }] as const,

    // Legacy section queries (kept for backward compatibility)
    lists: () => [...queryKeys.todos.all, 'list'] as const,
    discounted: (storeId: string, limit: number) =>
      [...queryKeys.todos.lists(), 'discounted', storeId, limit] as const,
    donated: (storeId: string, limit: number, daysBack: number) =>
      [...queryKeys.todos.lists(), 'donated', storeId, limit, daysBack] as const,
    expired: (storeId: string, limit: number) =>
      [...queryKeys.todos.lists(), 'expired', storeId, limit] as const,
    history: (storeId: string, limit: number, actionType?: string) =>
      [
        ...queryKeys.todos.lists(),
        'history',
        storeId,
        limit,
        ...(actionType ? [actionType] : []),
      ] as const,
    active: (storeId: string, limit: number) =>
      [...queryKeys.todos.lists(), 'active', storeId, limit] as const,
    reeval: (storeId: string, limit: number) =>
      [...queryKeys.todos.lists(), 'reeval', storeId, limit] as const,

    // Actionable batches with filtering (existing)
    actionableBatches: (
      storeId: string,
      limit: number,
      urgencyFilter?: string,
      stateFilter?: string,
    ) =>
      [
        ...queryKeys.todos.lists(),
        'actionableBatches',
        storeId,
        limit,
        ...(urgencyFilter ? [urgencyFilter] : []),
        ...(stateFilter ? [stateFilter] : []),
      ] as const,
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

  // Categories queries
  categories: {
    all: ['categories'] as const,
    list: ['categories', 'list'] as const,
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
    // Batch todo state queries (for accessing batch_todo_states view)
    todo: (batchId: string) => [...queryKeys.batches.all, 'todo', batchId] as const,
    // Check if store has any batches (for welcome screen logic)
    hasBatches: (storeId: string) => [...queryKeys.batches.byStore(storeId), 'hasBatches'] as const,
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
  },

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

  // Store insights queries
  storeInsights: {
    all: ['storeInsights'] as const,
    store: (storeId: string) => [...queryKeys.storeInsights.all, 'store', storeId] as const,
    actionable: (storeId: string) =>
      [...queryKeys.storeInsights.all, 'actionable', storeId] as const,
    allStores: () => [...queryKeys.storeInsights.all, 'allStores'] as const,
  },

  // Donation queries
  donations: {
    all: ['donations'] as const,
    recipients: (storeId: string) => [...queryKeys.donations.all, 'recipients', storeId] as const,
    actions: (storeId: string) => [...queryKeys.donations.all, 'actions', storeId] as const,
    analytics: (storeId: string) => [...queryKeys.donations.all, 'analytics', storeId] as const,
  },

  // Batch action queries for inventory management
  batchActions: {
    all: ['batchActions'] as const,
    byStore: (storeId: string) => [...queryKeys.batchActions.all, 'byStore', storeId] as const,
    history: (storeId: string, days?: number) =>
      [...queryKeys.batchActions.byStore(storeId), 'history', { days }] as const,
    infinite: (storeId: string, pageSize: number, filters?: object) =>
      [
        ...queryKeys.batchActions.byStore(storeId),
        'infinite',
        'pageSize',
        pageSize,
        ...(filters ? ['filters', JSON.stringify(filters)] : []),
      ] as const,
  },

  // Scoring and analytics queries (served by Next.js API routes)
  alerts: {
    all: ['alerts'] as const,
    store: (storeId: string, threshold?: number) =>
      [...queryKeys.alerts.all, 'store', storeId, threshold] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    store: (storeId: string, timeframe?: string) =>
      [...queryKeys.analytics.all, 'store', storeId, timeframe] as const,
    dashboard: (storeId: string) => [...queryKeys.analytics.all, 'dashboard', storeId] as const,
  },

  // Keep fastapi namespace for any remaining direct calls (deprecated)
  fastapi: {
    all: ['fastapi'] as const,

    // Scoring endpoints (deprecated - use queryKeys.alerts instead)
    scoring: {
      all: ['fastapi', 'scoring'] as const,
      alerts: (storeId: string, threshold?: number) =>
        [...queryKeys.fastapi.scoring.all, 'alerts', storeId, threshold] as const,
      recommendations: (storeId: string, category?: string) =>
        [...queryKeys.fastapi.scoring.all, 'recommendations', storeId, category] as const,
    },

    // Analytics endpoints (deprecated - use queryKeys.analytics instead)
    analytics: {
      all: ['fastapi', 'analytics'] as const,
      store: (storeId: string, timeframe?: string) =>
        [...queryKeys.fastapi.analytics.all, 'store', storeId, timeframe] as const,
      dashboard: (storeId: string) =>
        [...queryKeys.fastapi.analytics.all, 'dashboard', storeId] as const,
    },

    // Mobile endpoints
    mobile: {
      all: ['fastapi', 'mobile'] as const,
      summary: (storeId: string) => [...queryKeys.fastapi.mobile.all, 'summary', storeId] as const,
    },
  },
} as const

// Type-safe helper functions for section-specific keys (backward compatibility)
export const todosSectionKeys = {
  bySection: (storeId: string, section: TodoSection, limit: number) =>
    queryKeys.todos.bySection(storeId, section, limit),

  // Specific section keys for better type safety
  immediateAction: (storeId: string, limit: number = 10) =>
    queryKeys.todos.bySection(storeId, 'immediate_action' as TodoSection, limit),

  recentlyExpired: (storeId: string, limit: number = 20) =>
    queryKeys.todos.bySection(storeId, 'recently_expired' as TodoSection, limit),

  inProgress: (storeId: string, limit: number = 30) =>
    queryKeys.todos.bySection(storeId, 'in_progress' as TodoSection, limit),

  discounted: (storeId: string, limit: number = 20) =>
    queryKeys.todos.bySection(storeId, 'discounted' as TodoSection, limit),

  readyForDonation: (storeId: string, limit: number = 15) =>
    queryKeys.todos.bySection(storeId, 'ready_for_donation' as TodoSection, limit),

  completedToday: (storeId: string, limit: number = 10) =>
    queryKeys.todos.bySection(storeId, 'completed_today' as TodoSection, limit),

  actionHistory: (storeId: string, limit: number = 50) =>
    queryKeys.todos.bySection(storeId, 'action_history' as TodoSection, limit),

  needsReeval: (storeId: string, limit: number = 20) =>
    queryKeys.todos.bySection(storeId, 'needs_reeval' as TodoSection, limit),
}

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
