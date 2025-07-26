# Frontend Product Scanning - Optimized API Specification

This document provides the API specifications for the optimized frontend-backend architecture.

## 🎯 Optimized Architecture Overview

**✅ ARCHITECTURE OPTIMIZED**: The product scanning functionality has been restructured for optimal performance:

### Frontend Responsibilities (Direct Browser APIs)
- **Native Barcode Scanning**: Real-time camera barcode detection using browser APIs
- **OpenFoodFacts Integration**: Direct API calls to OpenFoodFacts for product lookup
- **Product Caching**: Local storage and React Query caching for fast lookups
- **Scanning Workflow**: Complete state management via Zustand store

### Backend Responsibilities (Complex AI Processing)
- **Google Vision OCR**: Advanced text extraction and expiry date parsing
- **Complex Image Analysis**: Multi-format date recognition and confidence scoring
- **Session Analytics**: Scan tracking and performance monitoring
- **Product Enrichment**: Database storage of frontend-provided OpenFoodFacts data

## 📡 Frontend Implementation

### 1. Native Barcode Scanning (Client-Side)
**Technology:** Browser's Barcode Detection API
**File:** `components/barcode/barcode-scanner.tsx` ✅ IMPLEMENTED

```typescript
// Real-time barcode scanning
const { detectBarcodes } = useBarcodeDetection()
const detections = await detectBarcodes(canvas)
```

### 2. OpenFoodFacts Integration (Client-Side)
**Technology:** Direct API calls to OpenFoodFacts
**File:** `lib/queries/open-food-facts.ts` ✅ IMPLEMENTED

```typescript
// Product lookup
const productData = await openFoodFactsClient.lookupProduct(barcode)
```

### 3. Scanning Workflow Management (Client-Side)
**Technology:** Zustand state management
**File:** `lib/stores/scanning-workflow-store.ts` ✅ IMPLEMENTED

```typescript
// Complete workflow state
const { currentStep, scannedProduct, setCurrentStep } = useScanningWorkflow()
```

## 🔧 Backend API Endpoints (Complex Processing Only)

### 1. OCR Expiry Date Extraction
**Endpoint:** `POST /api/v1/ocr/scan/ocr-expiry/{store_id}`
**Purpose:** Extract expiry dates from complex images using Google Vision
**When to Use:** When barcode doesn't provide expiry date and complex OCR is needed

**Request:**
```typescript
FormData {
  image: File // Image file (JPEG, PNG, WebP, max 10MB)
  confidence_threshold?: number // 0.1-1.0, default 0.65
  max_processing_time_ms?: number // 1000-10000, default 4000
}
```

**Response:**
```typescript
{
  success: boolean
  scan_type: "expiry_date_extraction"
  expiry_date?: string // ISO date string
  confidence_threshold: number
  processing_type: "google_vision_ocr"
}
```

### 2. Full OCR Analysis
**Endpoint:** `POST /api/v1/ocr/scan/full-ocr/{store_id}`
**Purpose:** Complete Google Vision analysis for complex scenarios
**When to Use:** When comprehensive image analysis is needed

**Request:**
```typescript
FormData {
  image: File // Image file (JPEG, PNG, WebP, max 15MB)
  confidence_threshold?: number // 0.1-1.0, default 0.7
  max_processing_time_ms?: number // 1000-10000, default 5000
}
```

**Response:**
```typescript
{
  success: boolean
  scan_type: "full_ocr_analysis"
  barcode?: string
  suggested_name?: string
  expiry_date?: string
  raw_text_blocks: string[]
  confidence_scores: {
    overall: number
    barcode: number
    expiry: number
  }
  processing_info: {
    processing_time_ms: number
    data_sources: string[]
    requires_user_confirmation: boolean
    image_dimensions: { width: number, height: number }
  }
  vision_details: {
    detected_barcodes: number
    detected_text_blocks: number
    expiry_candidates: number
  }
}
```

### 3. Text Extraction Only
**Endpoint:** `POST /api/v1/ocr/scan/text-extraction/{store_id}`
**Purpose:** Extract all text for manual product entry assistance
**When to Use:** When user needs help with manual product entry

**Request:**
```typescript
FormData {
  image: File // Image file (JPEG, PNG, WebP, max 8MB)
  confidence_threshold?: number // 0.1-1.0, default 0.6
}
```

**Response:**
```typescript
{
  success: boolean
  scan_type: "text_extraction"
  text_blocks: string[]
  suggested_name?: string
  confidence_threshold: number
  processing_info: {
    processing_time_ms: number
    total_text_blocks: number
    high_confidence_blocks: number
  }
}
```

### 4. Product Enrichment (Database Storage)
**Endpoint:** `POST /api/v1/product-enrichment/enrich/{store_id}`
**Purpose:** Store OpenFoodFacts data provided by frontend
**When to Use:** After frontend successfully fetches product data

**Request:**
```typescript
{
  barcode: string
  confidence_score: number
  product_data: {
    product_name?: string
    product_name_en?: string
    brands?: string
    categories?: string
    image_url?: string
    // ... other OpenFoodFacts fields
  }
}
```

**Response:**
```typescript
{
  product_id: string
  was_created: boolean
  was_updated: boolean
  cache_hit: boolean
}
```

### 5. Scan Session Management
**Endpoint:** `POST /api/v1/scan-sessions/create/{store_id}`
**Purpose:** Track scanning sessions for analytics
**When to Use:** Start of scanning workflow for tracking

## 🔄 Recommended Frontend Workflow

### 1. Real-Time Barcode Scanning
```typescript
// 1. Start camera and detect barcodes
const barcodeScanner = <BarcodeScanner onScan={handleBarcodeDetected} />

// 2. On barcode detection, lookup product
const handleBarcodeDetected = async (barcode: string) => {
  const productData = await openFoodFactsClient.lookupProduct(barcode)
  
  if (productData.found) {
    // 3. Store in database via backend
    await enrichProduct(storeId, {
      barcode,
      confidence_score: 1.0,
      product_data: productData.product
    })
    
    // 4. Continue with expiry date if needed
    if (!productData.product.expiry_date) {
      // Use backend OCR for expiry extraction
      const expiryResult = await extractExpiryDateOCR(storeId, imageFile)
    }
  }
}
```

### 2. Manual Product Entry
```typescript
// For unknown products, use text extraction to help user
const helpWithManualEntry = async (imageFile: File) => {
  const textResult = await extractTextOnly(storeId, imageFile)
  
  // Show extracted text to help user fill form
  setManualEntryHints(textResult.text_blocks)
}
```

## 🚀 Performance Benefits

### Frontend Benefits
- **Real-time scanning**: No backend roundtrips for barcode detection
- **Instant product lookup**: Direct OpenFoodFacts API calls
- **Offline capability**: Cached product data via React Query
- **Better UX**: Immediate feedback and state management

### Backend Benefits
- **Focused processing**: Only complex AI tasks requiring Google Vision
- **Reduced API calls**: No duplicate OpenFoodFacts requests
- **Better resource usage**: AI processing only when needed
- **Simplified codebase**: Clear separation of concerns

## 📊 Migration Notes

### Removed Endpoints (Now Handled by Frontend)
- `POST /api/v1/product/scan/barcode/{store_id}` → Native browser barcode detection
- `POST /api/v1/image/detect-barcode/{store_id}` → Native browser barcode detection  
- `POST /api/v1/product/scan/complete/{store_id}` → Split between frontend and OCR endpoints

### New Endpoint Structure
- `/api/v1/vision/*` → Google Vision API processing
- `/api/v1/ocr/*` → OCR-focused product scanning
- `/api/v1/product-enrichment/*` → Database operations
- `/api/v1/scan-sessions/*` → Session management

This optimized architecture provides better performance, clearer separation of concerns, and improved user experience while maintaining all functionality.