# Mock OCR Quick Start Guide

## 🚀 Quick Setup (2 minutes)

### 1. Environment Variable
```bash
# Add to .env.local
NEXT_PUBLIC_USE_MOCK_OCR=true
```

### 2. Import & Use
```typescript
import { OCR_CONFIG, isValidOcrFile } from '@/lib/api/ocr-config'

// Validate file
const validation = isValidOcrFile(imageFile)
if (!validation.valid) {
  throw new Error(validation.error)
}

// Upload to mock API
const formData = new FormData()
formData.append('file', imageFile)

const response = await fetch(OCR_CONFIG.endpoint, {
  method: 'POST',
  body: formData,
})

const { data } = await response.json()
// data is CsvPreviewItem[] - same as CSV upload!
```

### 3. Test It
```bash
npm run dev

# In another terminal:
curl -X POST "http://localhost:3000/api/delivery-note-ocr/mock?scenario=small" \
  -F "file=@test.jpg"
```

---

## 📊 Mock Scenarios

| Scenario | Items | Query Param |
|----------|-------|-------------|
| Small delivery | 3 | `?scenario=small` |
| Medium delivery | 10 | `?scenario=medium` (default) |
| Large delivery | 25 | `?scenario=large` |
| Edge cases | 8 | `?scenario=problematic` |
| Random | Varies | `?scenario=random` |

---

## 🔄 Toggle Mock/Real API

```typescript
// lib/api/ocr-config.ts already handles this!

export const OCR_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true'
    ? '/api/delivery-note-ocr/mock'  // Development
    : '/api/delivery-note-ocr',      // Production
  isMock: process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true',
}
```

**Switch to real API:** Set `NEXT_PUBLIC_USE_MOCK_OCR=false`

---

## 📝 Data Structure

```typescript
// Same as CSV upload! Reuse validation table component
interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string      // ISO format or ""
  Cost_Price: number
  Selling_Price: number
}
```

---

## 🧪 Testing Commands

```bash
# Small scenario (3 items)
curl -X POST "localhost:3000/api/delivery-note-ocr/mock?scenario=small" \
  -F "file=@test.jpg"

# Edge cases (validation errors)
curl -X POST "localhost:3000/api/delivery-note-ocr/mock?scenario=problematic" \
  -F "file=@test.jpg"

# Fast response (1 second)
curl -X POST "localhost:3000/api/delivery-note-ocr/mock?delay=1000" \
  -F "file=@test.jpg"
```

---

## 📁 Key Files

```
lib/mock-data/delivery-note-samples.ts  # Mock data
lib/api/ocr-config.ts                   # Config utility
app/api/delivery-note-ocr/mock/route.ts # API endpoint
docs/api/delivery-note-ocr-mock.md      # Full docs
```

---

## ✅ What's Working

- ✅ Mock API endpoint at `/api/delivery-note-ocr/mock`
- ✅ 4 test scenarios + random selection
- ✅ File validation (type, size)
- ✅ Realistic 2-3 second processing delay
- ✅ Returns `CsvPreviewItem[]` (same as CSV)
- ✅ Environment-based config switching
- ✅ Code quality checks passing

---

## 🎯 Next Steps

**Frontend:**
1. Create upload component
2. Add file input (accept images)
3. Call `OCR_CONFIG.endpoint` on upload
4. Show loading state (2-3s)
5. Display validation table (reuse CSV component)

**Backend:**
1. Read `docs/api/delivery-note-ocr-mock.md`
2. Implement real endpoint at `/api/delivery-note-ocr`
3. Return same data structure: `{ success: true, data: CsvPreviewItem[] }`

---

## 📚 Full Documentation

See `docs/api/delivery-note-ocr-mock.md` for:
- Complete API contract
- Backend integration guide
- Error handling patterns
- Performance requirements
- Authentication details

---

**Ready to code!** 🎉
