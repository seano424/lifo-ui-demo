// Mock data layer for dashboard redesign
// This is frontend-only mock data - no Supabase RPCs or migrations yet

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Dashboard redesign summary with KPI metrics and trends
 */
export interface DashboardRedesignSummary {
  // Expiring This Week
  expiring_count: number
  expiring_units: number
  expiring_count_prev: number

  // Active Batches
  active_batches: number
  active_products: number
  active_batches_prev: number

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

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SUMMARY_7D: DashboardRedesignSummary = {
  expiring_count: 3,
  expiring_units: 50,
  expiring_count_prev: 5,
  active_batches: 67,
  active_products: 42,
  active_batches_prev: 59,
  products_tracked: 73,
  products_total: 89,
  coverage_percent_prev: 77,
  value_at_risk: 340.0,
  value_at_risk_prev: 460.0,
}

const MOCK_SUMMARY_30D: DashboardRedesignSummary = {
  expiring_count: 12,
  expiring_units: 180,
  expiring_count_prev: 15,
  active_batches: 67,
  active_products: 42,
  active_batches_prev: 62,
  products_tracked: 73,
  products_total: 89,
  coverage_percent_prev: 75,
  value_at_risk: 1240.0,
  value_at_risk_prev: 1580.0,
}

const MOCK_SUMMARY_90D: DashboardRedesignSummary = {
  expiring_count: 28,
  expiring_units: 420,
  expiring_count_prev: 32,
  active_batches: 67,
  active_products: 42,
  active_batches_prev: 64,
  products_tracked: 73,
  products_total: 89,
  coverage_percent_prev: 72,
  value_at_risk: 3200.0,
  value_at_risk_prev: 3800.0,
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
// MOCK FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch dashboard redesign summary with KPI metrics
 * Mock version with simulated network delay
 */
export async function fetchDashboardRedesignSummary(
  _storeId: string,
  daysFilter: 7 | 30 | 90 = 7,
): Promise<DashboardRedesignSummary> {
  // Simulate network delay (300ms)
  await new Promise(resolve => setTimeout(resolve, 300))

  // Return mock data based on days filter
  if (daysFilter === 30) {
    return MOCK_SUMMARY_30D
  }
  if (daysFilter === 90) {
    return MOCK_SUMMARY_90D
  }
  return MOCK_SUMMARY_7D
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
