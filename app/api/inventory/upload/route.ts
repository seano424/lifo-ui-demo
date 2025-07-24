import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
// Note: CSV processing handled by Python backend (UnifiedCSVProcessor)
// Simple validation operations handled by TypeScript
import { InventoryOperations } from '@/lib/database/operations'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

interface UnifiedProcessorResult {
  status: 'success' | 'warning' | 'error'
  data: ProcessedRow[]
  processed_count: number
  warnings: string[]
  errors: string[]
  metadata: {
    store_id: string
    processed_at: string
    processed_by: string
  }
}

interface ProcessedRow {
  sku: string
  product_name: string
  category: string
  quantity: number
  expiry_date: string
  brand?: string
  cost_price?: number
  selling_price?: number
  manufacture_date?: string
  location_code: string
  unit_type: string
  batch_number: string
  store_id: string
  created_by: string
  status: string
}

// Unified CSV processor integration
class UnifiedCSVProcessor {
  private pythonPath: string
  private processorPath: string

  constructor() {
    // Use the virtual environment Python if available, otherwise system Python
    this.pythonPath = join(process.cwd(), 'lifo_ai_core/venv/bin/python')
    this.processorPath = join(process.cwd(), 'lifo_ai_core/etl/unified_csv_processor.py')
  }

  async processCsv(
    fileContent: Buffer,
    storeId: string,
    userId: string,
  ): Promise<UnifiedProcessorResult> {
    return new Promise((resolve, reject) => {
      // Create temporary file
      const tempFileName = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.csv`
      const tempFilePath = join(tmpdir(), tempFileName)

      try {
        // Write file content to temporary file
        writeFileSync(tempFilePath, fileContent)

        // Prepare Python command arguments
        const args = [
          '-c',
          `
import asyncio
import sys
sys.path.insert(0, '${join(process.cwd(), 'lifo_ai_core')}')
from etl.unified_csv_processor import UnifiedCSVProcessor

async def main():
    processor = UnifiedCSVProcessor('${storeId}', '${userId}')
    result = await processor.process_csv_file('${tempFilePath}')
    print('JSON_RESULT:' + str(result).replace("'", '"'))

asyncio.run(main())
          `,
        ]

        // Spawn Python process
        const pythonProcess = spawn(this.pythonPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stdout = ''
        let stderr = ''

        pythonProcess.stdout.on('data', data => {
          stdout += data.toString()
        })

        pythonProcess.stderr.on('data', data => {
          stderr += data.toString()
        })

        pythonProcess.on('close', code => {
          // Clean up temporary file
          try {
            unlinkSync(tempFilePath)
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError)
          }

          if (code === 0) {
            try {
              // Extract JSON result from Python output
              const jsonMatch = stdout.match(/JSON_RESULT:(.+)/)
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[1])
                resolve(result)
              } else {
                reject(new Error('No JSON result found in Python output'))
              }
            } catch (parseError) {
              const message = parseError instanceof Error ? parseError.message : String(parseError)
              reject(
                new Error(
                  `Failed to parse processor output: ${message}\nOutput: ${stdout}\nError: ${stderr}`,
                ),
              )
            }
          } else {
            reject(new Error(`Python processor failed with code ${code}: ${stderr}`))
          }
        })

        pythonProcess.on('error', error => {
          // Clean up on process error
          try {
            unlinkSync(tempFilePath)
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError)
          }
          reject(new Error(`Failed to start Python processor: ${error.message}`))
        })
      } catch (fileError) {
        const message = fileError instanceof Error ? fileError.message : String(fileError)
        reject(new Error(`Failed to create temporary file: ${message}`))
      }
    })
  }
}

// Legacy fallback processor (simplified)
class FallbackCSVProcessor {
  private storeId: string
  private userId: string

  constructor(storeId: string, userId: string) {
    this.storeId = storeId
    this.userId = userId
  }

  async processCsv(csvContent: string): Promise<UnifiedProcessorResult> {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row')
      }

      const headers = lines[0].split(',').map(h =>
        h
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_'),
      )
      const data: ProcessedRow[] = []
      const errors: string[] = []
      const warnings: string[] = []

      // Column mapping
      const columnMap: { [key: string]: string } = {
        sku: 'sku',
        product_name: 'product_name',
        productname: 'product_name',
        name: 'product_name',
        category: 'category',
        quantity: 'quantity',
        qty: 'quantity',
        expiry_date: 'expiry_date',
        expirydate: 'expiry_date',
        expiry: 'expiry_date',
        cost_price: 'cost_price',
        costprice: 'cost_price',
        selling_price: 'selling_price',
        sellingprice: 'selling_price',
        price: 'selling_price',
        brand: 'brand',
        manufacture_date: 'manufacture_date',
        mfg_date: 'manufacture_date',
        location: 'location_code',
        location_code: 'location_code',
        unit_type: 'unit_type',
        unit: 'unit_type',
      }

      // Check required columns
      const mappedHeaders = headers.map(h => columnMap[h] || h)
      const requiredColumns = ['sku', 'product_name', 'quantity', 'expiry_date']
      const missingColumns = requiredColumns.filter(col => !mappedHeaders.includes(col))

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
      }

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim())
          const rowData: Record<string, string> = {}

          // Map values to normalized columns
          headers.forEach((header, index) => {
            const normalizedHeader = columnMap[header] || header
            rowData[normalizedHeader] = values[index] || ''
          })

          // Validate and process row
          const processedRow: ProcessedRow = {
            sku: this.validateSku(rowData.sku),
            product_name: this.validateProductName(rowData.product_name),
            category: this.normalizeCategory(rowData.category || 'dry_goods'),
            quantity: this.validateQuantity(rowData.quantity),
            expiry_date: this.validateDate(rowData.expiry_date) || '',
            brand: rowData.brand || 'Unknown',
            cost_price: this.validatePrice(rowData.cost_price),
            selling_price: this.validatePrice(rowData.selling_price),
            manufacture_date:
              this.validateDate(rowData.manufacture_date) ||
              this.estimateManufactureDate(rowData.expiry_date),
            location_code: rowData.location_code || 'MAIN',
            unit_type: rowData.unit_type || 'pcs',
            batch_number: `${this.storeId.substring(0, 8)}_${rowData.sku}_${Date.now()}_${i.toString().padStart(3, '0')}`,
            store_id: this.storeId,
            created_by: this.userId,
            status: 'active',
          }

          data.push(processedRow)
        } catch (rowError) {
          const message = rowError instanceof Error ? rowError.message : String(rowError)
          errors.push(`Row ${i}: ${message}`)
        }
      }

      return {
        status: errors.length > 0 ? 'warning' : 'success',
        data,
        processed_count: data.length,
        warnings,
        errors,
        metadata: {
          store_id: this.storeId,
          processed_at: new Date().toISOString(),
          processed_by: this.userId,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        status: 'error',
        data: [],
        processed_count: 0,
        warnings: [],
        errors: [message],
        metadata: {
          store_id: this.storeId,
          processed_at: new Date().toISOString(),
          processed_by: this.userId,
        },
      }
    }
  }

  private validateSku(sku: string): string {
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      throw new Error('SKU is required')
    }
    return sku.trim()
  }

  private validateProductName(name: string): string {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Product name is required')
    }
    return name.trim()
  }

  private normalizeCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      produce: 'fresh_produce',
      meat: 'fresh_meat_fish',
      dairy: 'dairy',
      bakery: 'bakery_fresh',
      frozen: 'frozen',
      beverages: 'beverages',
    }

    const lowerCategory = category.toLowerCase()
    return categoryMap[lowerCategory] || 'dry_goods'
  }

  private validateQuantity(quantity: string): number {
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid quantity')
    }
    return qty
  }

  private validateDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined

    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format')
    }
    return date.toISOString().split('T')[0]
  }

  private validatePrice(price: string): number | undefined {
    if (!price) return undefined
    const priceNum = parseFloat(price)
    return isNaN(priceNum) ? undefined : priceNum
  }

  private estimateManufactureDate(expiryDate: string): string {
    const expiry = new Date(expiryDate)
    const estimated = new Date(expiry.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days before
    return estimated.toISOString().split('T')[0]
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get user from auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    // Validate store access
    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'No access to this store' }, { status: 403 })
    }

    // Get file content
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let result: UnifiedProcessorResult

    try {
      // Try unified Python processor first
      console.log('Attempting to use unified Python processor...')
      const unifiedProcessor = new UnifiedCSVProcessor()
      result = await unifiedProcessor.processCsv(fileBuffer, storeId, user.id)
      console.log('Unified processor succeeded')
    } catch (pythonError) {
      console.warn('Unified Python processor failed, falling back to JavaScript:', pythonError)

      // Fall back to JavaScript processor
      const csvContent = fileBuffer.toString('utf-8')
      const fallbackProcessor = new FallbackCSVProcessor(storeId, user.id)
      result = await fallbackProcessor.processCsv(csvContent)
      console.log('Fallback processor completed')
    }

    if (result.status === 'error') {
      return NextResponse.json(
        {
          error: 'CSV processing failed',
          details: result.errors,
        },
        { status: 400 },
      )
    }

    if (result.data.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid data found in CSV',
          details: result.errors,
        },
        { status: 400 },
      )
    }

    // Convert to format expected by InventoryOperations
    const formattedData = result.data.map(item => ({
      SKU: item.sku,
      Product_Name: item.product_name,
      Category: item.category,
      Quantity: item.quantity,
      Expiry_Date: item.expiry_date,
      Brand: item.brand || 'Unknown',
      Cost_Price: item.cost_price || 0,
      Selling_Price: item.selling_price || 0,
      Manufacture_Date: item.manufacture_date || item.expiry_date,
      Location: item.location_code,
      Unit_Type: item.unit_type,
      Batch_Number: item.batch_number,
    }))

    // Process inventory using the database operations
    const dbResult = await operations.processCsvBatch(formattedData, storeId, user.id)

    return NextResponse.json({
      success: true,
      processed: dbResult.processed,
      errors: [...result.errors, ...dbResult.errors],
      warnings: result.warnings,
      total_items: result.data.length,
      valid_items: result.data.length,
      store_id: storeId,
      processor_used: result.errors.length === 0 ? 'unified_python' : 'fallback_javascript',
      message: `Successfully processed ${dbResult.processed} items`,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('CSV upload error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: message,
      },
      { status: 500 },
    )
  }
}
