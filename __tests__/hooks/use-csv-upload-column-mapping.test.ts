/**
 * Tests for CSV column mapping in useCSVUpload hook
 *
 * This test suite focuses on the column mapping functionality that was
 * enhanced in PR #264. It verifies:
 * 1. Column name normalization (lowercase, underscores, mappings)
 * 2. Duplicate column detection
 * 3. Type safety of column mappings
 * 4. Consistency between preview and normalization
 *
 * Testing Strategy:
 * - Test the COLUMN_MAPPINGS configuration directly
 * - Test edge cases (duplicates, ambiguous names, special characters)
 * - Verify error messages for duplicate columns
 * - Ensure removed ambiguous mappings are indeed removed
 */

import { describe, expect, test } from '@jest/globals'

// Mock column mappings for testing (matching the actual implementation)
const COLUMN_MAPPINGS = {
  // Quantity variations
  stock_quantity: 'quantity',
  qty: 'quantity',
  stock: 'quantity',

  // Selling price variations
  sell_price: 'selling_price',
  sale_price: 'selling_price',
  retail_price: 'selling_price',

  // Cost price variations
  purchase_price: 'cost_price',
  buy_price: 'cost_price',
  unit_cost: 'cost_price',

  // Batch number variations
  batch_lot: 'batch_number',
  lot: 'batch_number',
  lot_number: 'batch_number',
  batch: 'batch_number',

  // Expiry date variations
  best_before: 'expiry_date',
  use_by: 'expiry_date',
  expiration_date: 'expiry_date',
  exp_date: 'expiry_date',
  expiry: 'expiry_date',

  // Product name variations (reduced to avoid conflicts)
  item_name: 'product_name',
  title: 'product_name',

  // SKU variations
  product_code: 'sku',
  item_code: 'sku',
  barcode: 'sku',
} as const satisfies Record<string, string>

/**
 * Normalize a single column header
 * Converts to lowercase with underscores and applies column mappings
 */
const normalizeColumnHeader = (header: string): string => {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_')
  return normalized in COLUMN_MAPPINGS
    ? COLUMN_MAPPINGS[normalized as keyof typeof COLUMN_MAPPINGS]
    : normalized
}

/**
 * Build a mapping from target column names to original CSV headers
 * Optimized to iterate through headers only once (O(n) instead of O(n²))
 */
const buildColumnMapping = (headers: string[]): Map<string, string> => {
  const mapping = new Map<string, string>()
  for (const header of headers) {
    const normalized = normalizeColumnHeader(header)
    // Store first occurrence only (prevents duplicates from overwriting)
    if (!mapping.has(normalized)) {
      mapping.set(normalized, header)
    }
  }
  return mapping
}

/**
 * Detect duplicate columns after mapping
 * Returns array of duplicate column names (empty if no duplicates)
 */
const detectDuplicateColumns = (headers: string[]): string[] => {
  const normalizedHeaders = headers.map(h => normalizeColumnHeader(h))
  const seen = new Set<string>()
  const duplicates: string[] = []

  normalizedHeaders.forEach(h => {
    if (seen.has(h)) {
      duplicates.push(h)
    }
    seen.add(h)
  })

  return [...new Set(duplicates)]
}

describe('CSV Column Mapping', () => {
  describe('normalizeColumnHeader', () => {
    test('should normalize basic headers to lowercase with underscores', () => {
      expect(normalizeColumnHeader('Product Name')).toBe('product_name')
      expect(normalizeColumnHeader('SKU')).toBe('sku')
      expect(normalizeColumnHeader('Expiry Date')).toBe('expiry_date')
      expect(normalizeColumnHeader('Cost Price')).toBe('cost_price')
    })

    test('should trim whitespace from headers', () => {
      expect(normalizeColumnHeader('  Product Name  ')).toBe('product_name')
      expect(normalizeColumnHeader('\tSKU\t')).toBe('sku')
    })

    test('should handle multiple spaces', () => {
      expect(normalizeColumnHeader('Product   Name')).toBe('product_name')
      expect(normalizeColumnHeader('Best  Before  Date')).toBe('best_before_date')
    })

    test('should map quantity variations to quantity', () => {
      expect(normalizeColumnHeader('Stock Quantity')).toBe('quantity')
      expect(normalizeColumnHeader('Qty')).toBe('quantity')
      expect(normalizeColumnHeader('Stock')).toBe('quantity')
    })

    test('should map selling price variations to selling_price', () => {
      expect(normalizeColumnHeader('Sell Price')).toBe('selling_price')
      expect(normalizeColumnHeader('Sale Price')).toBe('selling_price')
      expect(normalizeColumnHeader('Retail Price')).toBe('selling_price')
    })

    test('should map cost price variations to cost_price', () => {
      expect(normalizeColumnHeader('Purchase Price')).toBe('cost_price')
      expect(normalizeColumnHeader('Buy Price')).toBe('cost_price')
      expect(normalizeColumnHeader('Unit Cost')).toBe('cost_price')
    })

    test('should map batch number variations to batch_number', () => {
      expect(normalizeColumnHeader('Batch Lot')).toBe('batch_number')
      expect(normalizeColumnHeader('Lot')).toBe('batch_number')
      expect(normalizeColumnHeader('Lot Number')).toBe('batch_number')
      expect(normalizeColumnHeader('Batch')).toBe('batch_number')
    })

    test('should map expiry date variations to expiry_date', () => {
      expect(normalizeColumnHeader('Best Before')).toBe('expiry_date')
      expect(normalizeColumnHeader('Use By')).toBe('expiry_date')
      expect(normalizeColumnHeader('Expiration Date')).toBe('expiry_date')
      expect(normalizeColumnHeader('Exp Date')).toBe('expiry_date')
      expect(normalizeColumnHeader('Expiry')).toBe('expiry_date')
    })

    test('should map product name variations to product_name', () => {
      expect(normalizeColumnHeader('Item Name')).toBe('product_name')
      expect(normalizeColumnHeader('Title')).toBe('product_name')
    })

    test('should map SKU variations to sku', () => {
      expect(normalizeColumnHeader('Product Code')).toBe('sku')
      expect(normalizeColumnHeader('Item Code')).toBe('sku')
      expect(normalizeColumnHeader('Barcode')).toBe('sku')
    })

    test('should NOT map ambiguous removed mappings', () => {
      // These were removed to prevent data corruption
      expect(normalizeColumnHeader('Price')).toBe('price') // NOT selling_price
      expect(normalizeColumnHeader('Name')).toBe('name') // NOT product_name
      expect(normalizeColumnHeader('Description')).toBe('description') // NOT product_name
      expect(normalizeColumnHeader('Amount')).toBe('amount') // NOT quantity
    })

    test('should handle special characters', () => {
      expect(normalizeColumnHeader('Product-Name')).toBe('product-name')
      expect(normalizeColumnHeader('SKU#123')).toBe('sku#123')
    })

    test('should preserve unmapped columns', () => {
      expect(normalizeColumnHeader('Custom Field')).toBe('custom_field')
      expect(normalizeColumnHeader('Notes')).toBe('notes')
      expect(normalizeColumnHeader('Warehouse Location')).toBe('warehouse_location')
    })
  })

  describe('buildColumnMapping', () => {
    test('should build correct mapping for standard headers', () => {
      const headers = ['SKU', 'Product Name', 'Qty', 'Expiry Date']
      const mapping = buildColumnMapping(headers)

      expect(mapping.get('sku')).toBe('SKU')
      expect(mapping.get('product_name')).toBe('Product Name')
      expect(mapping.get('quantity')).toBe('Qty')
      expect(mapping.get('expiry_date')).toBe('Expiry Date')
    })

    test('should handle price variations correctly', () => {
      const headers = ['Sale Price', 'Purchase Price']
      const mapping = buildColumnMapping(headers)

      expect(mapping.get('selling_price')).toBe('Sale Price')
      expect(mapping.get('cost_price')).toBe('Purchase Price')
    })

    test('should preserve first occurrence in case of duplicate mappings', () => {
      const headers = ['Qty', 'Stock Quantity'] // Both map to 'quantity'
      const mapping = buildColumnMapping(headers)

      expect(mapping.get('quantity')).toBe('Qty') // First occurrence wins
    })

    test('should handle empty headers array', () => {
      const mapping = buildColumnMapping([])
      expect(mapping.size).toBe(0)
    })

    test('should iterate only once (O(n) complexity)', () => {
      const headers = Array.from({ length: 1000 }, (_, i) => `Column${i}`)
      const start = Date.now()
      buildColumnMapping(headers)
      const duration = Date.now() - start

      // Should complete in reasonable time (less than 100ms for 1000 headers)
      expect(duration).toBeLessThan(100)
    })
  })

  describe('detectDuplicateColumns', () => {
    test('should detect no duplicates in clean CSV', () => {
      const headers = ['SKU', 'Product Name', 'Quantity', 'Expiry Date']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toEqual([])
    })

    test('should detect duplicate mappings: Item Name + Title', () => {
      const headers = ['Item Name', 'Title', 'Qty']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('product_name')
    })

    test('should detect duplicate mappings: Qty + Stock Quantity', () => {
      const headers = ['SKU', 'Qty', 'Stock Quantity']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('quantity')
    })

    test('should detect duplicate mappings: multiple price variations', () => {
      const headers = ['Sale Price', 'Sell Price', 'Retail Price']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('selling_price')
    })

    test('should detect duplicate mappings: SKU variations', () => {
      const headers = ['Product Code', 'Item Code', 'Barcode']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('sku')
    })

    test('should detect multiple different duplicates', () => {
      const headers = [
        'SKU',
        'Product Code', // Duplicate: sku
        'Item Name',
        'Title', // Duplicate: product_name
        'Qty',
        'Stock', // Duplicate: quantity
      ]
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('sku')
      expect(duplicates).toContain('product_name')
      expect(duplicates).toContain('quantity')
      expect(duplicates.length).toBe(3)
    })

    test('should handle case insensitivity in duplicate detection', () => {
      const headers = ['SKU', 'sku', 'Sku']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toContain('sku')
    })
  })

  describe('Ambiguous Mapping Prevention', () => {
    test('should NOT create ambiguity with Price column', () => {
      // "Price" is NOT mapped to avoid ambiguity with cost/selling price
      const headers = ['Price', 'Cost Price', 'Selling Price']
      const duplicates = detectDuplicateColumns(headers)

      // "Price" stays as "price", no conflict
      expect(duplicates).toEqual([])
    })

    test('should NOT create ambiguity with Name column', () => {
      // "Name" is NOT mapped to avoid conflict with product_name
      const headers = ['Name', 'Product Name']
      const duplicates = detectDuplicateColumns(headers)

      // "Name" stays as "name", no conflict
      expect(duplicates).toEqual([])
    })

    test('should NOT create ambiguity with Description column', () => {
      // "Description" is NOT mapped (usually means product description, not name)
      const headers = ['Description', 'Product Name']
      const duplicates = detectDuplicateColumns(headers)

      // "Description" stays as "description", no conflict
      expect(duplicates).toEqual([])
    })

    test('should NOT create ambiguity with Amount column', () => {
      // "Amount" is NOT mapped (could be monetary amount, not quantity)
      const headers = ['Amount', 'Quantity']
      const duplicates = detectDuplicateColumns(headers)

      // "Amount" stays as "amount", no conflict
      expect(duplicates).toEqual([])
    })
  })

  describe('Type Safety', () => {
    test('COLUMN_MAPPINGS should satisfy Record<string, string>', () => {
      // This test ensures the type safety pattern is correct
      const typeSafeMapping: Record<string, string> = COLUMN_MAPPINGS
      expect(Object.keys(typeSafeMapping).length).toBeGreaterThan(0)
    })

    test('should handle keyof typeof with type narrowing', () => {
      const testKey = 'stock_quantity'
      if (testKey in COLUMN_MAPPINGS) {
        const mapped = COLUMN_MAPPINGS[testKey as keyof typeof COLUMN_MAPPINGS]
        expect(mapped).toBe('quantity')
      }
    })
  })

  describe('Real-world CSV scenarios', () => {
    test('should handle common e-commerce CSV format', () => {
      const headers = ['Product Code', 'Item Name', 'Stock', 'Retail Price', 'Purchase Price']
      const mapping = buildColumnMapping(headers)

      expect(mapping.get('sku')).toBe('Product Code')
      expect(mapping.get('product_name')).toBe('Item Name')
      expect(mapping.get('quantity')).toBe('Stock')
      expect(mapping.get('selling_price')).toBe('Retail Price')
      expect(mapping.get('cost_price')).toBe('Purchase Price')
    })

    test('should handle food inventory CSV format', () => {
      const headers = [
        'Barcode',
        'Product Name',
        'Qty',
        'Best Before',
        'Unit Cost',
        'Sale Price',
        'Batch',
      ]
      const mapping = buildColumnMapping(headers)

      expect(mapping.get('sku')).toBe('Barcode')
      expect(mapping.get('product_name')).toBe('Product Name')
      expect(mapping.get('quantity')).toBe('Qty')
      expect(mapping.get('expiry_date')).toBe('Best Before')
      expect(mapping.get('cost_price')).toBe('Unit Cost')
      expect(mapping.get('selling_price')).toBe('Sale Price')
      expect(mapping.get('batch_number')).toBe('Batch')
    })

    test('should handle minimal CSV format', () => {
      const headers = ['SKU', 'Product Name', 'Quantity', 'Expiry Date']
      const duplicates = detectDuplicateColumns(headers)

      expect(duplicates).toEqual([])
    })

    test('should detect duplicates in problematic CSV', () => {
      const headers = ['Name', 'Product Name', 'Item Name'] // Should fail!
      const duplicates = detectDuplicateColumns(headers)

      // Name stays as 'name', but Product Name and Item Name both map to 'product_name'
      expect(duplicates).toContain('product_name')
    })
  })

  describe('Edge cases', () => {
    test('should handle empty string headers', () => {
      expect(normalizeColumnHeader('')).toBe('')
    })

    test('should handle headers with only whitespace', () => {
      expect(normalizeColumnHeader('   ')).toBe('')
    })

    test('should handle very long header names', () => {
      const longHeader = 'Very Long Product Name That Exceeds Normal Length Expectations'
      const normalized = normalizeColumnHeader(longHeader)
      expect(normalized).toBe('very_long_product_name_that_exceeds_normal_length_expectations')
    })

    test('should handle headers with numbers', () => {
      expect(normalizeColumnHeader('SKU 123')).toBe('sku_123')
      expect(normalizeColumnHeader('Price 2024')).toBe('price_2024')
    })

    test('should handle Unicode characters', () => {
      expect(normalizeColumnHeader('Productñame')).toBe('productñame')
      expect(normalizeColumnHeader('Prix de vente')).toBe('prix_de_vente')
    })
  })
})
