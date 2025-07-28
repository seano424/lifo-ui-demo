# Complete Setup & Testing Guide

This guide provides step-by-step instructions for setting up and testing all backend capabilities of the optimized LIFO product scanning system.

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Google Cloud Vision API credentials
- PostgreSQL database
- Test images for scanning

### 1. Environment Setup

```bash
# Clone and navigate to the project
cd lifo-app/lifo_api

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/lifo_db

# Google Vision API
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Authentication
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# API Configuration
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### 3. Database Setup

**Prerequisites:** This guide assumes you have a Supabase project already set up with the LIFO.AI schema.

Update your `.env` file with your Supabase connection details:

```bash
# Supabase Database
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
```

Verify database connection:

```bash
python -c "
import asyncio
from app.database.connection import get_db
print('✅ Database connected successfully')
"
```

### 4. Start the Server

```bash
# Development mode
uvicorn app.main:app --reload --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 5. Verify Setup

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## 🧪 Complete Testing Suite

### Test Data Preparation

Create test image directory:

```bash
mkdir -p test_data/images
cd test_data/images
```

Download sample images or use your own:

```bash
# Example test images (create these or download samples)
# - clear_expiry_date.jpg (product with visible expiry date)
# - complex_product.jpg (product with barcode, text, expiry)
# - text_only_product.jpg (product with text but no barcode)
# - low_quality_image.jpg (blurry or low-contrast image)
# - multiple_products.jpg (image with multiple products)
```

### Authentication Setup

Get your authentication token:

```bash
# If using JWT authentication
export AUTH_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# If using API key authentication
export API_KEY="your-api-key"
```

## 📋 Testing All Endpoints

### 1. OCR Expiry Date Extraction

#### Test Case 1: Clear Expiry Date

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test_data/images/clear_expiry_date.jpg" \
  -F "confidence_threshold=0.65" \
  -F "max_processing_time_ms=4000"
```

**Expected Output:**

```json
{
  "success": true,
  "scan_type": "expiry_date_extraction",
  "expiry_date": "2024-03-15",
  "confidence_threshold": 0.65,
  "processing_type": "google_vision_ocr"
}
```

#### Test Case 2: Low Quality Image

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/low_quality_image.jpg" \
  -F "confidence_threshold=0.5"
```

### 2. Full OCR Analysis

#### Test Case 1: Complete Product Analysis

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/complex_product.jpg" \
  -F "confidence_threshold=0.7" \
  -F "max_processing_time_ms=5000"
```

**Expected Output:**

```json
{
  "success": true,
  "scan_type": "full_ocr_analysis",
  "barcode": "1234567890123",
  "suggested_name": "Product Name",
  "expiry_date": "2024-03-20",
  "raw_text_blocks": ["Product Name", "1234567890123", "Best by 20/03/24"],
  "confidence_scores": {
    "overall": 0.85,
    "barcode": 0.95,
    "expiry": 0.78
  },
  "processing_info": {
    "processing_time_ms": 2340,
    "data_sources": ["google_vision"],
    "requires_user_confirmation": false
  }
}
```

### 3. Text Extraction

#### Test Case 1: Manual Entry Assistance

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/text-extraction/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/text_only_product.jpg" \
  -F "confidence_threshold=0.6"
```

**Expected Output:**

```json
{
  "success": true,
  "scan_type": "text_extraction",
  "text_blocks": ["Product Name", "Brand", "Weight: 500g", "Ingredients: ..."],
  "suggested_name": "Product Name",
  "confidence_threshold": 0.6,
  "processing_info": {
    "processing_time_ms": 1580,
    "total_text_blocks": 8,
    "high_confidence_blocks": 4
  }
}
```

### 4. Advanced Vision Analysis

#### Test Case 1: Complete Image Analysis

```bash
curl -X POST "http://localhost:8000/api/v1/vision/analyze-image/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/complex_product.jpg" \
  -F "analysis_type=full" \
  -F "confidence_threshold=0.7"
```

**Expected Output:**

```json
{
  "success": true,
  "image_id": "generated-uuid",
  "analysis_type": "full",
  "analysis_results": {
    "detections": [
      {
        "type": "barcode_ean13",
        "value": "1234567890123",
        "confidence": 0.95,
        "bounding_box": { "x": 50, "y": 200, "width": 150, "height": 40 }
      },
      {
        "type": "expiry_date",
        "value": "2024-03-25",
        "confidence": 0.89,
        "original_text": "25/03/24"
      }
    ]
  }
}
```

### 5. ML Models Status Check

```bash
curl -X GET "http://localhost:8000/api/v1/vision/ml-models/status" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Output:**

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

## 🔧 Advanced Testing Scenarios

### Performance Testing

#### Load Testing with Multiple Requests

```bash
# Test concurrent requests
for i in {1..5}; do
  curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -F "image=@test_data/images/clear_expiry_date.jpg" &
done
wait
```

#### Timeout Testing

```bash
# Test with very short timeout
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/complex_product.jpg" \
  -F "max_processing_time_ms=500"  # Very short timeout
```

### Error Handling Testing

#### Invalid Image Format

```bash
# Test with non-image file
echo "not an image" > test_invalid.txt
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_invalid.txt"
```

#### File Size Limit Testing

```bash
# Test with oversized image (create a large dummy file)
dd if=/dev/zero of=large_image.jpg bs=1M count=20  # 20MB file
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/test_store" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@large_image.jpg"
```

#### Invalid Store ID

```bash
# Test with invalid store ID format
curl -X POST "http://localhost:8000/api/v1/ocr/scan/ocr-expiry/invalid@store#id" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@test_data/images/clear_expiry_date.jpg"
```

## 📊 Performance Benchmarking

### Automated Testing Script

Create `test_performance.py`:

```python
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor

def test_endpoint_performance(endpoint, image_path, num_requests=10):
    """Test endpoint performance with multiple requests"""

    def make_request():
        start_time = time.time()
        with open(image_path, 'rb') as img:
            response = requests.post(
                f"http://localhost:8000{endpoint}",
                headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
                files={"image": img}
            )
        end_time = time.time()
        return end_time - start_time, response.status_code

    # Execute concurrent requests
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(lambda _: make_request(), range(num_requests)))

    response_times = [r[0] for r in results]
    status_codes = [r[1] for r in results]

    print(f"Endpoint: {endpoint}")
    print(f"Average response time: {statistics.mean(response_times):.2f}s")
    print(f"Min response time: {min(response_times):.2f}s")
    print(f"Max response time: {max(response_times):.2f}s")
    print(f"Success rate: {status_codes.count(200) / len(status_codes) * 100:.1f}%")
    print("-" * 50)

# Run performance tests
AUTH_TOKEN = "your-token-here"

test_endpoint_performance(
    "/api/v1/ocr/scan/ocr-expiry/test_store",
    "test_data/images/clear_expiry_date.jpg"
)

test_endpoint_performance(
    "/api/v1/ocr/scan/full-ocr/test_store",
    "test_data/images/complex_product.jpg"
)

test_endpoint_performance(
    "/api/v1/ocr/scan/text-extraction/test_store",
    "test_data/images/text_only_product.jpg"
)
```

Run the performance test:

```bash
python test_performance.py
```

## 🐛 Troubleshooting Guide

### Common Issues

#### Google Vision API Errors

```bash
# Check credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
gcloud auth application-default print-access-token

# Test Vision API directly
python -c "
from google.cloud import vision
client = vision.ImageAnnotatorClient()
print('Vision API connected successfully')
"
```

#### Database Connection Issues

```bash
# Test database connection
python -c "
import asyncio
from app.database.connection import get_db
print('Database connection successful')
"
```

#### Memory Issues with Large Images

```bash
# Monitor memory usage during processing
top -p $(pgrep -f uvicorn)

# Or use htop for better visualization
htop
```

### Logging and Debugging

#### Enable Debug Logging

Add to `.env`:

```bash
LOG_LEVEL=DEBUG
SQLALCHEMY_ECHO=true
```

#### View Application Logs

```bash
# Tail logs in real-time
tail -f app.log

# Filter for specific errors
grep "ERROR" app.log

# Filter for specific endpoint
grep "ocr-expiry" app.log
```

### Health Monitoring

#### Create Health Check Script

```bash
#!/bin/bash
# health_check.sh

echo "=== LIFO Backend Health Check ==="

# API Health
echo "1. API Health:"
curl -s http://localhost:8000/health || echo "❌ API Down"

# Database Health
echo "2. Database Health:"
python -c "
import asyncio
from app.database.connection import get_db
print('✅ Database Connected')
" || echo "❌ Database Connection Failed"

# Vision API Health
echo "3. Vision API Health:"
curl -s -X GET "http://localhost:8000/api/v1/vision/ml-models/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" | grep -q "ready" && echo "✅ Vision API Ready" || echo "❌ Vision API Issues"

echo "=== Health Check Complete ==="
```

Make executable and run:

```bash
chmod +x health_check.sh
./health_check.sh
```

This comprehensive guide covers all aspects of setting up, testing, and monitoring the optimized backend capabilities.
