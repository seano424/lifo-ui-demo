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

- **Google Vision OCR**: Advanced text extraction and dual date parsing (expiry + manufacture)
- **European Multilingual Support**: Context recognition in EN/FR/DE/NL languages
- **Complex Image Analysis**: Multi-format date recognition with context-aware classification
- **Partial Date Inference**: Handle incomplete dates like "SEP 30" with current year inference
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
  expiry_date?: string           // Primary expiry date (ISO format)
  manufacture_date?: string      // Production/manufacture date (ISO format, if detected)
  confidence_threshold: number
  processing_type: "google_vision_ocr"
  // Optional metadata for advanced scenarios
  date_extraction_metadata?: {
    extraction_strategy: "dual_context_based" | "temporal_inference"
    total_dates_detected: number
  }
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
  // Dual date extraction - both dates available
  expiry_date?: string           // Primary expiry date (ISO format)
  manufacture_date?: string      // Production/manufacture date (ISO format)
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
  // Enhanced metadata for dual date extraction
  date_extraction_metadata: {
    total_dates_detected: number
    expiry_candidates: number
    manufacture_candidates: number
    unknown_candidates: number
    extraction_strategy: "dual_context_based" | "temporal_inference"
    expiry_metadata: {
      context: string           // "expiry_definitive" | "expiry_quality" | etc.
      confidence: number        // 0.0-1.0
      language: string          // "en" | "fr" | "de" | "nl" | "unknown"
      raw_context: string       // Original OCR text with context
      source: string           // "expiry_detection" | "text_fragment_parsing"
    }
    manufacture_metadata: {
      context: string           // "manufacture_definitive" | "inferred_from_earlier_date"
      confidence: number        // 0.0-1.0
      language: string          // "en" | "fr" | "de" | "nl" | "unknown"
      raw_context: string       // Original OCR text with context
      source: string           // "expiry_detection" | "text_fragment_parsing"
    }
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

### 4. Advanced Vision Analysis

**Endpoint:** `POST /api/v1/vision/analyze-image/{store_id}`
**Purpose:** Advanced image analysis with Google Vision API
**When to Use:** When comprehensive image analysis is needed with bounding boxes

**Request:**

```typescript
FormData {
  image: File // Image file (JPEG, PNG, WebP, max 10MB)
  analysis_type?: string // "expiry_date", "barcode", "full", default "full"
  confidence_threshold?: number // 0.1-1.0, default 0.7
}
```

**Response:**

```typescript
{
  success: boolean
  image_id: string
  analysis_type: string
  analysis_results: {
    detections: Array<{
      type: string // "expiry_date", "barcode_ean13", "product_name"
      value: string
      confidence: number
      bounding_box?: { x: number, y: number, width: number, height: number }
      original_text?: string // For expiry dates
    }>
    analysis_metadata: {
      processing_confidence: number
      data_sources: string[]
      requires_user_confirmation: boolean
    }
  }
  processing_info: {
    model_version: string
    processing_time_ms: number
    image_size_bytes: number
    confidence_score: number
  }
  next_steps: string[]
}
```

### 5. ML Models Status Check

**Endpoint:** `GET /api/v1/vision/ml-models/status`
**Purpose:** Check health and status of ML models
**When to Use:** For system monitoring and debugging

**Response:**

```typescript
{
  overall_status: "ready" | "training" | "error"
  models: {
    expiry_date_ocr: {
      status: string
      version: string
      accuracy: number
      last_updated: string
    }
    barcode_detector: {
      status: string
      version: string
      accuracy: number
      supported_types: string[]
    }
  }
  performance_summary: {
    average_processing_time_ms: number
    daily_analysis_count: number
    overall_accuracy: number
  }
}
```

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

    // 4. Continue with dual date extraction if needed
    if (!productData.product.expiry_date) {
      // Use backend OCR for dual date extraction
      const ocrResult = await extractFullOCR(storeId, imageFile)

      // Handle both dates if extracted
      if (ocrResult.expiry_date) {
        productData.expiry_date = ocrResult.expiry_date
      }
      if (ocrResult.manufacture_date) {
        productData.manufacture_date = ocrResult.manufacture_date
      }

      // Show extraction metadata for user confidence
      if (ocrResult.date_extraction_metadata.extraction_strategy === "dual_context_based") {
        showHighConfidenceIndicator()
      }
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
