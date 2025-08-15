# CSV Processing Guide - LIFO.AI

## Overview

LIFO.AI features a comprehensive CSV processing system that allows for bulk inventory import with intelligent column mapping, security validation, and automated batch creation.

## Quick Start

1. **Download Template**: `GET /api/v1/csv-upload/template`
2. **Upload CSV**: `POST /api/v1/csv-upload/upload-and-create-batches`
3. **Monitor Results**: Check success/failure rates and created batches

## CSV Processing Features

### Intelligent Column Mapping

The system accepts flexible column names and automatically maps them to standard fields:

| Standard Field | Accepted Variations |
|---------------|-------------------|
| `sku` | SKU, sku |
| `product_name` | "Product Name", "productName", "name" |
| `category` | "Category", "CATEGORY" |
| `quantity` | "Quantity", "qty", "QTY" |
| `expiry_date` | "Expiry Date", "expiryDate", "expiry" |
| `cost_price` | "Cost Price", "costPrice", "costprice" |
| `selling_price` | "Selling Price", "price", "sellingPrice" |

**See [CSV Column Mapping Demo](../lifo_api/test_csv_data/CSV_COLUMN_MAPPING_DEMO.md) for complete examples.**

### Security Features

- **File Type Validation**: Only CSV files accepted
- **Size Limits**: Maximum 10MB file size
- **Content Scanning**: Detects malicious content (formulas, scripts)
- **Cell Validation**: Prevents oversized cells and suspicious patterns

### Data Processing

- **Required Fields**: SKU, Product Name, Category, Quantity, Expiry Date
- **Optional Fields**: Brand, prices, manufacturing date, location
- **Smart Defaults**: Unknown brand, default unit types, standard location codes
- **Date Processing**: Flexible date format parsing
- **Category Mapping**: Intelligent category normalization

## API Endpoints

### 1. Get CSV Template
```http
GET /api/v1/csv-upload/template
Authorization: Bearer {jwt_token}
```

Returns a CSV template with sample data and field descriptions.

### 2. Validate CSV (Dry Run)
```http
POST /api/v1/csv-upload/validate
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: {csv_file}
store_id: {store_uuid}
```

Validates CSV structure and data without creating batches.

### 3. Upload and Create Batches
```http
POST /api/v1/csv-upload/upload-and-create-batches
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: {csv_file}
store_id: {store_uuid}
chunk_size: 50
```

Processes CSV and creates inventory batches in the database.

## Response Format

### Successful Response
```json
{
  "success": true,
  "message": "CSV processed and 5 batches created successfully",
  "csv_processing": {
    "processed_rows": 5,
    "total_csv_items": 5,
    "csv_warnings": [],
    "csv_errors": [],
    "security_status": "secure"
  },
  "batch_creation": {
    "total_requests": 5,
    "successful_batches": 5,
    "failed_batches": 0,
    "success_rate": 100.0,
    "product_statistics": {
      "created_products": 3,
      "updated_products": 0,
      "unique_products": 3
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "CSV processing failed",
  "csv_processing": {
    "csv_errors": ["Row 1: Missing required field 'sku'"]
  },
  "failed_items": [
    {
      "index": 0,
      "barcode": "INVALID-001",
      "error": "Missing required field 'sku'"
    }
  ]
}
```

## Database Schema Integration

The CSV processor creates records in three main tables:

1. **`inventory.products`** - Global product catalog
   - Normalized product information
   - Barcode and verification data
   - Required pricing fields (base_cost_price, base_selling_price)

2. **`inventory.store_products`** - Store-specific product settings
   - Junction table linking stores to products
   - Store-specific pricing and settings

3. **`inventory.batches`** - Individual inventory batches
   - Expiry dates and quantities
   - Manufacturing information
   - Audit trail and source tracking

## Testing

Use the provided test files in `/lifo_api/test_csv_data/`:

- **Demo Files**: `demo_*.csv` - Various column naming conventions
- **Test Files**: `minimal_*.csv`, `valid_*.csv` - Functional testing
- **Edge Cases**: `validation_errors_test.csv` - Error handling

### Running Tests
```bash
cd lifo_api/test_csv_data
python run_csv_tests.py
```

## Common Issues & Solutions

### Schema Mismatches
- **Issue**: "base_cost_price" constraint violations
- **Solution**: Ensure pricing fields are > 0 (fixed in batch creation service)

### Foreign Key Errors
- **Issue**: Missing table references
- **Solution**: Ensure all SQLAlchemy models are properly defined

### Column Mapping Failures
- **Issue**: Unrecognized column names
- **Solution**: Use supported aliases or update mapping configuration

## Performance Considerations

- **Chunk Processing**: Large files processed in chunks (default: 50 items)
- **Transaction Management**: Each chunk processed in separate transaction
- **Memory Efficiency**: Streaming processing for large files
- **Timeout Handling**: 30-second timeout per chunk

## Security Best Practices

1. **Always validate file types** before processing
2. **Use JWT authentication** for all endpoints
3. **Sanitize CSV content** to prevent injection attacks
4. **Limit file sizes** to prevent DoS attacks
5. **Log all processing activities** for audit trails

## Related Documentation

- [CSV Column Mapping Demo](../lifo_api/test_csv_data/CSV_COLUMN_MAPPING_DEMO.md)
- [CSV Test Methodology](../lifo_api/test_csv_data/CSV_ETL_TEST_METHODOLOGY.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Security Guide](LIFO_API_SECURITY_GUIDE.md)