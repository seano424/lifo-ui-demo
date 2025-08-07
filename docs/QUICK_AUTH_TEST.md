# Quick Authentication Testing Guide

## 🎯 Goal

Test LIFO AI API endpoints with proper JWT authentication to fix the 500 errors.

## ⚡ Quick Method (Recommended)

### Step 1: Setup Virtual Environment

```bash
cd /home/slim/lifo-app/lifo_api
source .venv/bin/activate
pip install PyJWT[cryptography] requests
```

### Step 2: Load Environment Variables

```bash
# Check if you have the unified .env.local file at root level
ls -la ../.env.local

# Load environment variables from unified root-level file:
export $(grep -v '^#' ../.env.local | xargs)

# Verify environment variables are loaded
echo "SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET:0:20}..."
echo "SUPABASE_URL: $SUPABASE_URL"
```

### Step 3: Run Simple Test

```bash
cd ..
python simple_auth_test.py
```

## 🔧 Manual Testing (If Above Fails)

### Step 1: Start API Server

```bash
cd lifo_api
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Step 2: Test Without Auth (Should Work)

```bash
# In another terminal
curl http://localhost:8001/health
curl http://localhost:8001/api/info
```

### Step 3: Get Your JWT Secret

Check the unified `.env.local` file at root level for `SUPABASE_JWT_SECRET`:

```bash
grep SUPABASE_JWT_SECRET ../.env.local
```

### Step 4: Create Test Token Manually

```python
import jwt
from datetime import datetime, timedelta

# Replace with your actual JWT secret
jwt_secret = "your-actual-jwt-secret-here"

payload = {
    'aud': 'authenticated',
    'exp': int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
    'iat': int(datetime.utcnow().timestamp()),
    'sub': 'test-user-123',
    'email': 'test@example.com',
    'role': 'authenticated'
}

token = jwt.encode(payload, jwt_secret, algorithm='HS256')
print(f"Token: {token}")
```

### Step 5: Test With Authentication

```bash
# Use the token from Step 4
TOKEN="your-generated-token-here"

# Test authenticated endpoints
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:8001/api/v1/stores

curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:8001/api/v1/analytics/test-store-123
```

## 🚨 Troubleshooting

### Problem: "SUPABASE_JWT_SECRET not found"

**Solution**: Your environment variables aren't loaded properly.

```bash
# Check if unified .env.local exists at root level
ls -la ../.env.local

# Load manually from unified root-level file
source ../.env.local
export $(grep -v '^#' ../.env.local | xargs)
```

### Problem: "externally-managed-environment"

**Solution**: Use virtual environment.

```bash
cd lifo_api
source .venv/bin/activate
pip install PyJWT[cryptography] requests
```

### Problem: 401 Unauthorized

**Solution**: Token is invalid or JWT secret is wrong.

- Check that `SUPABASE_JWT_SECRET` matches your Supabase dashboard
- Verify token creation code
- Check token format

### Problem: 500 Internal Server Error

**Solution**: Server-side error (this is what we're trying to fix).

- Check API server logs
- Verify database connection
- Check if endpoints require additional setup

### Problem: Connection refused

**Solution**: API server not running.

```bash
cd lifo_api
source .venv/bin/activate
uvicorn app.main:app --reload
```

## 📋 Expected Results

✅ **Success indicators:**

- `/health` returns 200 without auth
- `/api/v1/stores` returns 200 or 403 with auth (not 500)
- Token generation works without errors

❌ **Failure indicators:**

- 500 errors = server-side problems (need to check logs)
- 401 errors = authentication problems
- Connection refused = server not running

## 🎯 Next Steps After Success

Once authentication works:

1. Test adding products via API
2. Test analytics endpoints
3. Test CSV upload functionality
4. Check what specific 500 errors you were getting

## 📞 Quick Debug Commands

```bash
# Check environment
env | grep SUPABASE

# Check server health
curl -s http://localhost:8001/health | jq

# Check API info
curl -s http://localhost:8001/api/info | jq

# Test with verbose output
curl -v -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/stores
```
