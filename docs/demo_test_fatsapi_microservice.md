# 🚀 FastAPI Microservice Demo & Testing Guide

## Overview

This guide provides comprehensive instructions for testing and demonstrating all FastAPI microservice endpoints in the LIFO.AI system. The microservice provides AI-powered inventory scoring, mobile-optimized scan workflows, and MVP analytics with enterprise-grade security.

## 🔧 Prerequisites

### Environment Setup

#### 1. Create Environment File

Create a `.env.local` file in the `lifo_api` directory:

```bash
# Navigate to the FastAPI directory
cd lifo_api

# Create .env.local file
touch .env.local
```

#### 2. Configure Environment Variables ⚠️ SECURITY WARNING

Add the following to your `.env.local` file (NEVER commit real credentials):

```bash
# .env.local - NEVER COMMIT THIS FILE
# SECURITY WARNING: Replace all placeholder values with actual credentials
# DO NOT commit .env file with real credentials - add .env to .gitignore

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-key-here

# Database (use environment-specific values)
DATABASE_URL=postgresql://user:password@localhost:5432/lifo_db

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
API_VERSION=1.0.0

# Security: CORS settings for development only
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting (development settings)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE=memory://
```

#### 3. Install Dependencies & Start Server

```bash
# Install dependencies
pip install -r requirements.txt

# Load environment variables and start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 🔒 Security Notes

- **Environment Variables**: Use `.env.local` for development, never commit real credentials
- **Service Role Key**: Only use for administrative operations, never in client-side code
- **Rate Limiting**: Development has relaxed limits, production has strict security controls
- **CORS**: Only allow trusted origins in production
- **Database**: Use connection pooling and parameterized queries for security

#### Alternative: Manual Export (for testing only)

```bash
export SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export SUPABASE_JWT_SECRET="your-jwt-secret-key-here"
export DATABASE_URL="postgresql://user:password@localhost:5432/lifo_db"
```

### Test Authentication Token

For testing, you'll need a valid Supabase JWT token. Replace `YOUR_JWT_TOKEN` in examples below with:

```javascript
// Get from your Supabase client
const token = (await supabase.auth.getSession()).data.session?.access_token
```

## =� Base Information

### API Base URL

- **Local Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

### Authentication Header

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Test Store ID

Use this UUID for testing: `123e4567-e89b-12d3-a456-426614174000`

## <� Health & Status Endpoints

### 1. Root Endpoint

```bash
curl -X GET "http://localhost:8000/" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "service": "LIFO AI Engine",
  "version": "1.0.0",
  "description": "Intelligent inventory scoring and waste reduction microservice",
  "status": "operational",
  "features": [
    "Multi-factor inventory scoring",
    "Real-time recommendations",
    "CSV bulk processing",
    "Store-aware analytics",
    "Supabase authentication"
  ]
}
```

### 2. Health Check

```bash
curl -X GET "http://localhost:8000/health" \
  -H "Content-Type: application/json"
```

### 3. API Information

```bash
curl -X GET "http://localhost:8000/api/info" \
  -H "Content-Type: application/json"
```

## <� Scan Workflow Endpoints

### 1. Scan-In Workflow (Proof of Delivery)

**Purpose**: Register new inventory via mobile scanning

```bash
curl -X POST "http://localhost:8000/api/v1/scan/scan-in/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_sku": "APPLE-RED-001",
    "barcode": "1234567890123",
    "expiry_date": "2024-02-15",
    "quantity": 50,
    "cost_price": 1.50,
    "selling_price": 2.99,
    "location_code": "PRODUCE",
    "supplier_info": "Fresh Farms Ltd"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "batch_number": "STORE123_APPLE-RED-001_20240215_001",
  "initial_score": 0.75,
  "urgency_level": "medium",
  "recommendations": ["Monitor closely - score increasing", "Consider promotion in 3 days"],
  "processing_time_ms": 245
}
```

### 2. Scan-Out Workflow (Sales/Disposal Tracking)

**Purpose**: Track when inventory is sold, discounted, or disposed

```bash
curl -X POST "http://localhost:8000/api/v1/scan/scan-out/123e4567-e89b-12d3-a456-426614174000/456e7890-f12a-34b5-c678-567890123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sold_discounted",
    "quantity_moved": 10,
    "actual_selling_price": 2.39,
    "discount_percent": 20,
    "destination_location": "CHECKOUT",
    "notes": "Quick sale discount applied"
  }'
```

**Action Types Available:**

- `sold_full_price` - Regular sale
- `sold_discounted` - Discounted sale
- `donated` - Donation to charity
- `discarded` - Waste disposal
- `moved_location` - Location transfer
- `returned_supplier` - Supplier return

### 3. Process Combined Scan

**Purpose**: Process barcode + expiry date scan data (future image recognition)

```bash
curl -X POST "http://localhost:8000/api/v1/scan/process-scan/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "1234567890123",
    "expiry_date": "2024-02-10",
    "quantity": 25,
    "confidence_score": 0.95,
    "ocr_data": {
      "text_found": "Best Before 10/02/24",
      "confidence": 0.89
    }
  }'
```

## =� Mobile-Optimized Endpoints

### 1. Mobile Dashboard Summary

**Purpose**: Fast overview for mobile scanning interface (target <300ms)

```bash
curl -X GET "http://localhost:8000/api/v1/mobile/mobile-summary/123e4567-e89b-12d3-a456-426614174000?include_details=true&limit_urgent=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "urgent_batches": [
    {
      "batch_id": "uuid",
      "product_sku": "MILK-WHOLE-1L",
      "score": 0.92,
      "expires_in_hours": 8,
      "quantity_remaining": 12
    }
  ],
  "expiring_today": [],
  "action_needed": [],
  "total_active_batches": 156,
  "store_health_score": 0.85,
  "last_updated": "2024-01-15T10:30:00Z",
  "cache_expires_in": 300
}
```

### 2. Quick Batch Scoring

**Purpose**: Real-time scoring for scanned items (target <200ms)

```bash
curl -X POST "http://localhost:8000/api/v1/mobile/batch-quick-score/456e7890-f12a-34b5-c678-567890123456?store_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Store Health Check

**Purpose**: Overall store inventory health for mobile dashboard

```bash
curl -X GET "http://localhost:8000/api/v1/mobile/store-health/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Mobile Batch List

**Purpose**: Filtered, paginated batch list optimized for mobile

```bash
curl -X GET "http://localhost:8000/api/v1/mobile/batch-list-mobile/123e4567-e89b-12d3-a456-426614174000?category=fresh_produce&urgency_filter=high&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Filter Options:**

- `category`: `fresh_produce`, `dairy`, `bakery`, `packaged`, `frozen`
- `urgency_filter`: `low`, `medium`, `high`, `critical`
- `sort_by`: `score`, `expiry_date`, `quantity`, `created_at`

## =� MVP Analytics Endpoints

### 1. MVP Validation Metrics

**Purpose**: Track key metrics for MVP success measurement

```bash
curl -X GET "http://localhost:8000/api/v1/mvp/mvp-metrics/123e4567-e89b-12d3-a456-426614174000?date_range=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "batches_scanned_today": 23,
  "products_added_via_scan": 45,
  "waste_prevented_value_eur": 127.5,
  "donation_opportunities": 8,
  "discount_recommendations_given": 15,
  "discount_recommendations_acted_on": 12,
  "time_to_action_hours": 2.4,
  "scan_efficiency_score": 0.87,
  "user_satisfaction_score": 4.2,
  "mobile_vs_manual_ratio": 0.73
}
```

### 2. Batch Insights

**Purpose**: Pattern analysis and optimization opportunities

```bash
curl -X GET "http://localhost:8000/api/v1/mvp/batch-insights/123e4567-e89b-12d3-a456-426614174000?analysis_depth=detailed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Analysis Depth Options:**

- `basic` - Essential insights only
- `standard` - Comprehensive analysis
- `detailed` - Deep dive with recommendations

### 3. Scan Workflow Statistics

**Purpose**: Adoption and usage metrics for scan workflows

```bash
curl -X GET "http://localhost:8000/api/v1/mvp/scan-workflow-stats/123e4567-e89b-12d3-a456-426614174000?days=14" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Waste Prevention Impact

**Purpose**: ROI analysis and sustainability impact

```bash
curl -X GET "http://localhost:8000/api/v1/mvp/waste-prevention-impact/123e4567-e89b-12d3-a456-426614174000?comparison_period=30&baseline_period=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Action Effectiveness

**Purpose**: Measure success rates of different actions

```bash
curl -X GET "http://localhost:8000/api/v1/mvp/action-effectiveness/123e4567-e89b-12d3-a456-426614174000?days=21" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## =� Image Recognition Endpoints (Future-Ready)

### 1. ML Models Status

**Purpose**: Check health of image recognition models

```bash
curl -X GET "http://localhost:8000/api/v1/image/ml-models/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Analyze Product Image

**Purpose**: Full image analysis for expiry date, barcode, and product info

```bash
curl -X POST "http://localhost:8000/api/v1/image/analyze-image/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@product_image.jpg" \
  -F "analysis_type=full" \
  -F "confidence_threshold=0.8"
```

### 3. Extract Expiry Date

**Purpose**: OCR-focused expiry date extraction

```bash
curl -X POST "http://localhost:8000/api/v1/image/extract-expiry-date/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@expiry_label.jpg" \
  -F "date_format_hint=DD/MM/YYYY"
```

### 4. Detect Barcode

**Purpose**: Computer vision barcode detection

```bash
curl -X POST "http://localhost:8000/api/v1/image/detect-barcode/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@barcode_image.jpg" \
  -F "barcode_types=EAN13" \
  -F "barcode_types=UPC"
```

## >� Legacy AI Scoring Endpoints

### 1. Calculate Batch Score

```bash
curl -X POST "http://localhost:8000/api/v1/scoring/calculate-score" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "123e4567-e89b-12d3-a456-426614174000",
    "batch_id": "456e7890-f12a-34b5-c678-567890123456"
  }'
```

### 2. Bulk Score Calculation

```bash
curl -X POST "http://localhost:8000/api/v1/scoring/calculate-bulk-scores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "123e4567-e89b-12d3-a456-426614174000",
    "batch_ids": [
      "456e7890-f12a-34b5-c678-567890123456",
      "789e0123-f45a-67b8-c901-234567890123"
    ]
  }'
```

### 3. Recommendations

```bash
curl -X GET "http://localhost:8000/api/v1/scoring/recommendations/123e4567-e89b-12d3-a456-426614174000?limit=10&urgency_level=high" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## =� Analytics Endpoints

### 1. Store Analytics

```bash
curl -X GET "http://localhost:8000/api/v1/analytics/store-analytics/123e4567-e89b-12d3-a456-426614174000?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Waste Analytics

```bash
curl -X GET "http://localhost:8000/api/v1/analytics/waste-analytics/123e4567-e89b-12d3-a456-426614174000?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Category Performance

```bash
curl -X GET "http://localhost:8000/api/v1/analytics/category-performance/123e4567-e89b-12d3-a456-426614174000?category=fresh_produce&days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## =� CSV Processing Endpoints

### 1. Upload CSV

```bash
curl -X POST "http://localhost:8000/api/v1/csv/upload/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory_data.csv" \
  -F "source=manual_upload" \
  -F "validate_only=false"
```

### 2. Process CSV

```bash
curl -X POST "http://localhost:8000/api/v1/csv/process/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "temp/uploaded_file.csv",
    "mapping": {
      "product_sku": "SKU",
      "quantity": "Stock_Quantity",
      "expiry_date": "Expiry_Date"
    }
  }'
```

## >� Testing Scenarios

### 1. Complete Scan Workflow Test

```bash
#!/bin/bash
STORE_ID="123e4567-e89b-12d3-a456-426614174000"
TOKEN="YOUR_JWT_TOKEN"
BASE_URL="http://localhost:8000"

# 1. Check store health before scan
echo "=== Initial Store Health ==="
curl -X GET "$BASE_URL/api/v1/mobile/store-health/$STORE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 2. Scan in new batch
echo -e "\n=== Scan In New Batch ==="
BATCH_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/scan/scan-in/$STORE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_sku": "TEST-PRODUCT-001",
    "expiry_date": "2024-02-10",
    "quantity": 30,
    "cost_price": 2.00,
    "selling_price": 3.50
  }')

# Extract batch_id from response
BATCH_ID=$(echo $BATCH_RESPONSE | jq -r '.batch_id')
echo "Created batch: $BATCH_ID"

# 3. Get mobile summary
echo -e "\n=== Mobile Summary After Scan ==="
curl -X GET "$BASE_URL/api/v1/mobile/mobile-summary/$STORE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 4. Quick score the batch
echo -e "\n=== Quick Score Batch ==="
curl -X POST "$BASE_URL/api/v1/mobile/batch-quick-score/$BATCH_ID?store_id=$STORE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 5. Scan out some quantity
echo -e "\n=== Scan Out Partial Quantity ==="
curl -X POST "$BASE_URL/api/v1/scan/scan-out/$STORE_ID/$BATCH_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sold_discounted",
    "quantity_moved": 10,
    "actual_selling_price": 2.80,
    "discount_percent": 20
  }'

# 6. Check MVP metrics
echo -e "\n=== MVP Metrics ==="
curl -X GET "$BASE_URL/api/v1/mvp/mvp-metrics/$STORE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Performance Testing

```bash
#!/bin/bash
# Test mobile performance requirements
STORE_ID="123e4567-e89b-12d3-a456-426614174000"
TOKEN="YOUR_JWT_TOKEN"
BASE_URL="http://localhost:8000"

echo "Testing mobile performance requirements..."

# Test mobile summary (target <300ms)
echo "Mobile Summary Performance:"
time curl -X GET "$BASE_URL/api/v1/mobile/mobile-summary/$STORE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1

# Test quick scoring (target <200ms)
echo "Quick Scoring Performance:"
time curl -X POST "$BASE_URL/api/v1/mobile/batch-quick-score/456e7890-f12a-34b5-c678-567890123456?store_id=$STORE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
```

### 3. Error Handling Test

```bash
#!/bin/bash
# Test error scenarios
BASE_URL="http://localhost:8000"
TOKEN="YOUR_JWT_TOKEN"

echo "Testing error handling..."

# Invalid UUID format
curl -X GET "$BASE_URL/api/v1/mobile/mobile-summary/invalid-uuid" \
  -H "Authorization: Bearer $TOKEN"

# Missing authentication
curl -X GET "$BASE_URL/api/v1/mobile/mobile-summary/123e4567-e89b-12d3-a456-426614174000"

# Invalid data
curl -X POST "$BASE_URL/api/v1/scan/scan-in/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_sku": "",
    "expiry_date": "invalid-date",
    "quantity": -5
  }'
```

## =� Expected Performance Metrics

### Response Time Targets

- **Mobile Summary**: <300ms
- **Quick Scoring**: <200ms
- **Scan Workflows**: <500ms
- **Analytics**: <1000ms
- **Image Processing**: <2000ms

### Rate Limits

- **Scan Endpoints**: 30-40 requests/minute
- **Mobile Endpoints**: 60-100 requests/minute
- **Analytics**: 20 requests/minute
- **Image Recognition**: 10-20 requests/minute

## =� Troubleshooting

### Common Issues

1. **401 Unauthorized**

   - Check JWT token validity
   - Ensure proper Authorization header format

2. **400 Bad Request**

   - Validate UUID format for store_id/batch_id
   - Check required fields in request body

3. **429 Too Many Requests**

   - Rate limiting active - wait before retrying
   - Check rate limit headers in response

4. **500 Internal Server Error**
   - Database connection issues
   - Check server logs for details

### Debug Commands

```bash
# Check server health
curl -X GET "http://localhost:8000/health"

# View API documentation
open "http://localhost:8000/docs"

# Check logs
tail -f logs/lifo_api.log
```

## <� Demo Script for Stakeholders

### Quick Demo (5 minutes)

1. **Health Check**: Show API is running
2. **Scan In**: Demonstrate mobile scanning workflow
3. **Mobile Dashboard**: Show real-time updates
4. **Analytics**: Display MVP metrics and ROI

### Full Demo (15 minutes)

1. **API Overview**: Root endpoint and capabilities
2. **Complete Workflow**: Scan-in � Score � Actions � Analytics
3. **Mobile Performance**: Speed demonstrations
4. **Image Recognition**: Future capabilities preview
5. **Business Value**: Waste reduction and ROI metrics

This guide provides comprehensive testing coverage for all FastAPI microservice capabilities, from basic health checks to complex workflow demonstrations.
