# Batch Validation Components

This directory contains reusable components for validating and displaying batch upload data. These components are shared between CSV upload and delivery note OCR workflows to maintain consistent UX and reduce code duplication.

## Components

### `BatchValidationTable`

A reusable table component for displaying and editing batch inventory data. Supports both desktop table view and mobile card view with inline editing.

**Features:**
- Desktop: Full table view with all fields
- Mobile: Responsive card view optimized for touch
- Inline editing for all fields (SKU, Product Name, Quantity, Prices, Expiry Date)
- Validation indicators (red borders for invalid prices)
- Pagination (10 items per page by default)
- Quantity controls with +/- buttons
- Category display (read-only, formatted from snake_case)

**Props:**
```typescript
interface BatchValidationTableProps {
  items: CsvPreviewItem[]           // Array of batch items to display
  currentPage: number                // Current pagination page (0-indexed)
  totalPages: number                 // Total number of pages
  onPageChange: (page: number) => void  // Callback when page changes
  onUpdateItem: (                   // Callback when item field is edited
    index: number,
    field: keyof CsvPreviewItem,
    value: string | number
  ) => void
  disabled?: boolean                 // Disable all editing (during upload)
  itemsPerPage?: number             // Items per page (default: 10)
}
```

**Usage Example:**
```typescript
import { BatchValidationTable } from '@/components/batch-validation'

function MyUploadForm() {
  const [items, setItems] = useState<CsvPreviewItem[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  const handleUpdateItem = (index: number, field: keyof CsvPreviewItem, value: string | number) => {
    // Update logic here
  }

  return (
    <BatchValidationTable
      items={items}
      currentPage={currentPage}
      totalPages={Math.ceil(items.length / 10)}
      onPageChange={setCurrentPage}
      onUpdateItem={handleUpdateItem}
      disabled={isUploading}
    />
  )
}
```

### `UploadResultsDisplay`

A reusable success/error display component for batch upload operations. Shows performance metrics, error details, and action buttons.

**Features:**
- Success summary with item count
- Performance metrics (processed, skipped, speed, time)
- Error display (handles both string arrays and structured errors)
- "Upload Another" button
- Customizable messaging based on upload type

**Props:**
```typescript
interface UploadResultsDisplayProps {
  result: UploadResult              // Upload operation result
  onUploadAnother: () => void       // Callback to reset and upload again
  uploadType?: 'csv' | 'delivery-note'  // For customized messaging
}

interface UploadResult {
  processed: number                  // Items successfully processed
  skipped: number                   // Items skipped (duplicates)
  processing_time_ms: number        // Total processing time
  performance_metrics?: {
    items_per_second: number
    duplicate_detection_ms?: number
    product_resolution_ms?: number
    batch_insertion_ms?: number
    database_processing_time_ms?: number
    products_created?: number
    store_products_linked?: number
  }
  errors?: string[] | Array<{ row: number; message: string }>  // Errors (if any)
}
```

**Usage Example:**
```typescript
import { UploadResultsDisplay } from '@/components/batch-validation'

function MyUploadForm() {
  const { data: uploadResult, reset } = useUploadMutation()

  if (uploadResult) {
    return (
      <UploadResultsDisplay
        result={uploadResult}
        onUploadAnother={reset}
        uploadType="csv"
      />
    )
  }

  return <div>Upload form...</div>
}
```

## Shared Hook

### `useBatchUploadBase`

A shared hook that provides common state management and editing logic for batch uploads. Can be extended by specific upload hooks (CSV, delivery note, etc.).

**Location:** `hooks/use-batch-upload-base.ts`

**Features:**
- State management for items, pagination, validation errors
- Update functions for all item fields (with validation)
- Price validation (enforces PRICE_CONSTRAINTS)
- Pagination logic
- Reset functionality

**Returns:**
```typescript
interface UseBatchUploadBaseReturn {
  // State
  items: CsvPreviewItem[]
  currentPage: number
  totalPages: number
  pricingErrors: Record<number, string>

  // Actions
  setItems: (items: CsvPreviewItem[]) => void
  updateItemSku: (index: number, value: string) => void
  updateItemProductName: (index: number, value: string) => void
  updateItemQuantity: (index: number, value: number) => void
  updateItemCostPrice: (index: number, value: number) => void
  updateItemSellingPrice: (index: number, value: number) => void
  updateItemExpiry: (index: number, value: string) => void
  updateItemCategory: (index: number, value: string) => void

  // Computed
  currentPageItems: CsvPreviewItem[]
  hasValidationErrors: boolean

  // Pagination
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToPage: (page: number) => void

  // Utilities
  resetState: () => void
}
```

**Usage Example:**
```typescript
import { useBatchUploadBase } from '@/hooks/use-batch-upload-base'

function useMyCustomUpload() {
  const batchBase = useBatchUploadBase({
    itemsPerPage: 10,
    onItemsChange: (items) => {
      // Optional callback when items change
    }
  })

  // Add custom upload logic here
  const upload = () => {
    // Use batchBase.items for upload
  }

  return {
    ...batchBase,
    upload
  }
}
```

## Design Decisions

### Why Extract These Components?

**Before extraction:**
- CSV upload form had ~500 lines of inline table/results code
- Future delivery note form would duplicate 90% of this code
- Inconsistent UX if implementations diverged
- Difficult to maintain validation logic in multiple places

**After extraction:**
- CSV upload form reduced to ~350 lines (40% smaller)
- Delivery note form can reuse components (saves ~300 lines)
- Consistent UX guaranteed across upload methods
- Single source of truth for validation and display logic

### Shared vs Specific Logic

**Shared (in extracted components/hooks):**
- Item validation (prices, quantities)
- Pagination logic
- UI rendering (table, cards, results)
- Edit controls (+/- buttons, inputs)
- Price constraints enforcement

**Upload-Specific (in CSV/delivery note hooks):**
- File parsing (CSV vs OCR API)
- Data transformation (CSV headers vs OCR fields)
- Upload API calls
- Error handling specific to upload type
- Caching strategies

## Future Extensions

These components are designed to be extensible for future upload methods:

1. **Manual Entry:** Could use `BatchValidationTable` for manually entered items
2. **Barcode Scanner:** Could collect items in real-time and use table for review
3. **Excel Import:** Similar to CSV but different parsing logic
4. **API Sync:** External system imports could use same validation flow

## Validation

All components enforce these constraints:

- **SKU:** Max 100 characters (database constraint)
- **Product Name:** Max 255 characters (database constraint)
- **Quantity:** 1-100,000 units (reasonable business range)
- **Prices:** €0.01-€999,999.99 (from PRICE_CONSTRAINTS)
- **Expiry Date:** Must be today or future (no expired batches)

## Accessibility

- Keyboard navigation fully supported
- ARIA labels on all interactive elements
- Visible focus indicators
- Screen reader friendly table structure
- Mobile touch targets meet minimum size (44px)

## Performance

- Pagination limits DOM nodes (10 items per page)
- Memoized validation calculations
- Optimized re-renders (only changed items update)
- Lazy loading for large datasets (future enhancement)

## Testing Checklist

When modifying these components, verify:

- [ ] Desktop table view renders correctly
- [ ] Mobile card view renders correctly
- [ ] All fields can be edited inline
- [ ] Price validation highlights errors (red borders)
- [ ] Pagination works (next/prev/page numbers)
- [ ] Quantity controls work (+/- buttons)
- [ ] Results display shows metrics correctly
- [ ] Error display handles both error formats
- [ ] Disabled state prevents editing during upload
- [ ] TypeScript types are correct (no `any`)
- [ ] CSV upload still works end-to-end
- [ ] No visual regressions
