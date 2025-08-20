import { createClient } from '@/lib/supabase/client'
import { TimeRange } from '@/components/dashboard/TimeSelector'
import { TrendDirection } from '@/components/dashboard/TrendIndicator'

export interface KPITrendData {
  name: string
  current: number
  previous: number
  change: number
  changePercent: number
  trend: TrendDirection
  periodMin?: number
  periodMax?: number
  minDate?: Date
  maxDate?: Date
  metadata?: {
    batchCount?: number
    productCount?: number
    transactionCount?: number
    recipientCount?: number
    itemCount?: number
  }
}

export interface DashboardKPITrends {
  inventory: KPITrendData
  sales: KPITrendData
  donations: KPITrendData
  waste: KPITrendData
}

function calculateTrend(current: number, previous: number): TrendDirection {
  const threshold = 0.01
  const changePercent = previous > 0 ? (current - previous) / previous : 0

  if (Math.abs(changePercent) < threshold) return 'stable'
  return current > previous ? 'up' : 'down'
}

function calculateChange(current: number, previous: number) {
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : 0

  return {
    change,
    changePercent,
    trend: calculateTrend(current, previous),
  }
}

export async function fetchInventoryKPITrends(
  storeId: string,
  timeRange: TimeRange,
): Promise<KPITrendData> {
  const supabase = createClient()

  const { data: currentData, error: currentError } = await supabase
    .schema('inventory')
    .from('batches')
    .select('current_quantity, selling_price, product_id, created_at')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gte('created_at', timeRange.start.toISOString())
    .lte('created_at', timeRange.end.toISOString())
    .gt('current_quantity', 0)

  if (currentError) throw currentError

  const { data: previousData, error: previousError } = await supabase
    .schema('inventory')
    .from('batches')
    .select('current_quantity, selling_price, product_id')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gte('created_at', timeRange.compareStart.toISOString())
    .lte('created_at', timeRange.compareEnd.toISOString())
    .gt('current_quantity', 0)

  if (previousError) throw previousError

  const current =
    currentData?.reduce((sum, batch) => sum + batch.current_quantity * batch.selling_price, 0) ?? 0
  const previous =
    previousData?.reduce((sum, batch) => sum + batch.current_quantity * batch.selling_price, 0) ?? 0

  const uniqueProducts = new Set(currentData?.map(batch => batch.product_id) ?? [])

  const dailyValues =
    currentData?.reduce(
      (acc, batch) => {
        const date = new Date(batch.created_at).toDateString()
        const value = batch.current_quantity * batch.selling_price
        acc[date] = (acc[date] || 0) + value
        return acc
      },
      {} as Record<string, number>,
    ) ?? {}

  const values = Object.values(dailyValues)
  const periodMin = values.length > 0 ? Math.min(...values) : current
  const periodMax = values.length > 0 ? Math.max(...values) : current

  const { change, changePercent, trend } = calculateChange(current, previous)

  return {
    name: 'Total Inventory Value',
    current,
    previous,
    change,
    changePercent,
    trend,
    periodMin,
    periodMax,
    metadata: {
      batchCount: currentData?.length ?? 0,
      productCount: uniqueProducts.size,
    },
  }
}

export async function fetchSalesKPITrends(
  storeId: string,
  timeRange: TimeRange,
): Promise<KPITrendData> {
  const supabase = createClient()

  const { data: currentData, error: currentError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('recovered_value, action_date')
    .eq('store_id', storeId)
    .eq('actual_action', 'discount')
    .gte('action_date', timeRange.start.toISOString())
    .lte('action_date', timeRange.end.toISOString())

  if (currentError) throw currentError

  const { data: previousData, error: previousError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('recovered_value')
    .eq('store_id', storeId)
    .eq('actual_action', 'discount')
    .gte('action_date', timeRange.compareStart.toISOString())
    .lte('action_date', timeRange.compareEnd.toISOString())

  if (previousError) throw previousError

  const current = currentData?.reduce((sum, action) => sum + (action.recovered_value || 0), 0) ?? 0
  const previous =
    previousData?.reduce((sum, action) => sum + (action.recovered_value || 0), 0) ?? 0

  const dailySales =
    currentData?.reduce(
      (acc, action) => {
        const date = new Date(action.action_date).toDateString()
        const value = action.recovered_value || 0
        acc[date] = (acc[date] || 0) + value
        return acc
      },
      {} as Record<string, number>,
    ) ?? {}

  const values = Object.values(dailySales)
  const periodMin = values.length > 0 ? Math.min(...values) : 0
  const periodMax = values.length > 0 ? Math.max(...values) : current

  let minDate: Date | undefined
  let maxDate: Date | undefined

  if (values.length > 0) {
    const entries = Object.entries(dailySales)
    const minEntry = entries.find(([, value]) => value === periodMin)
    const maxEntry = entries.find(([, value]) => value === periodMax)
    minDate = minEntry ? new Date(minEntry[0]) : undefined
    maxDate = maxEntry ? new Date(maxEntry[0]) : undefined
  }

  const { change, changePercent, trend } = calculateChange(current, previous)

  return {
    name: 'Sales Revenue',
    current,
    previous,
    change,
    changePercent,
    trend,
    periodMin,
    periodMax,
    minDate,
    maxDate,
    metadata: {
      transactionCount: currentData?.length ?? 0,
    },
  }
}

export async function fetchDonationKPITrends(
  storeId: string,
  timeRange: TimeRange,
): Promise<KPITrendData> {
  const supabase = createClient()

  const { data: currentData, error: currentError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value, donation_recipient_id, action_date')
    .eq('store_id', storeId)
    .eq('actual_action', 'donate')
    .gte('action_date', timeRange.start.toISOString())
    .lte('action_date', timeRange.end.toISOString())

  if (currentError) throw currentError

  const { data: previousData, error: previousError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value, donation_recipient_id')
    .eq('store_id', storeId)
    .eq('actual_action', 'donate')
    .gte('action_date', timeRange.compareStart.toISOString())
    .lte('action_date', timeRange.compareEnd.toISOString())

  if (previousError) throw previousError

  const current = currentData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0
  const previous = previousData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const uniqueRecipients = new Set(
    currentData?.filter(a => a.donation_recipient_id).map(a => a.donation_recipient_id),
  )

  const dailyDonations =
    currentData?.reduce(
      (acc, action) => {
        const date = new Date(action.action_date).toDateString()
        const value = action.original_value || 0
        acc[date] = (acc[date] || 0) + value
        return acc
      },
      {} as Record<string, number>,
    ) ?? {}

  const values = Object.values(dailyDonations)
  const periodMin = values.length > 0 ? Math.min(...values) : 0
  const periodMax = values.length > 0 ? Math.max(...values) : current

  const { change, changePercent, trend } = calculateChange(current, previous)

  return {
    name: 'Donations Value',
    current,
    previous,
    change,
    changePercent,
    trend,
    periodMin,
    periodMax,
    metadata: {
      recipientCount: uniqueRecipients.size,
    },
  }
}

export async function fetchWasteKPITrends(
  storeId: string,
  timeRange: TimeRange,
): Promise<KPITrendData> {
  const supabase = createClient()

  const { data: currentData, error: currentError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value, action_date')
    .eq('store_id', storeId)
    .eq('actual_action', 'dispose')
    .gte('action_date', timeRange.start.toISOString())
    .lte('action_date', timeRange.end.toISOString())

  if (currentError) throw currentError

  const { data: previousData, error: previousError } = await supabase
    .schema('inventory')
    .from('batch_actions')
    .select('original_value')
    .eq('store_id', storeId)
    .eq('actual_action', 'dispose')
    .gte('action_date', timeRange.compareStart.toISOString())
    .lte('action_date', timeRange.compareEnd.toISOString())

  if (previousError) throw previousError

  const current = currentData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0
  const previous = previousData?.reduce((sum, action) => sum + (action.original_value || 0), 0) ?? 0

  const dailyWaste =
    currentData?.reduce(
      (acc, action) => {
        const date = new Date(action.action_date).toDateString()
        const value = action.original_value || 0
        acc[date] = (acc[date] || 0) + value
        return acc
      },
      {} as Record<string, number>,
    ) ?? {}

  const values = Object.values(dailyWaste)
  const periodMin = values.length > 0 ? Math.min(...values) : 0
  const periodMax = values.length > 0 ? Math.max(...values) : current

  const { change, changePercent, trend } = calculateChange(current, previous)

  return {
    name: 'Waste Cost',
    current,
    previous,
    change: -change,
    changePercent: -changePercent,
    trend: trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable',
    periodMin,
    periodMax,
    metadata: {
      itemCount: currentData?.length ?? 0,
    },
  }
}

export async function fetchDashboardKPITrends(
  storeId: string,
  timeRange: TimeRange,
): Promise<DashboardKPITrends> {
  const [inventory, sales, donations, waste] = await Promise.all([
    fetchInventoryKPITrends(storeId, timeRange),
    fetchSalesKPITrends(storeId, timeRange),
    fetchDonationKPITrends(storeId, timeRange),
    fetchWasteKPITrends(storeId, timeRange),
  ])

  return {
    inventory,
    sales,
    donations,
    waste,
  }
}
