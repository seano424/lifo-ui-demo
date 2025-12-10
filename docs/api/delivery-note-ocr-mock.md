# Delivery Note OCR API Documentation

## Overview

The delivery note OCR API processes images of delivery notes and extracts product information into a structured format. This endpoint returns data compatible with the existing CSV upload validation flow.

**Current State:** Mock API (`/api/delivery-note-ocr/mock`)
**Production API:** `/api/delivery-note-ocr` (to be implemented by backend team)

---

## API Contract

### Request

**Endpoint:** `POST /api/delivery-note-ocr/mock`
**Content-Type:** `multipart/form-data`

#### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Delivery note image (JPEG, PNG, PDF) |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scenario` | string | No | Mock scenario: `small`, `medium`, `large`, `problematic`, `random` (default) |
| `delay` | number | No | Override processing delay in milliseconds (for testing) |

#### File Requirements

- **Supported formats:** JPEG, PNG, PDF
- **Maximum size:** 5MB
- **MIME types:** `image/jpeg`, `image/jpg`, `image/png`, `application/pdf`

---

### Response

**Status Code:** `200 OK` (success) or `400`/`500` (error)

#### Success Response Structure

```json
{
  "success": true,
  "data": [
    {
      "SKU": "MILK-001",
      "Product_Name": "Organic Whole Milk 2L",
      "Category": "dairy",
      "Quantity": 12,
      "Expiry_Date": "2025-11-27",
      "Cost_Price": 3.50,
      "Selling_Price": 5.99
    },
    {
      "SKU": "BREAD-002",
      "Product_Name": "Sourdough Bread",
      "Category": "bakery",
      "Quantity": 8,
      "Expiry_Date": "2025-11-23",
      "Cost_Price": 2.25,
      "Selling_Price": 4.50
    }
  ],
  "metadata": {
    "file_name": "delivery-note.jpg",
    "file_size": 2457600,
    "file_type": "image/jpeg",
    "items_extracted": 2,
    "processing_time_ms": 2345,
    "scenario_used": "small",
    "ocr_confidence": 0.95,
    "mock": true
  }
}
```

#### Data Structure: `CsvPreviewItem[]`

The `data` field returns an array of items matching the `CsvPreviewItem` interface:

```typescript
interface CsvPreviewItem {
  SKU: string                // Product SKU (auto-generated if missing: "AUTO-1", "AUTO-2", etc.)
  Product_Name: string       // Product name (fallback: "Unknown Product")
  Category: string           // Product category (see Valid Categories below)
  Quantity: number           // Item quantity (min: 1, max: 100,000)
  Expiry_Date: string        // ISO date format YYYY-MM-DD (empty string "" for non-perishable items)
  Cost_Price: number         // Cost price (min: 0.01, max: 1,000,000)
  Selling_Price: number      // Selling price (min: 0.01, max: 1,000,000)
  [key: string]: string | number  // Allow additional fields
}
```

#### Valid Categories

- `fresh_meat`
- `fresh_produce`
- `dairy`
- `dairy_alternative`
- `bakery`
- `seafood`
- `dry_goods` (default for unknown categories)

#### Error Response Structure

```json
{
  "error": "OCR processing failed",
  "details": "Specific error message",
  "mock": true
}
```

---

## Mock Scenarios

The mock API provides different test scenarios via the `scenario` query parameter:

| Scenario | Description | Item Count |
|----------|-------------|------------|
| `small` | Typical corner store delivery | 3 items |
| `medium` | Small supermarket delivery | 10 items |
| `large` | Large delivery (test pagination) | 25 items |
| `problematic` | Various validation issues | 8 items (with errors) |
| `random` | Randomly selects one of the above | Varies |

### Problematic Scenario Edge Cases

The `problematic` scenario includes:
- **Expired items:** Items with past expiry dates
- **Invalid prices:** Prices below minimum (0.01) or above maximum (1,000,000)
- **Duplicate SKUs:** Multiple items with same SKU
- **Unknown categories:** Invalid category names
- **Missing required fields:** Empty SKU or product name
- **Valid items mixed in:** To test filtering logic

---

## Usage Examples

### Frontend Usage (TypeScript)

```typescript
import { CsvPreviewItem } from '@/hooks/use-csv-upload'

async function uploadDeliveryNote(file: File): Promise<CsvPreviewItem[]> {
  const formData = new FormData()
  formData.append('file', file)

  // Use mock API during development
  const endpoint = process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true'
    ? '/api/delivery-note-ocr/mock'
    : '/api/delivery-note-ocr'

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || error.error || 'OCR processing failed')
  }

  const result = await response.json()
  return result.data
}

// Usage with error handling
try {
  const items = await uploadDeliveryNote(imageFile)
  console.log(`Extracted ${items.length} items:`, items)
  // Pass items to validation table (same as CSV flow)
} catch (error) {
  console.error('OCR failed:', error)
}
```

### Testing with cURL

```bash
# Test with default random scenario
curl -X POST http://localhost:3000/api/delivery-note-ocr/mock \
  -F "file=@delivery-note.jpg"

# Test with specific scenario
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=small" \
  -F "file=@delivery-note.jpg"

# Test with custom delay (1 second)
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?delay=1000" \
  -F "file=@delivery-note.jpg"

# Test problematic scenario
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=problematic" \
  -F "file=@delivery-note.jpg"

# Health check
curl http://localhost:3000/api/delivery-note-ocr/mock
```

---

## Toggle Between Mock and Real API

### Environment Configuration

Add to `.env.local`:

```bash
# Set to 'true' to use mock OCR API during development
NEXT_PUBLIC_USE_MOCK_OCR=true

# Set to 'false' when backend OCR service is ready
# NEXT_PUBLIC_USE_MOCK_OCR=false
```

### Frontend Configuration

Create a utility to handle API switching:

```typescript
// lib/api/ocr-config.ts
export const OCR_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true'
    ? '/api/delivery-note-ocr/mock'
    : '/api/delivery-note-ocr',
  isMock: process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true',
} as const

// Usage in components
import { OCR_CONFIG } from '@/lib/api/ocr-config'

const response = await fetch(OCR_CONFIG.endpoint, {
  method: 'POST',
  body: formData,
})
```

---

## Backend Integration Guide

### Real API Implementation Requirements

The backend OCR service should implement the following contract:

#### Request Processing

1. **Accept multipart/form-data** with file upload
2. **Validate file type and size** (JPEG, PNG, PDF; max 5MB)
3. **Process image with OCR engine** (e.g., Google Vision, AWS Textract, Tesseract)
4. **Extract structured data:**
   - Product SKU (or generate auto-SKU)
   - Product name
   - Quantity
   - Expiry date (parse various formats → ISO YYYY-MM-DD)
   - Prices (cost and selling)
   - Category (map to valid categories)

#### Response Format

Return JSON matching the mock API structure:

```typescript
{
  success: boolean
  data: CsvPreviewItem[]
  metadata: {
    file_name: string
    file_size: number
    file_type: string
    items_extracted: number
    processing_time_ms: number
    ocr_confidence: number  // Overall confidence score (0-1)
    mock: false             // Set to false for real API
  }
}
```

#### Error Handling

Return appropriate HTTP status codes:
- `400 Bad Request` - Invalid file type, size, or missing file
- `422 Unprocessable Entity` - OCR could not extract data
- `500 Internal Server Error` - Server or OCR engine failure

Error response format:

```json
{
  "error": "Brief error message",
  "details": "Detailed error explanation",
  "mock": false
}
```

#### Authentication

The real API should:
- Accept Supabase session token via `Authorization` header
- Validate user has access to the store specified in request
- Use Supabase service role key for database operations

Example request with auth:

```typescript
const response = await fetch('/api/delivery-note-ocr', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseSession.access_token}`,
  },
  body: formData,
})
```

#### Performance Targets

- **Processing time:** 2-5 seconds for typical images
- **Success rate:** >95% for clear, well-lit images
- **Confidence threshold:** Flag items with <80% confidence for manual review

---

## Integration Checklist

### Frontend Team

- [ ] Create delivery note upload component (mirror CSV upload UI)
- [ ] Reuse `CsvPreviewItem[]` validation table component
- [ ] Add image file validation (type, size)
- [ ] Implement loading states (2-3 second OCR processing)
- [ ] Handle OCR errors gracefully
- [ ] Test all mock scenarios
- [ ] Add environment toggle for mock/real API

### Backend Team

- [ ] Implement OCR service endpoint at `/api/delivery-note-ocr`
- [ ] Set up OCR engine (Google Vision, AWS Textract, etc.)
- [ ] Parse delivery note layout (tables, text blocks)
- [ ] Extract and validate product data
- [ ] Map categories to valid enum values
- [ ] Generate auto-SKUs for missing SKUs
- [ ] Return data in `CsvPreviewItem[]` format
- [ ] Add authentication and authorization
- [ ] Implement rate limiting (prevent abuse)
- [ ] Add logging and error tracking

### Integration Phase

- [ ] Backend deploys real API to staging
- [ ] Frontend tests with real API (set `NEXT_PUBLIC_USE_MOCK_OCR=false`)
- [ ] Verify data structure compatibility
- [ ] Test error scenarios
- [ ] Performance testing (ensure <5s processing)
- [ ] Deploy to production
- [ ] Monitor OCR accuracy and confidence scores

---

## TODO Comments for Backend Integration

The mock API includes TODO comments marking integration points:

```typescript
/**
 * TODO: Replace with real OCR API when backend is ready
 * Real API should be at: /api/delivery-note-ocr (remove /mock)
 */
```

When backend is ready:
1. Move mock route to `/api/delivery-note-ocr/mock` (keep for testing)
2. Create real route at `/api/delivery-note-ocr`
3. Update environment variable default to use real API
4. Keep mock API available via `?mock=true` query param (optional)

---

## Additional Notes

### Why Same Structure as CSV?

Both CSV and delivery note flows:
1. Parse/extract data → `CsvPreviewItem[]`
2. Display validation table (user can edit)
3. Submit validated data → backend creates batches/products

Reusing the same data structure means:
- **Same validation table component**
- **Same backend batch creation logic**
- **Consistent user experience**
- **Less code duplication**

### Handling OCR Uncertainties

Items with low confidence scores should be flagged in the validation table:

```typescript
interface CsvPreviewItemWithConfidence extends CsvPreviewItem {
  _ocr_confidence?: number  // Optional field for OCR confidence
  _needs_review?: boolean   // Flag for manual review
}
```

Frontend can highlight low-confidence items for user verification before submission.

---

## Questions?

- **Frontend issues:** Check component implementation in `components/csv-upload/`
- **Backend questions:** See integration checklist above
- **Data structure:** Reference `hooks/use-csv-upload.ts` for exact types
- **Mock scenarios:** See `lib/mock-data/delivery-note-samples.ts`
