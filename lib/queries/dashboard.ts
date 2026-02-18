// Real data layer for dashboard redesign - queries Supabase directly
// No RPCs or migrations required

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Dashboard redesign summary with KPI metrics and trends
 */
export interface DashboardRedesignSummary {
  // Expiring within daysFilter window
  expiring_count: number
  expiring_units: number
  expiring_count_prev: number

  // Act on Today (active batches expiring today or already overdue)
  act_on_today_count: number

  // Coverage
  products_tracked: number
  products_total: number
  coverage_percent_prev: number | null

  // Value at Risk
  value_at_risk: number
  value_at_risk_prev: number
}

/**
 * Batch data for expiring table
 */
export interface BatchForTable {
  batch_id: string
  product_name: string
  sku: string
  expiry_date: string
  days_left: number
  current_quantity: number
  value: number
}

/**
 * Automation rule configuration
 */
export interface AutomationRule {
  rule_id: string
  name: string
  type: 'category' | 'product'
  products_count: number
  status: 'active' | 'paused'
}

const MOCK_EXPIRING_BATCHES: BatchForTable[] = [
  {
    batch_id: 'batch-001',
    product_name: 'Sliced Bread 400g',
    sku: 'BREAD-001',
    expiry_date: '2026-02-04',
    days_left: 2,
    current_quantity: 8,
    value: 19.6,
  },
  {
    batch_id: 'batch-002',
    product_name: 'Fresh Yogurt 500ml',
    sku: 'DAIRY-003',
    expiry_date: '2026-02-05',
    days_left: 3,
    current_quantity: 24,
    value: 67.2,
  },
  {
    batch_id: 'batch-003',
    product_name: 'Organic Juice 1L',
    sku: 'BEV-012',
    expiry_date: '2026-02-06',
    days_left: 4,
    current_quantity: 18,
    value: 53.1,
  },
  {
    batch_id: 'batch-004',
    product_name: 'Mixed Nuts 250g',
    sku: 'SNACK-001',
    expiry_date: '2026-02-19',
    days_left: 17,
    current_quantity: 50,
    value: 124.5,
  },
  {
    batch_id: 'batch-005',
    product_name: 'Tomato Soup',
    sku: 'SKU-007',
    expiry_date: '2026-03-13',
    days_left: 39,
    current_quantity: 45,
    value: 89.55,
  },
]

const MOCK_AUTOMATION_RULES: AutomationRule[] = [
  {
    rule_id: 'rule-001',
    name: 'Dairy',
    type: 'category',
    products_count: 12,
    status: 'active',
  },
  {
    rule_id: 'rule-002',
    name: 'Canned Goods',
    type: 'category',
    products_count: 8,
    status: 'active',
  },
  {
    rule_id: 'rule-003',
    name: 'Fresh Bread 400g',
    type: 'product',
    products_count: 1,
    status: 'active',
  },
  {
    rule_id: 'rule-004',
    name: 'Snacks',
    type: 'category',
    products_count: 15,
    status: 'paused',
  },
]

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch dashboard redesign summary with KPI metrics
 * Queries Supabase directly — no RPC or migration required
 */
export async function fetchDashboardRedesignSummary(
  storeId: string,
  daysFilter: 7 | 30 | 90 = 7,
): Promise<DashboardRedesignSummary> {
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Use local date parts to avoid UTC offset shifting the date when toISOString() is called
  const toDateStr = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayStr = toDateStr(today)

  const futureEnd = new Date(today)
  futureEnd.setDate(futureEnd.getDate() + daysFilter)
  const futureEndStr = toDateStr(futureEnd)

  const pastStart = new Date(today)
  pastStart.setDate(pastStart.getDate() - daysFilter)
  const pastStartStr = toDateStr(pastStart)

  const [expiringResult, prevExpiringResult, activeBatchesResult, storeProductsResult] =
    await Promise.all([
      // 1. Batches expiring within the current daysFilter window
      supabase
        .schema('inventory')
        .from('batches')
        .select('batch_id, current_quantity, selling_price, product_id')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .gte('expiry_date', todayStr)
        .lte('expiry_date', futureEndStr)
        .gt('current_quantity', 0),

      // 2. Batches whose expiry fell in the previous equivalent window (for trend comparison)
      //    Uses initial_quantity since current_quantity may be 0 for already-actioned batches
      supabase
        .schema('inventory')
        .from('batches')
        .select('batch_id, initial_quantity, selling_price')
        .eq('store_id', storeId)
        .neq('status', 'draft')
        .gte('expiry_date', pastStartStr)
        .lt('expiry_date', todayStr),

      // 3. All currently active batches — used for act_on_today, coverage, and prev coverage
      supabase
        .schema('inventory')
        .from('batches')
        .select('batch_id, product_id, expiry_date, received_date')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .gt('current_quantity', 0),

      // 4. Total products in the store's catalog
      supabase
        .schema('inventory')
        .from('store_products')
        .select('product_id')
        .eq('store_id', storeId)
        .eq('is_active', true),
    ])

  if (expiringResult.error)
    throw new Error(`Failed to fetch expiring batches: ${expiringResult.error.message}`)
  if (prevExpiringResult.error)
    throw new Error(`Failed to fetch previous batches: ${prevExpiringResult.error.message}`)
  if (activeBatchesResult.error)
    throw new Error(`Failed to fetch active batches: ${activeBatchesResult.error.message}`)
  if (storeProductsResult.error)
    throw new Error(`Failed to fetch store products: ${storeProductsResult.error.message}`)

  // --- Expiring (current window) ---
  const expiringBatches = expiringResult.data ?? []
  const expiring_count = expiringBatches.length
  const expiring_units = expiringBatches.reduce((sum, b) => sum + Number(b.current_quantity), 0)
  const value_at_risk = expiringBatches.reduce(
    (sum, b) => sum + Number(b.current_quantity) * Number(b.selling_price),
    0,
  )

  // --- Expiring (previous window) ---
  const prevExpiringBatches = prevExpiringResult.data ?? []
  const expiring_count_prev = prevExpiringBatches.length
  const value_at_risk_prev = prevExpiringBatches.reduce(
    (sum, b) => sum + Number(b.initial_quantity) * Number(b.selling_price),
    0,
  )

  // --- Active batches ---
  const activeBatches = activeBatchesResult.data ?? []

  // Act on Today: active batches already expired or expiring today (daily action queue)
  const act_on_today_count = activeBatches.filter(
    b => b.expiry_date !== null && b.expiry_date <= todayStr,
  ).length

  // Coverage: unique products with at least one active batch
  const uniqueActiveProducts = new Set(activeBatches.map(b => b.product_id))
  const products_tracked = uniqueActiveProducts.size
  const products_total = storeProductsResult.data?.length ?? products_tracked

  // Previous coverage: products tracked from batches received before the current period
  const prevActiveBatches = activeBatches.filter(
    b => b.received_date !== null && b.received_date < pastStartStr,
  )
  const prevUniqueProducts = new Set(prevActiveBatches.map(b => b.product_id))
  const coverage_percent_prev =
    products_total > 0 ? Math.round((prevUniqueProducts.size / products_total) * 100) : null

  return {
    expiring_count,
    expiring_units,
    expiring_count_prev,
    act_on_today_count,
    products_tracked,
    products_total,
    coverage_percent_prev,
    value_at_risk,
    value_at_risk_prev,
  }
}

/**
 * Fetch top expiring batches
 * Mock version with simulated network delay
 */
export async function fetchTopExpiringBatches(
  _storeId: string,
  limit: number = 5,
): Promise<BatchForTable[]> {
  // Simulate network delay (300ms)
  await new Promise(resolve => setTimeout(resolve, 300))

  // Return mock data limited to requested count
  return MOCK_EXPIRING_BATCHES.slice(0, limit)
}

/**
 * Fetch automation rules
 * Mock version with simulated network delay
 * Returns empty array until automation table exists
 */
export async function fetchAutomationRules(_storeId: string): Promise<AutomationRule[]> {
  // Simulate network delay (300ms)
  await new Promise(resolve => setTimeout(resolve, 300))

  // Return mock automation rules for demo purposes
  // In production, this will return [] until automation_rules table is created
  return MOCK_AUTOMATION_RULES
}
