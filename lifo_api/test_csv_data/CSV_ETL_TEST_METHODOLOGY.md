# CSV ETL Testing Methodology

## Overview

This document provides a comprehensive testing approach for the LIFO API CSV ETL pipeline, including batch creation and scoring workflows.

## Quick Test Example

### Working Example with Valid JWT Token

```bash
# Example CSV upload with the provided JWT token and store ID
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IkpWTnJkTFFielAyY2xJQlEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pyZ21ldGRzb2hvd3R4aWNrcWlqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0MjBkMTQwYy0yMzg2LTRkODUtOWQwZC1hNjliYmQzODQyNzYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0OTg4Nzg1LCJpYXQiOjE3NTQ5ODUxODUsImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOm51bGwsImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoic2xpbWFuZSBsYWtlaGFsIiwiaXNfYWN0aXZlIjp0cnVlLCJsYXN0X2xvZ2luIjpudWxsLCJtaWdyYXRlZF9mcm9tX3VzZXJfbWdtdCI6dHJ1ZSwibWlncmF0aW9uX3RpbWVzdGFtcCI6IjIwMjUtMDctMTNUMDA6NDc6MTQuNzQzMjA4KzAwOjAwIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaW5fYXR0ZW1wdHMiOjAsInBpbl9kZWxpdmVyeV9tZXRob2QiOiJtYW51YWwiLCJwaW5fZXhwaXJlc19hdCI6bnVsbCwicGluX2hhc2giOm51bGwsInBpbl9sb2NrZWRfdW50aWwiOm51bGwsInBpbl9zZXRfYXQiOm51bGwsInJlcXVpcmVzX3BpbiI6ZmFsc2UsInN0b3JlX25hbWUiOiJzbGltIiwic3ViIjoiNDIwZDE0MGMtMjM4Ni00ZDg1LTlkMGQtYTY5YmJkMzg0Mjc2IiwidXNlcm5hbWUiOiJzbGltYW5lLmxhayJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0NjQ2MjMwfV0sInNlc3Npb25faWQiOiJjNjU0NDcyNC01YjFiLTQ5MGYtOTY3YS1hYmZlYThlYzYxMzUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.9ES3MioGG0YZf5uXn8REu10oah-NFmL5eDAKeCRV2To" \
  -F "file=@valid_inventory_test.csv" \
  -F "store_id=e3b41480-79a3-4cb7-8151-3fe014a1b60f"
```

**Note**: Replace `YOUR_JWT_TOKEN` and `YOUR_STORE_ID` in the examples below with your actual values.

## Test Data Files Created

### 1. `valid_inventory_test.csv` (20 products)

**Purpose**: Complete valid dataset covering all product categories
**Features**:

- All required and optional fields populated
- Multiple product categories (fresh_produce, dairy, bakery_fresh, etc.)
- Variety of expiry dates (some urgent, some long-term)
- Different price ranges and margins
- Various locations and suppliers

### 2. `urgent_expiry_test.csv` (10 products)

**Purpose**: Test scoring algorithm with critical urgency scenarios
**Features**:

- Products expiring today, tomorrow, and recently expired
- High-value items requiring immediate action
- Zero/negative margin scenarios
- Large quantities at risk

### 3. `security_test.csv` (8 products)

**Purpose**: Test security validations and formula injection protection  
**Features**:

- Excel formula injection attempts (`=SUM()`, `=DDE()`)
- XSS attempts (`<script>`, `javascript:`)
- Command injection attempts (`@INDIRECT`, `+HYPERLINK`)
- Various dangerous patterns

### 4. `validation_errors_test.csv` (12 products)

**Purpose**: Test data validation and error handling
**Features**:

- Empty SKUs and product names
- Invalid categories and date formats
- Negative quantities and prices
- Cost price > selling price scenarios
- Duplicate SKUs
- Edge cases and boundary conditions

### 5. `performance_test.csv` (10 products)

**Purpose**: Basic performance testing dataset
**Features**:

- Clean, valid data for performance benchmarking
- Variety of products for scoring algorithm testing
- Can be duplicated/expanded for load testing

### 6. `minimal_required_fields.csv` (5 products)

**Purpose**: Test with only required fields (no optional data)
**Features**:

- Only SKU, product_name, category, quantity, expiry_date
- Tests default value handling
- Validates required vs optional field processing

## Testing Workflow

### Phase 1: Basic CSV Upload Testing

#### Test 1.1: Valid Data Upload

```bash
# Upload valid inventory data
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/valid_inventory_test.csv" \
  -F "store_id=YOUR_STORE_ID"
```

**Expected Results**:

- ✅ HTTP 200 response
- ✅ All 20 products processed successfully
- ✅ Categories normalized correctly
- ✅ Batch numbers generated
- ✅ Manufacture dates estimated where missing
- ✅ No validation errors

#### Test 1.2: Minimal Fields Upload

```bash
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/minimal_required_fields.csv" \
  -F "store_id=YOUR_STORE_ID"
```

**Expected Results**:

- ✅ HTTP 200 response
- ✅ Default values applied (brand="Unknown", location_code="MAIN")
- ✅ All required processing completed

### Phase 2: Security Testing

#### Test 2.1: Formula Injection Protection

```bash
curl -X POST "http://localhost:8000/api/v1/csv/validate/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/security_test.csv"
```

**Expected Results**:

- ✅ HTTP 200 response (not rejected)
- ✅ Dangerous formulas sanitized (=SUM becomes 'SUM, =DDE becomes 'DDE)
- ✅ XSS attempts neutralized
- ✅ Security warnings in response
- ✅ Data still processable after sanitization

#### Test 2.2: Rate Limiting

```bash
# Send multiple requests quickly to test rate limiting
for i in {1..10}; do
  curl -X POST "http://localhost:8000/api/v1/csv/analyze/YOUR_STORE_ID" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -F "file=@test_csv_data/valid_inventory_test.csv" &
done
```

**Expected Results**:

- ✅ First few requests succeed (HTTP 200)
- ✅ Later requests hit rate limit (HTTP 429)
- ✅ Rate limit reset after time window

### Phase 3: Validation Testing

#### Test 3.1: Validation Errors

```bash
curl -X POST "http://localhost:8000/api/v1/csv/validate/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/validation_errors_test.csv"
```

**Expected Results**:

- ✅ HTTP 200 response with warnings
- ✅ Specific error messages for each validation failure:
  - Empty SKU errors
  - Invalid category warnings
  - Negative quantity errors
  - Invalid date format errors
  - Duplicate SKU warnings
  - Price validation warnings

#### Test 3.2: File Size and Limits

```bash
# Test oversized file (create file > 10MB)
dd if=/dev/zero of=large_test.csv bs=1M count=15

curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@large_test.csv" \
  -F "store_id=YOUR_STORE_ID"
```

**Expected Results**:

- ❌ HTTP 413 or 400 response
- ❌ File size exceeded error message

### Phase 4: AI Analysis and Scoring

#### Test 4.1: Urgent Items Analysis

```bash
curl -X POST "http://localhost:8000/api/v1/csv/analyze/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/urgent_expiry_test.csv"
```

**Expected Results**:

- ✅ HTTP 200 response
- ✅ AI insights generated
- ✅ Urgency alerts for expired/expiring items
- ✅ Pricing insights for margin analysis
- ✅ Recommendations for immediate action

#### Test 4.2: Complete Scoring Pipeline

```bash
# Step 1: Upload inventory data (creates batches)
UPLOAD_RESPONSE=$(curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/valid_inventory_test.csv" \
  -F "store_id=YOUR_STORE_ID")

# Step 2: Trigger scoring for the store
curl -X POST "http://localhost:8000/api/v1/scoring/batch/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 3: Get scoring alerts
curl -X GET "http://localhost:8000/api/v1/scoring/alerts/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 4: Get recommendations
curl -X GET "http://localhost:8000/api/v1/scoring/recommendations/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results**:

- ✅ Batch creation successful
- ✅ Scoring pipeline processes all items
- ✅ Urgency alerts for items expiring soon
- ✅ AI recommendations based on scores
- ✅ Proper scoring factors applied (expiry: 50%, velocity: 30%, margin: 20%)

### Phase 5: Performance Testing

#### Test 5.1: Response Time Benchmarks

```bash
# Measure processing time for different file sizes
time curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_csv_data/performance_test.csv" \
  -F "store_id=YOUR_STORE_ID"
```

**Performance Targets**:

- ✅ < 2 seconds for files under 1MB
- ✅ < 10 seconds for files under 5MB
- ✅ < 30 seconds for files up to 10MB
- ✅ Memory usage remains stable

#### Test 5.2: Concurrent Upload Handling

```bash
# Test multiple concurrent uploads
for i in {1..5}; do
  curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -F "file=@test_csv_data/valid_inventory_test.csv" \
    -F "store_id=YOUR_STORE_ID" \
    -o "response_$i.json" &
done
wait
```

**Expected Results**:

- ✅ All requests complete successfully
- ✅ No data corruption or race conditions
- ✅ Rate limiting applies correctly

## Error Scenarios Test Matrix

| Test Case          | File                          | Expected Outcome                     |
| ------------------ | ----------------------------- | ------------------------------------ |
| Valid Upload       | `valid_inventory_test.csv`    | ✅ Success, all products processed   |
| Security Injection | `security_test.csv`           | ✅ Sanitized, warnings generated     |
| Validation Errors  | `validation_errors_test.csv`  | ⚠️ Warnings, specific error messages |
| Minimal Fields     | `minimal_required_fields.csv` | ✅ Success with defaults             |
| Urgent Items       | `urgent_expiry_test.csv`      | ✅ Success with urgency alerts       |
| File Too Large     | `>10MB file`                  | ❌ File size error                   |
| Invalid MIME Type  | `.txt file`                   | ❌ File type error                   |
| Empty File         | `0 byte file`                 | ❌ Empty file error                  |
| Malformed CSV      | `corrupted.csv`               | ❌ Parse error                       |

## Scoring Algorithm Validation

### Expected Scoring Factors:

1. **Expiry Score (50% weight)**:

   - Items expiring today: Score 0-20 (critical)
   - Items expiring in 1-3 days: Score 20-40 (high urgency)
   - Items expiring in 4-7 days: Score 40-60 (medium urgency)
   - Items expiring >7 days: Score 60-100 (low urgency)

2. **Velocity Score (30% weight)**:

   - Based on quantity vs sales velocity
   - High quantity + slow sales = low score
   - Low quantity + fast sales = high score

3. **Margin Score (20% weight)**:
   - High margin items = higher priority to save
   - Low/negative margin = lower priority

### Validation Tests:

#### Test expired items get critical scores (0-20)

```bash
# Check that URGENT-001 (expired yogurt) gets critical score
grep -i "urgent-001" scoring_response.json | jq '.composite_score'
# Expected: < 20
```

#### Test high-value items get appropriate urgency

```bash
# Check that URGENT-006 (expensive steaks) gets high urgency despite later expiry
grep -i "urgent-006" scoring_response.json | jq '.urgency_level'
# Expected: "high" or "critical"
```

#### Test margin analysis

```bash
# Check that URGENT-009 (zero margin) gets appropriate recommendation
grep -i "urgent-009" scoring_response.json | jq '.recommendation'
# Expected: "dispose" or "clearance"
```

## Success Criteria

### Functional Requirements:

- ✅ All valid CSV files process successfully
- ✅ Security threats are neutralized without breaking functionality
- ✅ Validation errors are clearly reported
- ✅ Scoring algorithm produces logical results
- ✅ Rate limiting prevents abuse

### Performance Requirements:

- ✅ Files up to 10MB process within 30 seconds
- ✅ Memory usage remains stable during processing
- ✅ Concurrent requests handled gracefully

### Security Requirements:

- ✅ Formula injection attempts are sanitized
- ✅ File size limits are enforced
- ✅ Authentication is required for all endpoints
- ✅ Rate limiting prevents DoS attacks

## Troubleshooting Common Issues

### Issue: "File too large" errors

**Solution**: Check file size limits in configuration, split large files

### Issue: "Rate limit exceeded"

**Solution**: Wait for rate limit reset or increase limits for testing

### Issue: Authentication failures

**Solution**: Ensure valid JWT token, check token expiration

### Issue: Category validation errors

**Solution**: Use valid categories from the approved list

### Issue: Date parsing errors

**Solution**: Ensure dates are in YYYY-MM-DD format

This comprehensive test methodology covers all aspects of the CSV ETL pipeline and provides a solid foundation for validating the system's functionality, security, and performance.
