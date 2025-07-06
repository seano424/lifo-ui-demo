import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo-ai-core/database/operations'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

interface ProcessorResult {
  success: boolean
  validation: {
    valid: boolean
    row_count: number
    errors: string[]
    warnings?: string[]
  }
  data?: Record<string, unknown>[]
  processed_count?: number
  errors: string[]
  warnings?: string[]
}

interface ProcessedRow {
  [key: string]: string | number
  SKU: string
  Product_Name: string
  Quantity: string | number
  Expiry_Date: string
  Cost_Price: string | number
  Selling_Price: string | number
  Category: string
  Unit_Type: string
  Location: string
  Batch_Number: string
  Manufacture_Date: string
}

// Python CSV processor integration
class PythonCSVProcessor {
  private pythonPath: string
  private processorPath: string

  constructor() {
    // Use the virtual environment Python if available, otherwise system Python
    this.pythonPath = join(process.cwd(), 'lifo-ai-core/venv/bin/python')
    this.processorPath = join(process.cwd(), 'lifo-ai-core/etl/processor.py')
  }

  async processCsv(csvContent: string, validateOnly: boolean = false): Promise<ProcessorResult> {
    return new Promise((resolve, reject) => {
      // Create temporary file
      const tempFileName = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.csv`
      const tempFilePath = join(tmpdir(), tempFileName)

      try {
        // Write CSV content to temporary file
        writeFileSync(tempFilePath, csvContent, 'utf8')

        // Prepare Python command arguments
        const args = [this.processorPath, tempFilePath, '--json']
        if (validateOnly) {
          args.push('--validate-only')
        }

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
              // Parse Python output as JSON (we'll need to modify Python script to output JSON)
              const result = this.parseProcessorOutput(stdout)
              resolve(result)
            } catch (parseError) {
              const message = parseError instanceof Error ? parseError.message : String(parseError)
              reject(new Error(`Failed to parse processor output: ${message}`))
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

  private parseProcessorOutput(output: string): ProcessorResult {
    // Try to parse as JSON first (when --json flag is used)
    try {
      const jsonOutput = JSON.parse(output.trim())
      return jsonOutput
    } catch {
      // Fall back to text parsing for backward compatibility
      if (output.includes('✅ Processing successful')) {
        // Extract metrics from output
        const rowCountMatch = output.match(/(\d+) rows/)
        const processedMatch = output.match(/Processed: (\d+) items/)

        return {
          success: true,
          validation: {
            valid: true,
            row_count: rowCountMatch ? parseInt(rowCountMatch[1]) : 0,
            errors: [],
            warnings: this.extractWarnings(output),
          },
          processed_count: processedMatch ? parseInt(processedMatch[1]) : 0,
          errors: this.extractErrors(output),
          warnings: this.extractWarnings(output),
        }
      } else {
        return {
          success: false,
          validation: {
            valid: false,
            errors: this.extractErrors(output),
            row_count: 0,
          },
          data: [],
          errors: this.extractErrors(output),
        }
      }
    }
  }

  private extractErrors(output: string): string[] {
    const errors: string[] = []
    const lines = output.split('\n')

    lines.forEach(line => {
      if (line.includes('❌') || line.includes('Error:')) {
        errors.push(line.replace(/[❌]/g, '').trim())
      }
    })

    return errors
  }

  private extractWarnings(output: string): string[] {
    const warnings: string[] = []
    const lines = output.split('\n')

    lines.forEach(line => {
      if (line.includes('⚠️') || line.includes('Warning:')) {
        warnings.push(line.replace(/[⚠️]/g, '').trim())
      }
    })

    return warnings
  }
}

// Fallback mock processor for development/testing
class MockCSVProcessor {
  validate_csv_structure(content: string): ProcessorResult['validation'] {
    try {
      const lines = content.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        return {
          valid: false,
          errors: ['CSV must have at least a header and one data row'],
          row_count: 0,
        }
      }

      const headers = lines[0].split(',').map(h => h.trim())
      const requiredColumns = [
        'SKU',
        'Product_Name',
        'Quantity',
        'Expiry_Date',
        'Cost_Price',
        'Selling_Price',
      ]
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))

      if (missingColumns.length > 0) {
        return {
          valid: false,
          errors: [`Missing required columns: ${missingColumns.join(', ')}`],
          row_count: lines.length - 1,
        }
      }

      return {
        valid: true,
        errors: [],
        row_count: lines.length - 1,
      }
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`],
        row_count: 0,
      }
    }
  }

  clean_and_normalize_data(content: string): [ProcessedRow[], string[]] {
    const lines = content.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const data: ProcessedRow[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        const row: ProcessedRow = {} as ProcessedRow

        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })

        // Basic validation and defaults
        row['Category'] = row['Category'] || 'dry_goods'
        row['Unit_Type'] = row['Unit_Type'] || 'pcs'
        row['Location'] = row['Location'] || 'MAIN'
        row['Batch_Number'] = row['Batch_Number'] || `${row['SKU']}-${Date.now()}`
        row['Manufacture_Date'] = row['Manufacture_Date'] || new Date().toISOString().split('T')[0]

        // Validate required fields
        if (!row['SKU'] || !row['Product_Name'] || !row['Quantity'] || !row['Expiry_Date']) {
          errors.push(`Row ${i}: Missing required fields`)
          continue
        }

        // Validate numbers
        const quantity = parseFloat(String(row['Quantity']))
        const costPrice = parseFloat(String(row['Cost_Price']))
        const sellingPrice = parseFloat(String(row['Selling_Price']))

        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${i}: Invalid quantity`)
          continue
        }

        if (isNaN(costPrice) || costPrice <= 0) {
          errors.push(`Row ${i}: Invalid cost price`)
          continue
        }

        if (isNaN(sellingPrice) || sellingPrice <= 0) {
          errors.push(`Row ${i}: Invalid selling price`)
          continue
        }

        // Validate date
        const expiryDate = new Date(String(row['Expiry_Date']))
        if (isNaN(expiryDate.getTime())) {
          errors.push(`Row ${i}: Invalid expiry date`)
          continue
        }

        // Convert numeric strings to numbers
        row['Quantity'] = quantity
        row['Cost_Price'] = costPrice
        row['Selling_Price'] = sellingPrice

        data.push(row)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`Row ${i}: ${message}`)
      }
    }

    return [data, errors]
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
    const usePython = formData.get('usePython') === 'true' // Optional flag to use Python processor

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a CSV file.',
        },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 400 },
      )
    }

    // Validate store access
    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id)

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'No access to this store',
        },
        { status: 403 },
      )
    }

    const csvContent = await file.text()
    let validation: ProcessorResult['validation']
    let cleanedData: ProcessedRow[]
    let processingErrors: string[]

    if (usePython) {
      try {
        // Use Python CSV processor
        const pythonProcessor = new PythonCSVProcessor()
        const result = await pythonProcessor.processCsv(csvContent, false)

        if (!result.success) {
          return NextResponse.json(
            {
              error: 'Python CSV processing failed',
              details: result.errors,
            },
            { status: 400 },
          )
        }

        validation = result.validation
        cleanedData = (result.data || []) as ProcessedRow[]
        processingErrors = result.errors || []
      } catch (pythonError) {
        console.warn('Python processor failed, falling back to JavaScript:', pythonError)
        // Fall back to JavaScript processor
        const mockProcessor = new MockCSVProcessor()
        validation = mockProcessor.validate_csv_structure(csvContent)

        if (!validation.valid) {
          return NextResponse.json(
            {
              error: 'Invalid CSV format',
              details: validation.errors,
            },
            { status: 400 },
          )
        }

        const [data, errors] = mockProcessor.clean_and_normalize_data(csvContent)
        cleanedData = data
        processingErrors = errors
      }
    } else {
      // Use JavaScript/mock processor
      const mockProcessor = new MockCSVProcessor()
      validation = mockProcessor.validate_csv_structure(csvContent)

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid CSV format',
            details: validation.errors,
          },
          { status: 400 },
        )
      }

      const [data, errors] = mockProcessor.clean_and_normalize_data(csvContent)
      cleanedData = data
      processingErrors = errors
    }

    if (cleanedData.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid data found in CSV',
          details: processingErrors,
        },
        { status: 400 },
      )
    }

    // Process inventory using the database operations
    const result = await operations.processCsvBatch(cleanedData, storeId, user.id)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: [...processingErrors, ...result.errors],
      total_rows: validation.row_count,
      valid_rows: cleanedData.length,
      store_id: storeId,
      processor_used: usePython ? 'python' : 'javascript',
      message: `Successfully processed ${result.processed} items`,
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
