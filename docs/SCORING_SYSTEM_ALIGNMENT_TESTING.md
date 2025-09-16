# 🧪 Scoring System Alignment - Testing Guide

## Overview
This guide covers end-to-end testing of the scoring system alignment from legacy recommendations to FastAPI standards.

## ✅ Pre-Testing Checklist

### 1. **Environment Setup**
```bash
# Ensure FastAPI is running
cd lifo_api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Verify FastAPI health
curl http://localhost:8000/health
```

### 2. **Database State**
```bash
# Check current recommendation distribution
cd lifo_api
python scripts/migrate_recommendations.py --dry-run
```

## 🔬 Testing Phases

### **Phase 1: Migration Script Testing**

#### 1.1 **Dry Run Migration**
```bash
cd lifo_api
python scripts/migrate_recommendations.py --dry-run
```
**Expected Output:**
- Analysis of current recommendation distribution
- Preview of changes to be made
- No actual database changes

#### 1.2 **Actual Migration**
```bash
# Run the actual migration
python scripts/migrate_recommendations.py

# Verify migration success
python scripts/migrate_recommendations.py --skip-analysis --dry-run
```
**Expected Output:**
- All legacy recommendations converted to FastAPI standard
- Verification shows no legacy formats remaining

### **Phase 2: FastAPI Scoring Service Testing**

#### 2.1 **Single Batch Scoring**
```bash
# Test single batch scoring with proper authentication
curl -X POST "http://localhost:8000/api/v1/scoring/batch/{STORE_ID}" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "store_id": "store-uuid",
  "total_items": 1,
  "processed": 1,
  "high_priority_count": 0,
  "processing_time_ms": 150,
  "errors": [],
  "message": "Scored 1 batches successfully"
}
```

#### 2.2 **Bulk Store Scoring**
```bash
# Test bulk scoring
curl -X POST "http://localhost:8000/api/v1/scoring/batch/{STORE_ID}/bulk" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
- All batches processed
- `reason` field populated with meaningful text
- `discount_percent` properly calculated
- Standardized recommendations only

### **Phase 3: Database Validation**

#### 3.1 **Verify Score Data**
```sql
-- Check that reason field is now populated
SELECT 
    recommendation,
    COUNT(*) as count,
    COUNT(CASE WHEN reason IS NOT NULL THEN 1 END) as with_reason,
    COUNT(CASE WHEN discount_percent > 0 THEN 1 END) as with_discount
FROM scoring.product_scores 
GROUP BY recommendation 
ORDER BY count DESC;
```

**Expected Results:**
- All records have `reason` field populated
- Records with discount recommendations have `discount_percent > 0`
- Only FastAPI standard recommendations present

#### 3.2 **Verify Recommendation Standards**
```sql
-- Should return 0 rows (no legacy recommendations)
SELECT recommendation, COUNT(*) 
FROM scoring.product_scores 
WHERE recommendation IN (
    'immediate_action', 'high_priority', 'medium_priority', 
    'discount_heavily', 'normal'
) 
GROUP BY recommendation;
```

### **Phase 4: Frontend Integration Testing**

#### 4.1 **Alerts API Testing**
```bash
# Test alerts endpoint
curl "http://localhost:3000/api/alerts?storeId={STORE_ID}&threshold=0.3" \
  -H "Cookie: auth-token={SESSION_COOKIE}"
```

**Expected Response:**
```json
{
  "alerts": [
    {
      "recommendation": "discount_aggressive", // Migrated format
      "urgency_level": "high",
      "suggested_actions": ["Apply 25-50% discount", "..."]
    }
  ],
  "source": "fastapi"
}
```

#### 4.2 **Frontend Component Testing**
1. **Open inventory dashboard**
2. **Verify recommendation displays:**
   - Legacy recommendations show migrated equivalents
   - Display text uses friendly format ("Apply Heavy Discount" vs "discount_aggressive")
   - Color coding works correctly
3. **Test recommendation actions:**
   - Discount suggestions appear for appropriate recommendations
   - Action tracking works with both formats

### **Phase 5: Action Tracking Testing**

#### 5.1 **Test Recommendation Mapping**
```python
from app.services.action_tracking import ActionTrackingService
from app.utils.recommendation_migration import RecommendationMigrator

# Test various recommendation mappings
test_cases = [
    "immediate_action",    # Should map to discount_aggressive → DISCOUNT
    "high_priority",       # Should map to discount_aggressive → DISCOUNT  
    "monitor",            # Should map to monitor → MAINTAIN
    "maintain"            # Should map to maintain → MAINTAIN
]

for recommendation in test_cases:
    migrated = RecommendationMigrator.migrate_recommendation(recommendation)
    enum_value = ActionTrackingService.map_scoring_action_to_enum(recommendation)
    print(f"{recommendation} → {migrated} → {enum_value}")
```

#### 5.2 **End-to-End Action Tracking**
1. Create a recommendation record
2. Update with actual user action  
3. Verify analytics show correct mapping

### **Phase 6: Performance Testing**

#### 6.1 **Bulk Scoring Performance**
```bash
# Test bulk scoring with timing
time curl -X POST "http://localhost:8000/api/v1/scoring/batch/{STORE_ID}/bulk" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

**Expected Performance:**
- < 1s for stores with < 100 batches
- < 2s for stores with < 500 batches
- Proper error handling for timeouts

#### 6.2 **Migration Performance**
```bash
# Time the migration script
time python scripts/migrate_recommendations.py
```

## 🐛 Common Issues & Troubleshooting

### **Issue 1: Migration Script Fails**
```bash
# Check database connection
python -c "from app.core.config import DATABASE_URL; print(DATABASE_URL)"

# Verify permissions
psql $DATABASE_URL -c "SELECT current_user, current_database();"
```

### **Issue 2: FastAPI Returns Legacy Recommendations**
- Check that scoring service uses updated recommendation generation
- Verify `generate_recommendation()` returns proper format
- Check bulk scoring logic uses correct field mapping

### **Issue 3: Frontend Shows Wrong Display Text**
- Verify migration utilities are imported correctly
- Check that `migrateRecommendation()` is called on raw data
- Ensure display components use migrated values

### **Issue 4: Action Tracking Fails**
- Test mapping functions individually
- Verify import paths for migration utilities
- Check that database enum values are correct

## 📊 Success Criteria

✅ **Migration Complete:**
- [ ] 0 legacy recommendations in database
- [ ] All records have populated `reason` field
- [ ] Discount recommendations have proper `discount_percent`

✅ **API Consistency:**
- [ ] FastAPI returns only standard recommendations
- [ ] Alerts API handles both legacy and new formats
- [ ] Performance targets met (< 1s bulk scoring)

✅ **Frontend Integration:**
- [ ] All recommendation displays use friendly text
- [ ] Color coding and priority sorting work
- [ ] Action suggestions are relevant and helpful

✅ **Action Tracking:**
- [ ] Legacy recommendations map to correct enums
- [ ] Analytics show proper recommendation effectiveness
- [ ] No broken recommendation-to-action mappings

## 🚀 Post-Testing Steps

1. **Monitor production for 24-48 hours**
2. **Check error logs for any unmapped recommendations**  
3. **Verify user feedback on new recommendation display**
4. **Clean up any temporary migration files**

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Migration Results:
- Records processed: ___
- Records updated: ___
- Errors: ___
- Verification: ✅/❌

### API Performance:
- Single batch scoring: ___ms
- Bulk scoring (100 items): ___ms
- Error rate: ___%

### Frontend Integration:
- Recommendation display: ✅/❌
- Action suggestions: ✅/❌
- Color coding: ✅/❌

### Action Tracking:
- Mapping accuracy: ✅/❌
- Analytics integrity: ✅/❌

### Overall Status: ✅ PASS / ❌ FAIL
```

---

## 🎯 Quick Test Commands

```bash
# Complete test sequence
cd lifo_api

# 1. Analyze current state
python scripts/migrate_recommendations.py --dry-run

# 2. Run migration
python scripts/migrate_recommendations.py

# 3. Test FastAPI scoring
curl -X POST "http://localhost:8000/api/v1/scoring/batch/{STORE_ID}/bulk" \
  -H "Authorization: Bearer {TOKEN}"

# 4. Test frontend alerts
curl "http://localhost:3000/api/alerts?storeId={STORE_ID}"

# 5. Verify database state
psql $DATABASE_URL -c "
  SELECT recommendation, COUNT(*) 
  FROM scoring.product_scores 
  GROUP BY recommendation 
  ORDER BY recommendation;
"
```