import { SupabaseClient } from '@supabase/supabase-js'

interface CsvItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Brand?: string
  Cost_Price?: number
  Selling_Price?: number
  Location?: string
  Unit_Type?: string
}

interface BulkProcessResult {
  processed: number
  errors: string[]
  warnings: string[]
  skipped: number
}

export class BulkInventoryOperations {
  constructor(private supabase: SupabaseClient) {}

  async processCsvBulk(
    csvData: CsvItem[],
    storeId: string,
    userId: string
  ): Promise<BulkProcessResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let processed = 0
    let skipped = 0

    try {
      // STEP 1: Bulk duplicate detection in single query
      console.time('bulk-duplicate-detection')
      const duplicateMap = await this.bulkDetectDuplicates(csvData, storeId)
      console.timeEnd('bulk-duplicate-detection')

      // STEP 2: Filter out duplicates
      const newItems = csvData.filter(item => {
        const key = `${item.SKU}:${item.Expiry_Date}`
        if (duplicateMap.has(key)) {
          skipped++
          warnings.push(`Skipped duplicate: ${item.Product_Name} (${item.Expiry_Date})`)
          return false
        }
        return true
      })

      if (newItems.length === 0) {
        return { processed: 0, errors, warnings, skipped }
      }

      // STEP 3: Bulk process in single transaction using stored procedure
      console.time('bulk-database-operations')
      const { data: result, error: procError } = await this.supabase
        .rpc('bulk_csv_import', {
          p_store_id: storeId,
          p_user_id: userId,
          p_csv_data: JSON.stringify(newItems)
        })

      console.timeEnd('bulk-database-operations')

      if (procError) {
        throw new Error(`Database procedure failed: ${procError.message}`)
      }

      if (!result.success) {
        errors.push(...(result.errors || []))
        return { processed: 0, errors, warnings, skipped }
      }

      processed = result.processed || newItems.length
      if (result.warnings) {
        warnings.push(...result.warnings)
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Bulk processing failed: ${message}`)
      console.error('Bulk processing error:', error)
    }

    return { processed, errors, warnings, skipped }
  }

  private async bulkDetectDuplicates(
    csvData: CsvItem[],
    storeId: string
  ): Promise<Map<string, boolean>> {
    const duplicateMap = new Map<string, boolean>()

    if (csvData.length === 0) {
      return duplicateMap
    }

    try {
      // Extract unique SKUs and expiry dates for efficient querying
      const skus = [...new Set(csvData.map(item => item.SKU))]
      const expiryDates = [...new Set(csvData.map(item => item.Expiry_Date))]

      // Single query to detect all duplicates using joins
      const { data: existingBatches, error } = await this.supabase
        .from('batches')
        .select(`
          expiry_date,
          store_products!inner(
            product:products!inner(sku)
          )
        `)
        .eq('store_id', storeId)
        .eq('status', 'active')
        .in('store_products.products.sku', skus)
        .in('expiry_date', expiryDates)

      if (error) {
        console.error('Duplicate detection error:', error)
        return duplicateMap
      }

      // Build duplicate lookup map for O(1) duplicate checking
      existingBatches?.forEach((batch: any) => {
        const sku = batch.store_products?.product?.sku
        if (sku) {
          const key = `${sku}:${batch.expiry_date}`
          duplicateMap.set(key, true)
        }
      })

    } catch (error) {
      console.error('Error in bulk duplicate detection:', error)
      // Return empty map to allow processing to continue
    }

    return duplicateMap
  }

  async validateStoreAccess(storeId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('store_users')
        .select('user_id')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      return !error && !!data
    } catch (error) {
      console.error('Store access validation error:', error)
      return false
    }
  }

  // Utility method for testing performance
  async benchmarkProcessing(csvData: CsvItem[], storeId: string, userId: string) {
    const startTime = Date.now()
    
    console.time('total-processing-time')
    const result = await this.processCsvBulk(csvData, storeId, userId)
    console.timeEnd('total-processing-time')
    
    const totalTime = Date.now() - startTime
    const itemsPerSecond = Math.round((result.processed / totalTime) * 1000)
    
    return {
      ...result,
      performance: {
        total_time_ms: totalTime,
        items_per_second: itemsPerSecond,
        items_processed: result.processed,
        items_skipped: result.skipped
      }
    }
  }
}