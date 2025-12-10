# Mock OCR System Setup - Complete ✅

## Overview

Mock OCR API system for delivery note uploads, allowing frontend and backend teams to work independently.

**Status:** Ready to use
**Date:** November 20, 2025

---

## Files Created

### 1. Mock Data Generator
**File:** `lib/mock-data/delivery-note-samples.ts`

- 4 test scenarios (small, medium, large, problematic)
- Returns `CsvPreviewItem[]` - same structure as CSV upload
- Realistic product data with various categories and expiry dates
- Edge cases for validation testing

### 2. Mock API Endpoint
**File:** `app/api/delivery-note-ocr/mock/route.ts`

- POST endpoint accepting image uploads
- Simulates 2-3 second OCR processing time
- Validates file type and size (max 5MB)
- Returns structured data matching CSV format
- Query params: `scenario` and `delay` for testing

### 3. Configuration Utility
**File:** `lib/api/ocr-config.ts`

- Centralized config for mock/real API switching
- File validation helper (`isValidOcrFile`)
- Environment-based endpoint selection
- Constants for file size limits and supported types

### 4. Updated Constants
**File:** `lib/constants/file-upload.ts`

- Added image support alongside CSV
- Separate max file sizes (CSV: 10MB, Images: 5MB)
- Organized extensions and MIME types by category

### 5. Documentation
**File:** `docs/api/delivery-note-ocr-mock.md`

- Complete API contract
- Request/response examples
- Mock scenario descriptions
- Backend integration guide
- Frontend usage patterns
- Testing with cURL

---

## Quick Start

### 1. Environment Setup

Add to `.env.local`:

```bash
# Use mock OCR during development
NEXT_PUBLIC_USE_MOCK_OCR=true
```

### 2. Frontend Usage

```typescript
import { OCR_CONFIG, isValidOcrFile } from '@/lib/api/ocr-config'
import type { CsvPreviewItem } from '@/hooks/use-csv-upload'

async function uploadDeliveryNote(file: File): Promise<CsvPreviewItem[]> {
  // Validate file
  const validation = isValidOcrFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Upload to mock API
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(OCR_CONFIG.endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || error.error)
  }

  const result = await response.json()
  return result.data // CsvPreviewItem[]
}
```

### 3. Test the API

```bash
# Start dev server
npm run dev

# Test in another terminal
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=small" \
  -F "file=@test-image.jpg"
```

---

## Mock Scenarios

| Scenario | Description | Items | Use Case |
|----------|-------------|-------|----------|
| `small` | Corner store delivery | 3 | Quick testing |
| `medium` | Small supermarket | 10 | Default scenario |
| `large` | Large delivery | 25 | Pagination testing |
| `problematic` | Validation errors | 8 | Error handling |
| `random` | Random selection | Varies | Unpredictable testing |

### Testing Different Scenarios

```bash
# Small delivery
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=small" \
  -F "file=@image.jpg"

# Problematic delivery (edge cases)
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=problematic" \
  -F "file=@image.jpg"

# Fast response (1 second delay)
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?delay=1000" \
  -F "file=@image.jpg"
```

---

## Data Structure

The mock API returns data compatible with existing CSV upload flow:

```typescript
interface CsvPreviewItem {
  SKU: string              // Product SKU
  Product_Name: string     // Product name
  Category: string         // Valid category enum
  Quantity: number         // 1-100,000
  Expiry_Date: string      // ISO format or empty string
  Cost_Price: number       // 0.01-1,000,000
  Selling_Price: number    // 0.01-1,000,000
}
```

**Why this structure?**
- Same validation table component as CSV upload
- Same backend batch creation logic
- Consistent user experience
- No code duplication

---

## Integration Path

### Current State (Mock API)

```
User uploads image
    ↓
Mock API (/api/delivery-note-ocr/mock)
    ↓
Returns CsvPreviewItem[]
    ↓
Validation table (shared with CSV)
    ↓
User validates/edits
    ↓
Submit to backend (same as CSV)
```

### Future State (Real API)

```
User uploads image
    ↓
Real API (/api/delivery-note-ocr)
    ↓
OCR Engine (Google Vision, AWS Textract, etc.)
    ↓
Returns CsvPreviewItem[]
    ↓
Validation table (same component!)
    ↓
User validates/edits
    ↓
Submit to backend (no changes needed)
```

### Switching to Real API

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_USE_MOCK_OCR=false
   ```

2. Backend implements `/api/delivery-note-ocr` endpoint

3. Frontend automatically uses real API (no code changes!)

---

## Backend Integration Checklist

The backend team needs to implement:

- [ ] **Endpoint:** `POST /api/delivery-note-ocr`
- [ ] **Input:** multipart/form-data with image file
- [ ] **OCR Processing:** Extract product data from image
- [ ] **Output:** JSON with `data: CsvPreviewItem[]`
- [ ] **Authentication:** Supabase session token validation
- [ ] **Error Handling:** Return 400/422/500 with error details
- [ ] **Performance:** Target <5 seconds processing time

**See:** `docs/api/delivery-note-ocr-mock.md` for complete backend requirements

---

## Validation & Error Handling

### File Validation

```typescript
import { isValidOcrFile } from '@/lib/api/ocr-config'

const validation = isValidOcrFile(file)
if (!validation.valid) {
  toast.error(validation.error)
  return
}
```

### API Error Handling

```typescript
try {
  const items = await uploadDeliveryNote(file)
  // Show validation table
} catch (error) {
  toast.error(`OCR failed: ${error.message}`)
}
```

### Problematic Scenario

Test edge cases with `?scenario=problematic`:
- Expired items
- Invalid prices
- Duplicate SKUs
- Missing required fields
- Unknown categories

---

## Testing Checklist

- [ ] Upload JPEG image → Returns mock data
- [ ] Upload PNG image → Returns mock data
- [ ] Upload PDF → Returns mock data
- [ ] Upload too large file (>5MB) → Error
- [ ] Upload wrong file type → Error
- [ ] Test all 5 scenarios → Different data
- [ ] Verify 2-3 second delay → Realistic timing
- [ ] Validation table shows items → Reuses CSV component
- [ ] Edit items in table → Updates work
- [ ] Submit to backend → Creates batches/products

---

## Next Steps

### For Frontend Team
1. Create delivery note upload component
2. Add file input with image validation
3. Call mock OCR API on upload
4. Show loading state (2-3 seconds)
5. Display validation table (reuse from CSV)
6. Handle errors gracefully
7. Test all scenarios

### For Backend Team
1. Review API contract: `docs/api/delivery-note-ocr-mock.md`
2. Choose OCR engine (Google Vision recommended)
3. Implement endpoint at `/api/delivery-note-ocr`
4. Parse delivery note layout
5. Extract product data → `CsvPreviewItem[]`
6. Add authentication & authorization
7. Deploy to staging for testing

### Integration Testing
1. Backend deploys real API to staging
2. Frontend sets `NEXT_PUBLIC_USE_MOCK_OCR=false`
3. Test with real images
4. Verify data structure compatibility
5. Performance testing (<5s target)
6. Error scenario testing
7. Production deployment

---

## Files Reference

```
lib/
├── mock-data/
│   └── delivery-note-samples.ts     # Mock data generator
├── api/
│   └── ocr-config.ts                # Configuration utility
├── constants/
│   └── file-upload.ts               # Updated constants
└── utils/
    └── file-validation.ts           # Updated for new structure

app/
└── api/
    └── delivery-note-ocr/
        └── mock/
            └── route.ts             # Mock API endpoint

docs/
└── api/
    └── delivery-note-ocr-mock.md    # Complete documentation
```

---

## Key Decisions

### Why Reuse CSV Structure?
- **Same validation UI** - No duplicate components
- **Same backend logic** - Batch creation already works
- **Faster development** - Leverage existing code
- **Consistent UX** - Users learn once

### Why Mock API?
- **Parallel development** - Frontend & backend work independently
- **Reliable testing** - Deterministic test data
- **Fast iteration** - No waiting for real OCR
- **Edge case testing** - Problematic scenario included

### Why 2-3 Second Delay?
- **Realistic timing** - Actual OCR takes 2-5 seconds
- **Loading state testing** - Ensure UI handles delays
- **User expectations** - Train users on expected wait time

---

## Support

- **Mock API Issues:** Check `app/api/delivery-note-ocr/mock/route.ts`
- **Data Structure:** Reference `hooks/use-csv-upload.ts`
- **Configuration:** See `lib/api/ocr-config.ts`
- **Documentation:** Read `docs/api/delivery-note-ocr-mock.md`
- **Backend Integration:** Follow checklist in documentation

---

## Success Metrics

✅ **Complete:**
- Mock API implemented and working
- 4 test scenarios with realistic data
- File validation with type/size checks
- Environment-based config switching
- Comprehensive documentation
- Code quality checks passing

🎯 **Ready For:**
- Frontend component development
- Backend OCR service implementation
- Parallel team workflows
- Independent testing

---

**Questions?** See `docs/api/delivery-note-ocr-mock.md` for detailed examples and backend integration guide.
