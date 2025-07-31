export interface CSVUploadResponse {
  success: boolean
  processed: number
  total_items: number
  valid_items: number
  errors: string[]
  warnings: string[]
  store_id: string
  processor_used: 'unified_python' | 'fallback_javascript'
  message: string
  metadata: {
    store_id: string
    processed_at: string
    processed_by: string
  }
}

export interface ProcessedItem {
  row_number: number
  sku: string
  product_name: string
  status: 'success' | 'error' | 'warning'
  batch_id?: string
  product_id?: string
  error_message?: string
}

export interface CSVValidationResult {
  is_valid: boolean
  total_rows: number
  valid_count: number
  error_count: number
  warning_count: number
  valid_rows: ProcessedRow[]
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ProcessedRow {
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

export interface ValidationError {
  row: number
  field?: string
  error: string
}

export interface ValidationWarning {
  row: number
  field?: string
  warning: string
}

export interface CSVUploadOptions {
  validateOnly?: boolean
  skipDuplicates?: boolean
  updateExisting?: boolean
}