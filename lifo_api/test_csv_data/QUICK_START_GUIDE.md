# CSV ETL Testing - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
1. LIFO API server running on `http://localhost:8000`
2. Valid JWT token for authentication
3. A test store ID from your database

### Setup Steps

#### 1. Configure Test Script
Edit `run_csv_tests.py` and update these variables:
```python
STORE_ID = "your-actual-store-id"  # Replace with real store ID
JWT_TOKEN = "your-actual-jwt-token"  # Replace with real JWT token
```

#### 2. Quick Manual Tests

**Test 1: Basic Upload (Valid Data)**
```bash
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@valid_inventory_test.csv"
```

**Test 2: Security Validation**
```bash
curl -X POST "http://localhost:8000/api/v1/csv/validate/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@security_test.csv"
```

**Test 3: AI Analysis**
```bash
curl -X POST "http://localhost:8000/api/v1/csv/analyze/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@urgent_expiry_test.csv"
```

#### 3. Complete Scoring Pipeline

**Step 1: Upload inventory**
```bash
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@valid_inventory_test.csv" \
  | jq '.'
```

**Step 2: Trigger scoring**
```bash
curl -X POST "http://localhost:8000/api/v1/scoring/batch/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.'
```

**Step 3: Get urgency alerts**
```bash
curl -X GET "http://localhost:8000/api/v1/scoring/alerts/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.'
```

**Step 4: Get AI recommendations**
```bash
curl -X GET "http://localhost:8000/api/v1/scoring/recommendations/YOUR_STORE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.'
```

#### 4. Run Automated Tests
```bash
cd test_csv_data/
python3 run_csv_tests.py
```

## 📊 Expected Results

### Valid Data Upload
- ✅ HTTP 200 response
- ✅ All products processed
- ✅ Batch numbers generated
- ✅ Categories normalized

### Security Testing
- ✅ Formulas sanitized (`=SUM` → `'SUM`)
- ✅ XSS attempts blocked
- ⚠️ Security warnings in response

### Validation Errors
- ⚠️ HTTP 200 with warnings
- ⚠️ Clear error messages for each issue
- ⚠️ Invalid data flagged but not rejected

### Scoring Pipeline
- ✅ Expired items get critical scores (< 20)
- ✅ High-value items prioritized
- ✅ Recommendations generated based on urgency
- ✅ Margin analysis included

## 🔧 Troubleshooting

### Common Issues

**"Authentication failed"**
- Check JWT token validity
- Ensure token hasn't expired
- Verify Authorization header format

**"Store not found"**
- Verify store ID exists in database
- Check user permissions for the store
- Ensure store is active

**"File too large"**
- Files must be < 10MB
- Split large files into smaller chunks
- Check CSV has reasonable number of rows

**"Rate limit exceeded"**
- Wait 1-2 minutes between requests
- AI analysis endpoint limited to 3/hour
- CSV validation limited to 5/hour

**"Invalid CSV format"**
- Ensure required columns present: `sku`, `product_name`, `category`, `quantity`, `expiry_date`
- Use YYYY-MM-DD date format
- Check for valid categories (see test files for examples)

### Debug Commands

**Check server health**
```bash
curl -X GET "http://localhost:8000/health" | jq '.'
```

**View API documentation**
Open `http://localhost:8000/docs` in browser

**Check logs**
```bash
# If running via uvicorn
tail -f /path/to/logs/app.log

# If running in Docker
docker logs container_name
```

## 📈 Performance Expectations

| File Size | Expected Time | Max Items |
|-----------|--------------|-----------|
| < 1MB     | < 2 seconds  | ~1,000    |
| 1-5MB     | < 10 seconds | ~5,000    |
| 5-10MB    | < 30 seconds | ~10,000   |

## 🎯 Success Criteria Checklist

### Functional
- [ ] Valid CSV files upload successfully
- [ ] Security threats neutralized without breaking data
- [ ] Validation errors clearly reported
- [ ] Scoring produces logical urgency levels
- [ ] AI recommendations align with business logic

### Performance  
- [ ] Files process within expected timeframes
- [ ] Memory usage remains stable
- [ ] Concurrent requests handled gracefully
- [ ] Rate limiting prevents abuse

### Security
- [ ] Formula injection blocked
- [ ] File size limits enforced
- [ ] Authentication required
- [ ] No sensitive data logged

## 📋 Test Data Overview

| File | Purpose | Items | Key Features |
|------|---------|-------|--------------|
| `valid_inventory_test.csv` | Complete valid dataset | 20 | All categories, various expiry dates |
| `urgent_expiry_test.csv` | Scoring algorithm testing | 10 | Critical urgency scenarios |
| `security_test.csv` | Security validation | 8 | Formula injection attempts |
| `validation_errors_test.csv` | Error handling | 12 | Various validation failures |
| `performance_test.csv` | Performance benchmarking | 10 | Clean data for load testing |
| `minimal_required_fields.csv` | Basic functionality | 5 | Only required fields |

Ready to test? Start with the manual curl commands above, then run the automated test suite!