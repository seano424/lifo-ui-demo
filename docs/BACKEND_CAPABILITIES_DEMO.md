# Backend Capabilities Demo Guide

This comprehensive demo showcases all the optimized backend capabilities for the LIFO product scanning system.

## 🎯 Architecture Overview

**Frontend**: Native barcode scanning + OpenFoodFacts API calls + React Query caching
**Backend**: EU-optimized Google Vision OCR + European food label processing + Database operations

## 📋 Demo Scenarios

### Scenario 1: OCR Expiry Date Extraction

**Use Case:** Product has barcode but expiry date is printed on package and needs OCR
**Endpoint:** `POST /api/v1/ocr/scan/ocr-expiry/{store_id}`

#### Demo Request

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/store_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@expiry_date_sample.jpg" \
  -F "confidence_threshold=0.65" \
  -F "max_processing_time_ms=4000"
```

#### Expected Response

```json
{
  "success": true,
  "scan_type": "expiry_date_extraction",
  "expiry_date": "2024-03-15",
  "confidence_threshold": 0.65,
  "processing_type": "google_vision_ocr"
}
```

#### Demo Images for Testing (European Focus)

- `expiry_date_clear_ddmmyyyy.jpg` - Clear European date format (DD/MM/YYYY)
- `expiry_date_french.jpg` - French expiry date ("À consommer avant le 15/03/2024")
- `expiry_date_german.jpg` - German expiry date ("Mindestens haltbar bis 15.03.2024")
- `expiry_date_dutch.jpg` - Dutch expiry date ("Ten minste houdbaar tot 15-03-2024")
- `expiry_date_faded_eu.jpg` - Faded text on European packaging
- `expiry_date_ean13.jpg` - Product with EAN-13 barcode + date

---

### Scenario 2: Full OCR Analysis

**Use Case:** Complex product image requiring comprehensive analysis
**Endpoint:** `POST /api/v1/ocr/scan/full-ocr/{store_id}`

#### Demo Request

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/store_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@complex_product.jpg" \
  -F "confidence_threshold=0.7" \
  -F "max_processing_time_ms=5000"
```

#### Expected Response

```json
{
  "success": true,
  "scan_type": "full_ocr_analysis",
  "barcode": "8712345678901",
  "suggested_name": "Organic Milk 1L",
  "expiry_date": "2024-03-20",
  "raw_text_blocks": [
    "Organic Milk",
    "1L",
    "Use by 20/03/24",
    "8712345678901",
    "Keep refrigerated"
  ],
  "confidence_scores": {
    "overall": 0.85,
    "barcode": 0.95,
    "expiry": 0.78
  },
  "processing_info": {
    "processing_time_ms": 2340,
    "data_sources": ["google_vision"],
    "requires_user_confirmation": false,
    "image_dimensions": { "width": 1024, "height": 768 }
  },
  "vision_details": {
    "detected_barcodes": 1,
    "detected_text_blocks": 8,
    "expiry_candidates": 2
  }
}
```

#### Demo Images for Testing (European Products)

- `complex_product_eu_milk.jpg` - European milk carton with EAN-13, multilingual text
- `complex_product_french_cheese.jpg` - French cheese with French expiry date
- `complex_product_german_bread.jpg` - German bread with German date format
- `complex_product_dutch_yogurt.jpg` - Dutch yogurt with multiple languages
- `complex_product_rotated_eu.jpg` - Rotated European product image
- `complex_product_damaged_eu_label.jpg` - Damaged European product label

---

### Scenario 3: Text Extraction for Manual Entry

**Use Case:** Help user with manual product entry by extracting visible text
**Endpoint:** `POST /api/v1/ocr/scan/text-extraction/{store_id}`

#### Demo Request

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/text-extraction/store_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@manual_entry_help.jpg" \
  -F "confidence_threshold=0.6"
```

#### Expected Response

```json
{
  "success": true,
  "scan_type": "text_extraction",
  "text_blocks": [
    "Premium Pasta Sauce",
    "Marinara",
    "500g",
    "Ingredients: Tomatoes, Basil, Garlic",
    "Made in Italy"
  ],
  "suggested_name": "Premium Pasta Sauce",
  "confidence_threshold": 0.6,
  "processing_info": {
    "processing_time_ms": 1580,
    "total_text_blocks": 12,
    "high_confidence_blocks": 5
  }
}
```

#### Demo Images for Testing

- `manual_entry_clear_text.jpg` - Clear product with readable text
- `manual_entry_handwritten.jpg` - Product with handwritten labels
- `manual_entry_foreign_language.jpg` - Non-English product text
- `manual_entry_small_text.jpg` - Product with very small text

---

### Scenario 4: Vision-Based Image Analysis

**Use Case:** Advanced image analysis for quality assessment
**Endpoint:** `POST /api/v1/vision/analyze-image/{store_id}`

#### Demo Request

```bash
curl -X POST "http://localhost:8000/api/v1/vision/analyze-image/store_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@product_analysis.jpg" \
  -F "analysis_type=full" \
  -F "confidence_threshold=0.7"
```

#### Expected Response

```json
{
  "success": true,
  "image_id": "uuid-generated-id",
  "image_url": "temp_storage/store_123/uuid-generated-id.jpg",
  "analysis_type": "full",
  "confidence_threshold": 0.7,
  "analysis_results": {
    "detections": [
      {
        "type": "expiry_date",
        "value": "2024-03-25",
        "confidence": 0.89,
        "bounding_box": { "x": 120, "y": 340, "width": 80, "height": 20 },
        "original_text": "25/03/24"
      },
      {
        "type": "barcode_ean13",
        "value": "8712345678901",
        "confidence": 0.95,
        "bounding_box": { "x": 50, "y": 200, "width": 150, "height": 40 }
      },
      {
        "type": "product_name",
        "value": "Organic Bananas",
        "confidence": 0.87,
        "bounding_box": { "x": 30, "y": 50, "width": 200, "height": 30 }
      }
    ],
    "analysis_metadata": {
      "processing_confidence": 0.9,
      "data_sources": ["google_vision"],
      "requires_user_confirmation": false
    }
  },
  "processing_info": {
    "model_version": "google_vision_v3.4_openfoodfacts_v2",
    "processing_time_ms": 2145,
    "image_size_bytes": 1024768,
    "confidence_score": 0.9
  },
  "next_steps": [
    "Review detected information for accuracy",
    "Proceed with scan-in workflow if confident",
    "Manual entry if confidence is low"
  ]
}
```

---

## 🇪🇺 European Market Optimizations

### Regional Configuration

All backend endpoints are optimized for European markets:

- **Google Vision Endpoint**: `eu-vision.googleapis.com` for GDPR compliance
- **Target Markets**: France, Germany, Netherlands
- **Date Format Priority**: DD/MM/YYYY (European standard)
- **Barcode Standards**: EAN-13 (13 digits), EAN-8 (8 digits)

### Multilingual Support

The OCR system supports:

- **English**: "Best before", "Use by", "Exp"
- **French**: "À consommer avant", "DLC", "DLUO"
- **German**: "Mindestens haltbar bis", "MHD", "Verbrauchen bis"
- **Dutch**: "Ten minste houdbaar tot", "THT", "Te gebruiken tot"

### European Test Examples

```bash
# Test French product
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/store_fr" \
  -F "image=@test_images/french_yogurt.jpg"

# Test German product
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/store_de" \
  -F "image=@test_images/german_bread.jpg"

# Test Dutch product
curl -X POST "http://localhost:8000/api/v1/vision/analyze-image/store_nl" \
  -F "image=@test_images/dutch_cheese.jpg"
```

---

## 🧪 Testing Workflow

### 1. Set Up Test Environment

```bash
# Start the backend server
uvicorn app.main:app --reload --port 8000

# Verify API health
curl http://localhost:8000/health
```

### 2. Authentication Setup

```bash
# Get authentication token
export AUTH_TOKEN="your-auth-token-here"
```

### 3. Test Image Preparation

Create a test image directory with sample images:

```bash
mkdir -p test_images
# Add your test images to this directory
```

### 4. Run Complete Demo Workflow

#### Step 1: OCR Expiry Date Extraction

```bash
# Test with clear expiry date
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_images/clear_expiry.jpg" \
  -F "confidence_threshold=0.65"
```

#### Step 2: Full OCR Analysis

```bash
# Test comprehensive analysis
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_images/complex_product.jpg" \
  -F "confidence_threshold=0.7"
```

#### Step 3: Text Extraction

```bash
# Test manual entry assistance
curl -X POST "http://localhost:8000/api/v1/ocr/scan/text-extraction/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_images/text_product.jpg" \
  -F "confidence_threshold=0.6"
```

#### Step 4: Vision Analysis

```bash
# Test advanced image analysis
curl -X POST "http://localhost:8000/api/v1/vision/analyze-image/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_images/analysis_product.jpg" \
  -F "analysis_type=full"
```

---

## 📊 Performance Benchmarks

### Response Time Targets

- **OCR Expiry Extraction**: < 4 seconds
- **Full OCR Analysis**: < 5 seconds
- **Text Extraction**: < 3 seconds
- **Vision Analysis**: < 5 seconds

### Confidence Score Thresholds

- **High Confidence**: > 0.8 (Auto-accept)
- **Medium Confidence**: 0.6 - 0.8 (User confirmation)
- **Low Confidence**: < 0.6 (Manual entry recommended)

### Image Size Limits

- **OCR Expiry**: 10MB max
- **Full OCR**: 15MB max
- **Text Extraction**: 8MB max
- **Vision Analysis**: 10MB max

---

## 🔧 Configuration Options

### Processing Timeouts

```python
# Endpoint-specific timeouts
OCR_EXPIRY_TIMEOUT = 4000  # 4 seconds
FULL_OCR_TIMEOUT = 5000    # 5 seconds
TEXT_EXTRACTION_TIMEOUT = 3000  # 3 seconds
```

### Confidence Thresholds

```python
# Default confidence thresholds
BARCODE_MIN_CONFIDENCE = 0.6
EXPIRY_MIN_CONFIDENCE = 0.65
TEXT_MIN_CONFIDENCE = 0.5
OVERALL_MIN_CONFIDENCE = 0.7
```

### Rate Limiting

```python
# API rate limits per minute
OCR_EXPIRY_RATE = 12
FULL_OCR_RATE = 8
TEXT_EXTRACTION_RATE = 15
VISION_ANALYSIS_RATE = 10
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Low Confidence Scores

**Problem**: OCR returning low confidence scores
**Solutions**:

- Ensure good lighting in images
- Check image resolution (min 800x600 recommended)
- Verify text is clearly visible and not rotated
- Try adjusting confidence_threshold parameter

#### 2. Timeout Errors

**Problem**: Requests timing out
**Solutions**:

- Reduce image file size
- Increase max_processing_time_ms parameter
- Check Google Vision API status
- Verify network connectivity

#### 3. Invalid Image Format

**Problem**: Image upload rejected
**Solutions**:

- Use supported formats: JPEG, PNG, WebP
- Check file size limits
- Verify image is not corrupted
- Test with simple image first

#### 4. Authentication Errors

**Problem**: 401/403 errors
**Solutions**:

- Verify authentication token is valid
- Check token has required permissions
- Ensure store_id format is correct (alphanumeric + hyphens)

---

## 📈 Performance Monitoring

### Key Metrics to Track

- **Processing Time**: Monitor average response times
- **Confidence Scores**: Track accuracy over time
- **Error Rates**: Monitor failed requests
- **API Usage**: Track endpoint usage patterns

### Health Check Endpoint

```bash
curl http://localhost:8000/api/v1/vision/ml-models/status
```

Expected response:

```json
{
  "overall_status": "ready",
  "models": {
    "expiry_date_ocr": {
      "status": "ready",
      "version": "v1.2.3",
      "accuracy": 0.92
    },
    "barcode_detector": {
      "status": "ready",
      "version": "v2.1.0",
      "accuracy": 0.96
    }
  }
}
```

This demo guide provides comprehensive testing scenarios for all backend capabilities, ensuring the optimized architecture performs as expected.
