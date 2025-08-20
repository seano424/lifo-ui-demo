# 📊 CSV Batch Processing Complete Guide

## Overview

The LIFO.AI API provides comprehensive CSV processing capabilities that bridge the gap between CSV data uploads and inventory batch creation in Supabase. This guide covers the complete workflow from CSV upload to batch creation with transaction management and error handling.

## 🚀 Quick Start

### 1. Basic CSV Upload and Validation

```bash
curl -X POST "http://localhost:8001/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory.csv" \
  -F "store_id=550e8400-e29b-41d4-a716-446655440000"
```

### 2. CSV Upload with Batch Creation

```bash
curl -X POST "http://localhost:8001/api/v1/csv-upload/upload-and-create-batches" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory.csv" \
  -F "store_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunk_size=50"
```

## 📋 CSV Format Requirements

### Required Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `sku` | String | Unique product identifier | `APPLE001` |
| `product_name` | String | Product display name | `Red Apples` |
| `category` | String | Product category | `fresh_produce` |
| `quantity` | Number | Initial quantity | `50` |
| `expiry_date` | Date | Expiry date (YYYY-MM-DD) | `2025-07-20` |

### Optional Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `brand` | String | Product brand | `FreshFarms` |
| `cost_price` | Number | Cost price per unit | `2.50` |
| `selling_price` | Number | Selling price per unit | `3.99` |
| `manufacture_date` | Date | Manufacturing date | `2025-07-13` |
| `location_code` | String | Storage location | `MAIN` |
| `unit_type` | String | Unit of measurement | `kg` |

### Sample CSV File

```csv
sku,product_name,category,quantity,expiry_date,brand,cost_price,selling_price,manufacture_date,location_code,unit_type
APPLE001,Red Apples,fresh_produce,50,2025-07-20,FreshFarms,2.50,3.99,2025-07-13,MAIN,kg
MILK002,Whole Milk,dairy,30,2025-07-18,DairyBest,1.20,1.89,2025-07-10,FRIDGE,liter
BREAD003,Sourdough Bread,bakery_fresh,25,2025-07-15,BakeryPlus,2.00,3.50,2025-07-13,BAKERY,pcs
```

## 🏗️ Architecture Overview

### Components

1. **UnifiedCSVProcessor**: Validates and processes CSV files
2. **CSVToBatchAdapter**: Converts CSV data to batch creation requests
3. **BatchCreationService**: Creates inventory batches with transaction management
4. **Security Layer**: Validates and sanitizes CSV content

### Processing Flow

```
CSV Upload → Security Validation → CSV Processing → Data Conversion → Batch Creation → Response
```

## 🔧 API Endpoints

### 1. CSV Template Download

**GET** `/api/v1/csv-upload/template`

Downloads a CSV template with sample data.

```bash
curl -X GET "http://localhost:8001/api/v1/csv-upload/template" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "sku,product_name,category,quantity,expiry_date...",
    "filename": "inventory_template.csv",
    "headers": ["sku", "product_name", "category", "quantity", "expiry_date"],
    "sample_rows": 3,
    "instructions": {
      "required_columns": ["sku", "product_name", "category", "quantity", "expiry_date"],
      "optional_columns": ["brand", "cost_price", "selling_price"],
      "date_format": "YYYY-MM-DD (e.g., 2025-07-20)"
    }
  }
}
```

### 2. CSV Validation Only

**POST** `/api/v1/csv-upload/validate`

Validates CSV file without creating batches.

```bash
curl -X POST "http://localhost:8001/api/v1/csv-upload/validate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory.csv" \
  -F "store_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "success": true,
  "validation_results": {
    "status": "success",
    "valid_rows": 23,
    "total_items": 25,
    "errors": [
      {
        "row": 15,
        "column": "expiry_date",
        "error": "Invalid date format"
      }
    ],
    "warnings": [
      {
        "row": 8,
        "column": "cost_price",
        "warning": "Missing cost price, will use default"
      }
    ],
    "preview_data": [
      {
        "sku": "APPLE001",
        "product_name": "Red Apples",
        "category": "fresh_produce",
        "quantity": 50,
        "expiry_date": "2025-07-20"
      }
    ]
  }
}
```

### 3. CSV Upload with Processing

**POST** `/api/v1/csv-upload/upload`

Processes CSV file without creating batches in Supabase.

```bash
curl -X POST "http://localhost:8001/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory.csv" \
  -F "store_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 23 items",
  "data": {
    "processed_count": 23,
    "total_items": 25,
    "status": "success",
    "warnings": [
      {
        "row": 8,
        "message": "Missing cost price, using default value"
      }
    ],
    "errors": [
      {
        "row": 15,
        "message": "Invalid expiry date format"
      }
    ],
    "security": {
      "status": "safe",
      "sanitization_applied": false,
      "file_size_original": 2048,
      "file_size_processed": 2048
    }
  }
}
```

### 4. CSV Upload and Batch Creation

**POST** `/api/v1/csv-upload/upload-and-create-batches`

Complete workflow: processes CSV and creates inventory batches in Supabase.

**Parameters:**
- `file`: CSV file (multipart/form-data)
- `store_id`: Store UUID (form field)
- `chunk_size`: Batch processing chunk size, 1-100 (form field, default: 50)

```bash
curl -X POST "http://localhost:8001/api/v1/csv-upload/upload-and-create-batches" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@inventory.csv" \
  -F "store_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunk_size=25"
```

**Response:**
```json
{
  "success": true,
  "message": "CSV processed and 23 batches created successfully",
  "csv_processing": {
    "processed_rows": 23,
    "total_csv_items": 25,
    "csv_warnings": [
      {
        "row": 8,
        "message": "Missing cost price, using default value"
      }
    ],
    "csv_errors": [
      {
        "row": 15,
        "message": "Invalid expiry date format"
      }
    ],
    "security_status": "safe",
    "sanitization_applied": false
  },
  "batch_creation": {
    "total_requests": 23,
    "successful_batches": 21,
    "failed_batches": 2,
    "success_rate": 91.3,
    "processing_metadata": {
      "chunk_size": 25,
      "total_chunks": 1,
      "processed_at": "2025-08-14T10:30:00.000Z"
    },
    "product_statistics": {
      "created_products": 18,
      "updated_products": 3,
      "unique_products": 21
    }
  },
  "data_summary": {
    "total_items": 23,
    "valid_items": 21,
    "categories": {
      "fresh_produce": 8,
      "dairy": 5,
      "bakery_fresh": 4,
      "beverages": 4
    },
    "brands": {
      "FreshFarms": 8,
      "DairyBest": 5,
      "BakeryPlus": 4,
      "unknown": 6
    },
    "total_quantity": 1250.5,
    "price_range": {
      "min": 0.99,
      "max": 15.99,
      "average": 4.23,
      "total_items_with_price": 19
    },
    "expiry_analysis": {
      "expiring_soon_7_days": 3,
      "already_expired": 0,
      "earliest_expiry": "2025-08-15",
      "latest_expiry": "2025-12-31"
    }
  },
  "failed_items": [
    {
      "index": 15,
      "barcode": "INVALID001",
      "product_name": "Invalid Product",
      "error": "Row 15: Invalid expiry date format"
    }
  ],
  "successful_batches_sample": [
    {
      "index": 0,
      "batch_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "product_id": "b2c3d4e5-f6g7-8901-bcde-f23456789012",
      "batch_number": "CSV-20250814-00001",
      "barcode": "1234567890123",
      "product_name": "Red Apples",
      "quantity": 50,
      "was_product_created": true,
      "was_product_updated": false
    }
  ],
  "store_id": "550e8400-e29b-41d4-a716-446655440000",
  "processed_at": "2025-08-14T10:30:00.000Z",
  "processed_by": "user123"
}
```

## 🔐 Security Features

### 1. File Validation

- **File Type**: Only `.csv` files allowed
- **File Size**: Maximum 10MB
- **Content Scanning**: Detects malicious content and formula injection
- **Path Traversal Protection**: Prevents directory traversal attacks

### 2. Data Sanitization

- **Automatic Cleaning**: Removes dangerous content
- **Formula Protection**: Strips Excel/CSV formula prefixes (`=`, `+`, `-`, `@`)
- **Encoding Validation**: Ensures proper UTF-8 encoding

### 3. Input Validation

- **Required Fields**: Validates all required columns are present
- **Data Types**: Ensures proper data types (numbers, dates, strings)
- **Business Rules**: Validates expiry dates, quantities, prices
- **Store Access**: Verifies user has access to the specified store

## ⚡ Performance Features

### 1. Chunked Processing

- **Configurable Chunk Size**: 1-100 items per transaction (default: 50)
- **Transaction Management**: Each chunk is processed in its own transaction
- **Failure Isolation**: Failed chunks don't affect successful ones
- **Memory Efficiency**: Processes large files without memory issues

### 2. Bulk Operations

- **Batch Creation**: Creates multiple inventory batches efficiently
- **Product Management**: Finds or creates products as needed
- **Optimized Queries**: Uses efficient database queries
- **Connection Pooling**: Reuses database connections

### 3. Error Handling

- **Partial Success**: Successfully processes valid items even if some fail
- **Detailed Errors**: Provides specific error messages for each failed item
- **Rollback Protection**: Failed transactions don't affect successful ones
- **Retry Logic**: Can be configured for transient failures

## 🔄 Data Conversion Process

### 1. CSV to Batch Request Conversion

The system automatically converts CSV rows to batch creation requests:

```python
# CSV Row
{
    "sku": "APPLE001",
    "product_name": "Red Apples",
    "category": "fresh_produce",
    "quantity": "50",
    "expiry_date": "2025-07-20",
    "cost_price": "2.50"
}

# Converted to BatchFromScanRequest
{
    "barcode": "1234567890123",  # Generated from SKU
    "product_name": "Red Apples",
    "category": "fresh_produce",
    "quantity": 50.0,
    "expiry_date": "2025-07-20",
    "cost_price": 2.50,
    "scan_confidence": 1.0,      # CSV data is 100% confident
    "batch_source": "csv_import"
}
```

### 2. Barcode Generation

For CSV imports, barcodes are generated from SKUs:

- **If SKU is barcode-like** (8+ characters, alphanumeric): Use directly
- **Otherwise**: Generate deterministic barcode using MD5 hash + check digit
- **Format**: EAN-13 compatible (13 digits)

### 3. Product Management

- **Existing Products**: Found by barcode, updated if needed
- **New Products**: Created with CSV data, linked to store
- **Duplicate Handling**: Prevents duplicate products in same store

## 📊 Monitoring and Analytics

### 1. Processing Statistics

Each CSV processing operation returns comprehensive statistics:

- **Success Rate**: Percentage of successfully created batches
- **Product Impact**: New vs updated products
- **Category Distribution**: Items per category
- **Price Analysis**: Min/max/average prices
- **Expiry Analysis**: Soon-to-expire items

### 2. Error Tracking

- **Row-Level Errors**: Specific errors for each failed row
- **Error Categories**: Validation, conversion, database errors
- **Error Context**: Include original data for debugging

### 3. Performance Metrics

- **Processing Time**: Time taken for each phase
- **Chunk Performance**: Statistics per processing chunk
- **Database Operations**: Query performance and transaction times

## 🛠️ Troubleshooting

### Common Issues

#### 1. Authentication Errors

```json
{
  "detail": "Could not validate credentials"
}
```

**Solution**: Ensure valid JWT token in Authorization header.

#### 2. Store Access Denied

```json
{
  "detail": "Store access denied or store not found"
}
```

**Solution**: Verify user has access to the specified store_id.

#### 3. CSV Format Errors

```json
{
  "detail": "CSV processing failed: Missing required column 'sku'"
}
```

**Solution**: Ensure CSV has all required columns with correct names.

#### 4. File Size Exceeded

```json
{
  "detail": "File too large. Maximum size is 10MB."
}
```

**Solution**: Split large CSV files into smaller chunks.

#### 5. Invalid Date Format

```json
{
  "errors": [
    {
      "row": 5,
      "error": "Invalid date format '15/07/2025'. Expected YYYY-MM-DD"
    }
  ]
}
```

**Solution**: Use YYYY-MM-DD format for all dates.

### Best Practices

1. **Test with Small Files**: Start with small CSV files to verify format
2. **Use Templates**: Download and modify the provided CSV template
3. **Check Validation**: Use `/validate` endpoint before batch creation
4. **Monitor Responses**: Check success rates and error details
5. **Chunk Size Optimization**: Use smaller chunks for large files
6. **Error Handling**: Implement retry logic for transient failures

## 🔗 Integration Examples

### Frontend Integration

```javascript
// Upload CSV and create batches
async function uploadCSVAndCreateBatches(file, storeId, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('store_id', storeId);
  formData.append('chunk_size', '50');

  const response = await fetch('/api/v1/csv-upload/upload-and-create-batches', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    console.log(`Created ${result.batch_creation.successful_batches} batches`);
    console.log(`Success rate: ${result.batch_creation.success_rate}%`);
    
    // Handle failed items
    if (result.failed_items.length > 0) {
      console.warn('Some items failed:', result.failed_items);
    }
  } else {
    console.error('Upload failed:', result.detail);
  }
  
  return result;
}
```

### Python Client

```python
import requests

def upload_csv_batches(file_path, store_id, token, chunk_size=50):
    url = "http://localhost:8001/api/v1/csv-upload/upload-and-create-batches"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    files = {
        "file": ("inventory.csv", open(file_path, "rb"), "text/csv")
    }
    
    data = {
        "store_id": store_id,
        "chunk_size": chunk_size
    }
    
    response = requests.post(url, headers=headers, files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result['batch_creation']['successful_batches']} batches created")
        print(f"Success rate: {result['batch_creation']['success_rate']}%")
        return result
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None
```

## 📈 Performance Guidelines

### File Size Recommendations

| File Size | Recommended Chunk Size | Expected Processing Time |
|-----------|----------------------|-------------------------|
| < 1MB | 50 | < 30 seconds |
| 1-5MB | 25-30 | 30-60 seconds |
| 5-10MB | 20-25 | 1-3 minutes |

### Concurrent Uploads

- **Limit**: Maximum 3 concurrent uploads per user
- **Queue**: Additional uploads are queued automatically
- **Timeout**: Each upload has a 10-minute timeout

### Database Performance

- **Connection Pooling**: Reuses connections efficiently
- **Transaction Optimization**: Groups operations for better performance
- **Index Usage**: Optimized queries use proper database indexes

## 🔄 API Versioning

Current implementation is part of API v1. Future versions will maintain backward compatibility.

### Version History

- **v1.0**: Initial CSV processing implementation
- **v1.1**: Added batch creation capabilities
- **v1.2**: Enhanced security and performance features

---

For additional support or feature requests, please refer to the main API documentation or contact the development team.