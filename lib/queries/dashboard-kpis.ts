// lib/queries/dashboard-kpis.ts

import { createClient } from '@/lib/supabase/client'

// KPI Data Types
export type InventoryKPI = {
  totalValue: number
  batchCount: number
  change: number
  changePercent: number
}

export type SalesKPI = {
  totalRevenue: number
  transactionCount: number
  change: number
  changePercent: number
}

export type DonationKPI = {
  totalValue: number
  recipientCount: number
  change: number
  changePercent: number
}

export type WasteKPI = {
  totalCost: number
  itemCount: number
  change: number
  changePercent: number
}

export type DashboardKPIs = {
  inventory: InventoryKPI
  sales: SalesKPI
  donations: DonationKPI
  waste: WasteKPI
}

// Helper to get date range for today and yesterday
function getDateRanges() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return {
    todayStart: today.toISOString(),
    todayEnd: tomorrow.toISOString(),
    yesterdayStart: yesterday.toISOString(),
    yesterdayEnd: today.toISOString(),
  }
}

// Fetch Inventory KPI (using direct batches table access)
export async function fetchInventoryKPI(storeId: string): Promise<InventoryKPI> {
  const supabase = createClient()

  // Current inventory value from active batches
  const { data: currentData, error: currentError } = await supabase
    .schema('inventory')
    .from('batches')
    .select('current_quantity, selling_price')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gt('current_quantity', 0)

  if (currentError) throw currentError

  const totalValue =
    currentData?.reduce((sum, batch) => sum + batch.current_quantity * batch.selling_price, 0) ?? 0

  const batchCount = currentData?.length ?? 0

  // Mock yesterday's change for now (can be improved with actual historical data)
  const change = totalValue > 0 ? 120 : 0
  const changePercent = totalValue > 0 ? (change / totalValue) * 100 : 0

  return {
    totalValue,
    batchCount,
    change,
    changePercent,
  }
}

// Fetch Sales KPI (using inventory.sales_summary view)
export async function fetchSalesKPI(storeId: string): Promise<SalesKPI> {
  const supabase = createClient()
  const dates = getDateRanges()

  // Today's sales using the sales_summary view
  const { data: todayData, error: todayError } = await supabase
    .schema('inventory')
    .from('sales_summary')
    .select('quantity_sold, sale_price')
    .eq('store_id', storeId)
    .gte('sale_timestamp', dates.todayStart)
    .lt('sale_timestamp', dates.todayEnd)

  if (todayError) throw todayError

  const totalRevenue =
    todayData?.reduce((sum, sale) => sum + sale.quantity_sold * sale.sale_price, 0) ?? 0

  const transactionCount = todayData?.length ?? 0

  // Yesterday's sales for comparison
  const { data: yesterdayData } = await supabase
    .schema('inventory')
    .from('sales_summary')
    .select('quantity_sold, sale_price')
    .eq('store_id', storeId)
    .gte('sale_timestamp', dates.yesterdayStart)
    .lt('sale_timestamp', dates.yesterdayEnd)

  const yesterdayRevenue =
    yesterdayData?.reduce((sum, sale) => sum + sale.quantity_sold * sale.sale_price, 0) ?? 0

  const change = totalRevenue - yesterdayRevenue
  const changePercent = yesterdayRevenue > 0 ? (change / yesterdayRevenue) * 100 : 0

  return {
    totalRevenue,
    transactionCount,
    change: change,
    changePercent: changePercent,
  }
}

// Fetch Donation KPI (using inventory.batch_actions)
export async function fetchDonationKPI(storeId: string): Promise<DonationKPI> {
  const supabase = createClient()
  const dates = getDateRanges()

  // Today's donations
  const { data: todayData, error: todayError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value, donation_recipient_id')
    .eq('store_id', storeId)
    .eq('actual_action', 'donate')
    .gte('action_date', dates.todayStart)
    .lt('action_date', dates.todayEnd)

  if (todayError) throw todayError

  const totalValue = todayData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const uniqueRecipients = new Set(
    todayData?.filter(a => a.donation_recipient_id).map(a => a.donation_recipient_id),
  )
  const recipientCount = uniqueRecipients.size

  // Yesterday's donations for comparison
  const { data: yesterdayData } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value')
    .eq('store_id', storeId)
    .eq('actual_action', 'donate')
    .gte('action_date', dates.yesterdayStart)
    .lt('action_date', dates.yesterdayEnd)

  const yesterdayValue =
    yesterdayData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const change = totalValue - yesterdayValue
  const changePercent = yesterdayValue > 0 ? (change / yesterdayValue) * 100 : 0

  return {
    totalValue,
    recipientCount,
    change: change,
    changePercent: changePercent,
  }
}

// Fetch Waste KPI (using inventory.batch_actions)
export async function fetchWasteKPI(storeId: string): Promise<WasteKPI> {
  const supabase = createClient()
  const dates = getDateRanges()

  // Today's waste
  const { data: todayData, error: todayError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value')
    .eq('store_id', storeId)
    .eq('actual_action', 'dispose')
    .gte('action_date', dates.todayStart)
    .lt('action_date', dates.todayEnd)

  if (todayError) throw todayError

  const totalCost = todayData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const itemCount = todayData?.length ?? 0

  // Yesterday's waste for comparison
  const { data: yesterdayData } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value')
    .eq('store_id', storeId)
    .eq('actual_action', 'dispose')
    .gte('action_date', dates.yesterdayStart)
    .lt('action_date', dates.yesterdayEnd)

  const yesterdayCost =
    yesterdayData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const change = totalCost - yesterdayCost
  const changePercent = yesterdayCost > 0 ? (change / yesterdayCost) * 100 : 0

  return {
    totalCost,
    itemCount,
    change: -change,
    changePercent: -changePercent,
  }
}

// Fetch all KPIs
export async function fetchDashboardKPIs(storeId: string): Promise<DashboardKPIs> {
  const [inventory, sales, donations, waste] = await Promise.all([
    fetchInventoryKPI(storeId),
    fetchSalesKPI(storeId),
    fetchDonationKPI(storeId),
    fetchWasteKPI(storeId),
  ])

  return {
    inventory,
    sales,
    donations,
    waste,
  }
}
